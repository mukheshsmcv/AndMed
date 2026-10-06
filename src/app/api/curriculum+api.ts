import { supabaseServer } from '../../lib/supabase-server';
import { deriveCurriculumStatus, calculateCompletionPercentage, calculateIntegratedMastery, IntegratedComponent, determineCoverageStatus } from '../../services/CurriculumEngine';
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

    // Fetch Base Curriculum
    const { data: subjects } = await supabaseServer
      .from('subjects')
      .select('id, name, slug, academic_year');

    const { data: topics } = await supabaseServer
      .from('topics')
      .select('id, subject_id, name, slug, exam_relevance');

    // Fetch User Mastery
    const { data: subjectMastery } = await supabaseServer
      .from('subject_mastery')
      .select('subject_id, mastery_score, questions_attempted, correct_attempts')
      .eq('user_id', user.id);

    const { data: topicMastery } = await supabaseServer
      .from('topic_mastery')
      .select('topic_id, mastery_score, questions_attempted, correct_attempts')
      .eq('user_id', user.id);

    // Fetch Overdue Revisions
    const missionDate = getCurrentMissionDate();
    const { data: overdueRevisions } = await supabaseServer
      .from('revision_items')
      .select('topic_id')
      .eq('user_id', user.id)
      .is('completed_at', null)
      .lte('scheduled_date', missionDate);

    const { data: topicProgress } = await supabaseServer
      .from('student_topic_progress')
      .select('topic_id, status, updated_at')
      .eq('user_id', user.id);

    // Fetch published question counts per topic
    const { data: questionCountsData } = await supabaseServer
      .from('questions')
      .select('topic_id, id')
      .eq('status', 'PUBLISHED');

    const questionCounts = new Map<string, number>();
    if (questionCountsData) {
      questionCountsData.forEach(q => {
        const count = questionCounts.get(q.topic_id) || 0;
        questionCounts.set(q.topic_id, count + 1);
      });
    }

    const overdueTopicIds = new Set(overdueRevisions?.map(r => r.topic_id) || []);
    const progressMap = new Map(topicProgress?.map(tp => [tp.topic_id, { status: tp.status, updated_at: tp.updated_at }]) || []);

    // Build Curriculum Tree
    const curriculum = (subjects || []).map(subject => {
      const sMastery = subjectMastery?.find(sm => sm.subject_id === subject.id);
      const subjectTopics = (topics || []).filter(t => t.subject_id === subject.id);
      
      const topicDetails = subjectTopics.map(t => {
        const pMap = progressMap.get(t.id) as any;
        const tMastery = topicMastery?.find(tm => tm.topic_id === t.id);
        const evidence = {
          questionsAttempted: tMastery?.questions_attempted || 0,
          masteryScore: tMastery?.mastery_score || 0,
          hasOverdueRevision: overdueTopicIds.has(t.id),
          manualStatus: pMap?.status || undefined
        };
        
        const qCount = questionCounts.get(t.id) || 0;
        const coverageStatus = determineCoverageStatus(qCount);

        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          status: deriveCurriculumStatus(evidence),
          completionPercentage: calculateCompletionPercentage(evidence.masteryScore, evidence.questionsAttempted, evidence.manualStatus),
          masteryScore: evidence.masteryScore,
          accuracy: tMastery?.questions_attempted ? Math.round((tMastery.correct_attempts / tMastery.questions_attempted) * 100) : 0,
          questionsAttempted: evidence.questionsAttempted,
          questionCount: qCount,
          publishedQuestionCount: qCount, // for now, assuming all counted are published
          coverageStatus,
          revisionStatus: evidence.hasOverdueRevision ? 'Due' : 'None',
          examRelevance: t.exam_relevance || 5,
          sessionStartedAt: pMap?.status === 'IN_PROGRESS' ? pMap?.updated_at : null
        };
      });

      const totalQCount = topicDetails.reduce((sum, t) => sum + t.questionCount, 0);
      const coveredTopics = topicDetails.filter(t => t.questionCount > 0).length;
      const completedTopics = topicDetails.filter(t => t.status === 'COMPLETED' || t.status === 'MASTERED').length;

      const sEvidence = {
        questionsAttempted: sMastery?.questions_attempted || 0,
        masteryScore: sMastery?.mastery_score || 0,
        hasOverdueRevision: topicDetails.some(td => td.revisionStatus === 'Due')
      };

      return {
        id: subject.id,
        name: subject.name,
        slug: subject.slug,
        academicYear: subject.academic_year,
        topicCount: subjectTopics.length,
        coveredTopicCount: coveredTopics,
        completedTopicCount: completedTopics,
        questionCount: totalQCount,
        coveragePercentage: subjectTopics.length > 0 ? Math.round((coveredTopics / subjectTopics.length) * 100) : 0,
        status: deriveCurriculumStatus(sEvidence),
        completionPercentage: subjectTopics.length > 0 ? Math.round((completedTopics / subjectTopics.length) * 100) : 0,
        masteryScore: sEvidence.masteryScore,
        questionsAttempted: sEvidence.questionsAttempted,
        topics: topicDetails
      };
    });

    // Integrated Concepts
    const { data: concepts } = await supabaseServer
      .from('integrated_concepts')
      .select('id, name, slug, description');
      
    const { data: links } = await supabaseServer
      .from('integrated_concept_links')
      .select('integrated_concept_id, topic_id, importance');

    const integratedConcepts = (concepts || []).map(c => {
      const cLinks = (links || []).filter(l => l.integrated_concept_id === c.id);
      
      const components: IntegratedComponent[] = cLinks.map(l => {
        const tMastery = topicMastery?.find(tm => tm.topic_id === l.topic_id);
        return {
          topicId: l.topic_id,
          masteryScore: tMastery?.mastery_score || 0,
          questionsAttempted: tMastery?.questions_attempted || 0,
          importance: l.importance || 5
        };
      });

      const integratedMastery = calculateIntegratedMastery(components);

      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        mastery: integratedMastery
      };
    });

    return Response.json({
      curriculum,
      integratedConcepts
    });

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
