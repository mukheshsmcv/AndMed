import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getApiOrigin } from '../lib/api-url';
import { useTheme } from '../theme/ThemeProvider';

interface Option {
  id: string;
  option_text: string;
  why_wrong?: string;
}

interface Question {
  id: string;
  question_text: string;
  topic_id: string;
  difficulty: string;
  options: Option[];
}

export default function McqScreen() {
  const { theme, themeType } = useTheme();
  const { topicId, subjectId, mode } = useLocalSearchParams();

  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Results
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctOptionId, setCorrectOptionId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [learningPoint, setLearningPoint] = useState<string | null>(null);
  const [optionsDetail, setOptionsDetail] = useState<Option[]>([]);
  
  const [startTime, setStartTime] = useState<number>(0);

  const [emptyState, setEmptyState] = useState<string | null>(null);

  const loadNextQuestion = async () => {
    try {
      setLoading(true);
      setSubmitted(false);
      setSelected(null);
      setEmptyState(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const origin = getApiOrigin();
      const apiUrl = new URL(`${origin}/api/next-question`);
      if (topicId) apiUrl.searchParams.append('topicId', topicId as string);
      if (subjectId) apiUrl.searchParams.append('subjectId', subjectId as string);
      if (mode) apiUrl.searchParams.append('mode', mode as string);
      
      const res = await fetch(apiUrl.toString(), {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      
      const data = await res.json();
      if (res.status === 404 || data.error === 'No practice questions available') {
        // Graceful empty state — expected when MCQ corpus is empty
        setEmptyState('No practice questions are available yet.\n\nThe question bank is being built. Check back soon.');
        return;
      }
      if (data.error) {
        setEmptyState(data.error);
        return;
      }
      
      setQuestion(data.question);
      setStartTime(Date.now());
    } catch (e: any) {
      setEmptyState('Could not connect to the server. Check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNextQuestion();
  }, []);

  const handleSubmit = async () => {
    if (!selected || !question) return;
    
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const timeTakenSeconds = Math.floor((Date.now() - startTime) / 1000);
      const origin = getApiOrigin();

      const res = await fetch(`${origin}/api/submit-attempt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionId: question.id,
          selectedOptionId: selected,
          timeTakenSeconds,
          confidence: 'medium' // Simplified for MVP
        })
      });
      
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      
      setIsCorrect(result.isCorrect);
      setCorrectOptionId(result.correctOptionId);
      setExplanation(result.explanation);
      setLearningPoint(result.learningPoint);
      setOptionsDetail(result.optionsDetail);
      setSubmitted(true);
    } catch (e: any) {
      setEmptyState('Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !question && !emptyState) {
    return (
      <View className="flex-1 bg-zinc-950 items-center justify-center">
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="text-zinc-400 mt-4">Adapting next question...</Text>
      </View>
    );
  }

  if (emptyState || (!loading && !question)) {
    return (
      <View className="flex-1 bg-zinc-950 items-center justify-center px-8">
        <Text className="text-4xl mb-4">📚</Text>
        <Text className="text-white font-bold text-xl text-center mb-3">No Questions Yet</Text>
        <Text className="text-zinc-400 text-center text-base leading-relaxed mb-8">
          {emptyState || 'No practice questions are available yet.\n\nThe question bank is being built. Check back soon.'}
        </Text>
        <TouchableOpacity
          className="bg-zinc-800 px-6 py-3 rounded-lg border border-zinc-700"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!question) return null;

  return (
    <View className="flex-1 bg-zinc-950 px-4 pt-12 pb-8">
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity onPress={() => router.back()} disabled={loading}>
          <Text className="text-zinc-400">← Back</Text>
        </TouchableOpacity>
        <Text className="text-zinc-500 text-sm font-medium">Practice</Text>
        <Text className="text-zinc-400">{question.difficulty.toUpperCase()}</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="mb-8">
          <Text className="text-white text-lg leading-relaxed">{question.question_text}</Text>
        </View>

        <View className="space-y-3 mb-8">
          {question.options.map((opt) => {
            const isSelected = selected === opt.id;
            let bgColor = 'bg-zinc-900';
            let borderColor = 'border-zinc-800';
            
            if (submitted) {
              if (opt.id === correctOptionId) {
                bgColor = 'bg-emerald-950';
                borderColor = 'border-emerald-500';
              } else if (isSelected && opt.id !== correctOptionId) {
                bgColor = 'bg-red-950';
                borderColor = 'border-red-500';
              }
            } else if (isSelected) {
              bgColor = 'bg-zinc-800';
              borderColor = 'border-zinc-500';
            }

            return (
              <TouchableOpacity
                key={opt.id}
                disabled={submitted || loading}
                onPress={() => setSelected(opt.id)}
                className={`p-4 rounded-xl border ${bgColor} ${borderColor} flex-row mt-3`}
              >
                <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 border ${
                  submitted && opt.id === correctOptionId ? 'border-emerald-500 bg-emerald-900' : 
                  submitted && isSelected ? 'border-red-500 bg-red-900' :
                  isSelected ? 'border-white bg-white' : 'border-zinc-600'
                }`}>
                  <Text className={isSelected && !submitted ? 'text-black font-bold' : 'text-zinc-400 font-bold'}>
                    {/* Simplified marker */}
                    •
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-zinc-200 text-base">{opt.option_text}</Text>
                  {submitted && optionsDetail.find(d => d.id === opt.id)?.why_wrong && (
                    <Text className="text-zinc-400 text-sm mt-2">{optionsDetail.find(d => d.id === opt.id)?.why_wrong}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {submitted && explanation && (
          <View className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 mb-8">
            <Text className={`font-bold text-lg mb-2 ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
              {isCorrect ? 'Correct!' : 'Incorrect'}
            </Text>
            <Text className="text-white text-base leading-relaxed mb-4">{explanation}</Text>
            {learningPoint && (
              <View className="bg-zinc-950 p-4 rounded-lg">
                <Text className="text-zinc-400 text-xs font-bold uppercase mb-1">Key Learning Point</Text>
                <Text className="text-zinc-300">{learningPoint}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View className="pt-4 border-t border-zinc-900">
        {!submitted ? (
          <TouchableOpacity 
            className={`py-4 rounded-lg items-center ${selected && !loading ? 'bg-white' : 'bg-zinc-800'}`}
            onPress={handleSubmit}
            disabled={!selected || loading}
          >
            <Text className={`font-bold text-lg ${selected && !loading ? 'text-black' : 'text-zinc-500'}`}>
              {loading ? 'Submitting...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            className="bg-white py-4 rounded-lg items-center"
            onPress={loadNextQuestion}
            disabled={loading}
          >
            <Text className="text-black font-bold text-lg">Next Question</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
