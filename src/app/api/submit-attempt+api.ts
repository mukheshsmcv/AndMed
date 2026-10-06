import { supabaseServer } from '../../lib/supabase-server';
import { calculateTopicMastery, calculateNextRevisionDays, AttemptResult } from '../../services/AdaptiveEngine';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return Response.json({ error: 'Missing auth header' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser(token);
    
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { questionId, selectedOptionId, timeTakenSeconds, confidence } = await req.json();

    if (!questionId || !selectedOptionId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Verify correctness securely on server and validate option belongs to question
    const { data: question } = await supabaseServer
      .from('questions')
      .select('id, topic_id, difficulty')
      .eq('id', questionId)
      .single();

    if (!question) {
      return Response.json({ error: 'Question not found' }, { status: 404 });
    }

    const { data: allOptions } = await supabaseServer
      .from('question_options')
      .select('id, is_correct, why_wrong')
      .eq('question_id', questionId);

    const validOption = allOptions?.find(o => o.id === selectedOptionId);
    if (!validOption) {
      return Response.json({ error: 'Invalid option ID for this question' }, { status: 400 });
    }

    const isCorrect = validOption.is_correct;
    const correctOption = allOptions?.find(o => o.is_correct);

    // Check for rapid duplicate submission (idempotency safety)
    const { data: recentDuplicate } = await supabaseServer
      .from('question_attempts')
      .select('id')
      .eq('user_id', user.id)
      .eq('question_id', questionId)
      .gte('created_at', new Date(Date.now() - 5000).toISOString())
      .limit(1);

    if (recentDuplicate && recentDuplicate.length > 0) {
      return Response.json({ error: 'Duplicate submission detected' }, { status: 409 });
    }

    // 2. Record the attempt
    await supabaseServer.from('question_attempts').insert({
      user_id: user.id,
      question_id: questionId,
      selected_option_id: selectedOptionId,
      is_correct: isCorrect,
      time_taken_seconds: timeTakenSeconds,
      confidence: confidence
    });

    // 3. Update topic mastery
    const { data: existingMastery } = await supabaseServer
      .from('topic_mastery')
      .select('*')
      .eq('user_id', user.id)
      .eq('topic_id', question.topic_id)
      .single();

    const { data: recentAttempts } = await supabaseServer
      .from('question_attempts')
      .select('is_correct')
      .eq('user_id', user.id)
      .eq('question_id', questionId)
      .order('created_at', { ascending: false })
      .limit(5);

    let consecutiveCorrect = 0;
    let consecutiveIncorrect = 0;
    
    if (recentAttempts) {
      for (const att of recentAttempts) {
        if (att.is_correct) {
          if (consecutiveIncorrect > 0) break;
          consecutiveCorrect++;
        } else {
          if (consecutiveCorrect > 0) break;
          consecutiveIncorrect++;
        }
      }
    }

    // Add current attempt manually since it's not yet in the recentAttempts array we fetched
    if (isCorrect) {
      consecutiveCorrect++;
      consecutiveIncorrect = 0;
    } else {
      consecutiveIncorrect++;
      consecutiveCorrect = 0;
    }

    const currentScore = existingMastery?.mastery_score || 0;
    const attemptData: AttemptResult = {
      isCorrect,
      difficulty: (question.difficulty as any) || 'medium',
      timeTaken: timeTakenSeconds,
      confidence,
      consecutiveCorrect,
      consecutiveIncorrect
    };

    const newMasteryScore = calculateTopicMastery(currentScore, attemptData);

    const updatePayload = {
      user_id: user.id,
      topic_id: question.topic_id,
      mastery_score: newMasteryScore,
      questions_attempted: (existingMastery?.questions_attempted || 0) + 1,
      correct_attempts: (existingMastery?.correct_attempts || 0) + (isCorrect ? 1 : 0),
      last_attempted_at: new Date().toISOString()
    };

    if (existingMastery) {
      await supabaseServer.from('topic_mastery').update(updatePayload).eq('id', existingMastery.id);
    } else {
      await supabaseServer.from('topic_mastery').insert(updatePayload);
    }

    const nextDays = calculateNextRevisionDays(isCorrect, confidence, consecutiveCorrect);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + nextDays);

    const { data: existingRev } = await supabaseServer
      .from('revision_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('question_id', questionId)
      .single();

    if (existingRev) {
      await supabaseServer.from('revision_items').update({
        scheduled_date: nextDate.toISOString().split('T')[0],
        completed_at: null,
      }).eq('id', existingRev.id);
    } else {
      await supabaseServer.from('revision_items').insert({
        user_id: user.id,
        question_id: questionId,
        topic_id: question.topic_id,
        scheduled_date: nextDate.toISOString().split('T')[0],
      });
    }

    // 5. Return result + explanation
    const { data: explanationData } = await supabaseServer
      .from('questions')
      .select('explanation, key_learning_point')
      .eq('id', questionId)
      .single();

    return Response.json({
      isCorrect,
      correctOptionId: correctOption?.id,
      explanation: explanationData?.explanation,
      learningPoint: explanationData?.key_learning_point,
      // Strip is_correct from the client-facing payload — answer key must not leak
      optionsDetail: (allOptions || []).map(({ id, why_wrong }: { id: string; why_wrong?: string }) => ({ id, why_wrong }))
    });

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
