import { supabaseServer } from '../../lib/supabase-server';
import { classifyTopic, classifyTrend, classifyConfidence, ConfidenceData } from '../../services/PerformanceEngine';
import { calculateReadinessScore, ReadinessFactors } from '../../services/ReadinessEngine';
import { getCurrentMissionDate } from '../../services/DailyMissionEngine';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return Response.json({ error: 'Missing auth header' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser(token);
    
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch Aggregated Mastery
    const { data: topicMastery } = await supabaseServer
      .from('topic_mastery')
      .select('topic_id, mastery_score, questions_attempted, correct_attempts, topics(name, subject_id, subjects(name))')
      .eq('user_id', user.id);

    const { data: subjectMastery } = await supabaseServer
      .from('subject_mastery')
      .select('subject_id, mastery_score, questions_attempted, correct_attempts, subjects(name)')
      .eq('user_id', user.id);

    // 2. Fetch Overdue Revisions
    const missionDate = getCurrentMissionDate();
    const { count: overdueRevisionCount } = await supabaseServer
      .from('revision_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('completed_at', null)
      .lte('scheduled_date', missionDate);

    // 3. Fetch recent attempts for trends and confidence (30 days max to avoid large payloads)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentAttempts } = await supabaseServer
      .from('question_attempts')
      .select('is_correct, confidence, created_at')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Basic aggregation
    let totalQuestionsAttempted = 0;
    let totalCorrect = 0;
    let globalMasteryAverage = 0;
    let criticalWeaknessesCount = 0;

    const subjectPerformances = (subjectMastery || []).map((sm: any) => {
      totalQuestionsAttempted += sm.questions_attempted;
      totalCorrect += sm.correct_attempts;
      globalMasteryAverage += sm.mastery_score;
      
      const accuracy = sm.questions_attempted > 0 ? sm.correct_attempts / sm.questions_attempted : 0;
      
      return {
        subjectId: sm.subject_id,
        name: sm.subjects?.name || 'Unknown',
        attempts: sm.questions_attempted,
        correct: sm.correct_attempts,
        accuracy,
        masteryScore: sm.mastery_score
      };
    });

    if (subjectPerformances.length > 0) {
      globalMasteryAverage = globalMasteryAverage / subjectPerformances.length;
    }

    const topicPerformances = (topicMastery || []).map((tm: any) => {
      const accuracy = tm.questions_attempted > 0 ? tm.correct_attempts / tm.questions_attempted : 0;
      const classification = classifyTopic(tm.questions_attempted, accuracy, tm.mastery_score);
      
      if (classification === 'CRITICAL_WEAKNESS') {
        criticalWeaknessesCount++;
      }
      
      return {
        topicId: tm.topic_id,
        name: tm.topics?.name || 'Unknown',
        subjectName: tm.topics?.subjects?.name || 'Unknown',
        attempts: tm.questions_attempted,
        accuracy,
        masteryScore: tm.mastery_score,
        classification
      };
    });

    // Time-based calculations from recentAttempts
    const now = new Date();
    let todayAttempts = 0;
    let todayCorrect = 0;
    let sevenDayAttempts = 0;
    let sevenDayCorrect = 0;
    let thirtyDayAttempts = 0;
    let thirtyDayCorrect = 0;

    const confData: ConfidenceData = {
      highConfCorrect: 0,
      highConfIncorrect: 0,
      lowConfCorrect: 0,
      lowConfIncorrect: 0
    };

    for (const attempt of (recentAttempts || [])) {
      const d = new Date(attempt.created_at);
      const daysDiff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
      
      thirtyDayAttempts++;
      if (attempt.is_correct) thirtyDayCorrect++;
      
      if (daysDiff <= 7) {
        sevenDayAttempts++;
        if (attempt.is_correct) sevenDayCorrect++;
      }
      
      // UTC day check for "today"
      if (attempt.created_at.startsWith(missionDate)) {
        todayAttempts++;
        if (attempt.is_correct) todayCorrect++;
      }

      if (attempt.confidence === 'high') {
        if (attempt.is_correct) confData.highConfCorrect++;
        else confData.highConfIncorrect++;
      } else if (attempt.confidence === 'low') {
        if (attempt.is_correct) confData.lowConfCorrect++;
        else confData.lowConfIncorrect++;
      }
    }

    const overallAccuracy = totalQuestionsAttempted > 0 ? totalCorrect / totalQuestionsAttempted : 0;
    const recentAccuracy = sevenDayAttempts > 0 ? sevenDayCorrect / sevenDayAttempts : 0;
    
    const historicalAttempts = thirtyDayAttempts - sevenDayAttempts;
    const historicalAccuracy = historicalAttempts > 0 ? (thirtyDayCorrect - sevenDayCorrect) / historicalAttempts : 0;

    const trend = classifyTrend(sevenDayAttempts, recentAccuracy, historicalAttempts, historicalAccuracy);
    const confidenceCalibration = classifyConfidence(confData);

    const factors: ReadinessFactors = {
      globalMasteryAverage,
      overallAccuracy,
      recentAccuracy,
      questionsAttempted: totalQuestionsAttempted,
      criticalWeaknessesCount,
      overdueRevisionCount: overdueRevisionCount || 0
    };

    const readinessScore = calculateReadinessScore(factors);

    // Identify strongest/weakest subject
    let strongestSubject = null;
    let weakestSubject = null;
    
    if (subjectPerformances.length > 0) {
      const sorted = [...subjectPerformances].sort((a, b) => b.masteryScore - a.masteryScore);
      strongestSubject = sorted[0].name;
      weakestSubject = sorted[sorted.length - 1].name;
    }

    let recommendedFocus = null;
    const criticalTopics = topicPerformances.filter(t => t.classification === 'CRITICAL_WEAKNESS');
    if (criticalTopics.length > 0) {
      recommendedFocus = criticalTopics.sort((a, b) => a.masteryScore - b.masteryScore)[0];
    }

    return Response.json({
      readinessScore,
      overallAccuracy: Math.round(overallAccuracy * 100),
      totalQuestionsAttempted,
      strongestSubject,
      weakestSubject,
      trend,
      confidenceCalibration,
      recommendedFocus,
      stats: {
        todayAttempts,
        todayAccuracy: todayAttempts > 0 ? Math.round((todayCorrect / todayAttempts) * 100) : 0,
        sevenDayAccuracy: sevenDayAttempts > 0 ? Math.round(recentAccuracy * 100) : 0,
        thirtyDayAccuracy: thirtyDayAttempts > 0 ? Math.round((thirtyDayCorrect / thirtyDayAttempts) * 100) : 0
      }
    });

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
