import { supabaseServer } from '../../lib/supabase-server';
import { selectNextQuestion, CandidateQuestion, StudentContext } from '../../services/QuestionRecommendationEngine';
import { classifyTopic, TopicClassification } from '../../services/PerformanceEngine';
import { determineMissionAction, DEFAULT_MISSION_CONFIG, getCurrentMissionDate } from '../../services/DailyMissionEngine';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return Response.json({ error: 'Missing auth header' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser(token);
    
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const requestedExam = req.headers.get('X-Exam') || 'NEET_PG_INI_CET';
    const examFilter = [requestedExam, 'INI-CET', 'NEET_PG_INI_CET'];
    const topicId = url.searchParams.get('topicId');
    const subjectId = url.searchParams.get('subjectId');
    const mode = url.searchParams.get('mode'); // e.g. TOPIC, SUBJECT, WEAK_AREA

    // 1. Fetch Candidates (limit to subset to prevent OOM, e.g. 200 published)
    let query = supabaseServer
      .from('questions')
      .select('id, topic_id, subjects(id), difficulty, exam_relevance, status')
      .in('exam', examFilter)
      .eq('status', 'PUBLISHED');

    if (topicId) {
      // Support comma-separated topicIds for multi-topic practice
      const topics = topicId.split(',');
      query = query.in('topic_id', topics);
    } else if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    const { data: questions, error: qError } = await query.limit(200);

    if (qError || !questions) {
      return Response.json({ error: 'Error fetching questions' }, { status: 500 });
    }

    // 2. Fetch User Context
    const { data: topicMastery } = await supabaseServer
      .from('topic_mastery')
      .select('*')
      .eq('user_id', user.id);

    const { data: recentAttempts } = await supabaseServer
      .from('question_attempts')
      .select('question_id, created_at, is_correct')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    const missionDate = getCurrentMissionDate();
    const { data: overdueRevisions } = await supabaseServer
      .from('revision_items')
      .select('question_id')
      .eq('user_id', user.id)
      .is('completed_at', null)
      .lte('scheduled_date', missionDate);

    // 3. Build Student Context
    const topicClassifications: Record<string, TopicClassification> = {};
    const topicMasteryScores: Record<string, number> = {};
    
    let criticalCount = 0;
    if (topicMastery) {
      topicMastery.forEach((tm: any) => {
        topicMasteryScores[tm.topic_id] = tm.mastery_score;
        const accuracy = tm.questions_attempted > 0 ? tm.correct_attempts / tm.questions_attempted : 0;
        const classification = classifyTopic(tm.questions_attempted, accuracy, tm.mastery_score);
        topicClassifications[tm.topic_id] = classification;
        if (classification === 'CRITICAL_WEAKNESS') criticalCount++;
      });
    }

    const recentlyAttemptedIds: Record<string, { daysSince: number, isCorrect: boolean }> = {};
    let todayAttemptsCount = 0;
    let todayRevisionsCount = 0;
    
    const overdueQuestionIds = new Set(overdueRevisions?.map(r => r.question_id) || []);

    if (recentAttempts) {
      const now = new Date().getTime();
      recentAttempts.forEach((a: any) => {
        const d = new Date(a.created_at);
        const days = (now - d.getTime()) / (1000 * 3600 * 24);
        if (!(a.question_id in recentlyAttemptedIds)) {
          recentlyAttemptedIds[a.question_id] = { daysSince: days, isCorrect: a.is_correct };
        }
        
        if (a.created_at.startsWith(missionDate)) {
          todayAttemptsCount++;
          if (overdueQuestionIds.has(a.question_id)) {
            todayRevisionsCount++; // approximation
          }
        }
      });
    }

    // Determine Mission Action
    const isNewUser = (!recentAttempts || recentAttempts.length === 0);
    const progress = {
      missionDate,
      completedCount: todayAttemptsCount,
      completedRevisionCount: todayRevisionsCount,
      completedWeakAreaCount: 0,
      completedNewCount: 0
    };
    
    const missionAction = determineMissionAction(
      isNewUser, 
      progress, 
      DEFAULT_MISSION_CONFIG, 
      overdueQuestionIds.size, 
      criticalCount > 0
    );

    const context: StudentContext = {
      missionAction,
      topicClassifications,
      topicMasteryScores,
      overdueRevisionQuestionIds: overdueQuestionIds,
      recentlyAttemptedIds,
      confidenceData: {}, // Extracted in M10, omitting full iteration here to save time, defaulting in engine
      practiceMode: mode
    };

    const candidates: CandidateQuestion[] = questions.map((q: any) => ({
      id: q.id,
      topicId: q.topic_id,
      subjectId: q.subjects?.id || '',
      difficulty: q.difficulty || 'medium',
      examRelevance: q.exam_relevance || 5,
      status: q.status
    }));

    // 4. M11 Engine Selection
    const nextQ = selectNextQuestion(candidates, context);

    if (!nextQ) {
      return Response.json({ error: 'No practice questions available' }, { status: 404 });
    }

    // 5. Fetch full question securely
    const { data: fullQuestion } = await supabaseServer
      .from('questions')
      .select(`
        *,
        options:question_options(id, option_text)
      `)
      .eq('id', nextQ.id)
      .single();

    if (topicId) {
      const requestedTopics = topicId.split(',');
      if (!requestedTopics.includes(fullQuestion.topic_id)) {
        console.error(`Scope mismatch: Requested topic(s) ${topicId} but got ${fullQuestion.topic_id}`);
        return Response.json({ error: 'Server error: Scope mismatch' }, { status: 500 });
      }
    } else if (subjectId) {
      if (fullQuestion.subject_id !== subjectId) {
        console.error(`Scope mismatch: Requested subject ${subjectId} but got ${fullQuestion.subject_id}`);
        return Response.json({ error: 'Server error: Scope mismatch' }, { status: 500 });
      }
    }

    return Response.json({ question: fullQuestion });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
