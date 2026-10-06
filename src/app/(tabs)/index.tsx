import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, AppState } from 'react-native';
import { supabase } from '../../lib/supabase';
import { router, useFocusEffect } from 'expo-router';
import { getApiOrigin } from '../../lib/api-url';
import { Screen, SectionHeader, GlassCard, ProgressBar, PrimaryButton, ExamCountdown, SPACING, RADIUS } from '../../components/DesignSystem';
import { SubjectProgressCard } from '../../components/SubjectProgressCard';
import { Ionicons } from '@expo/vector-icons';
import { EXAM_TARGETS, CURRENT_EXAM_ID, getExamCountdown } from '../../config/exam';
import { useTheme } from '../../theme/ThemeProvider';

export default function Home() {
  const { theme, themeType } = useTheme();

  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [missionData, setMissionData] = useState<any>(null);
  const [curriculumData, setCurriculumData] = useState<any>(null);
  const [subjectProgress, setSubjectProgress] = useState<any[]>([]);
  const [recentSubjects, setRecentSubjects] = useState<any[]>([]);
  const [revisionStats, setRevisionStats] = useState<any>(null);
  const [activeRevisions, setActiveRevisions] = useState<any[]>([]);
  const [studyStats, setStudyStats] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Focus effect to ensure live refresh when returning from Profile, Study sessions, etc.
  useFocusEffect(
    useCallback(() => {
      loadDashboard();
      setCurrentDate(new Date());
    }, [])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        setCurrentDate(new Date());
        loadDashboard();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const loadDashboard = async () => {
    try {
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      
      setMetadata(session.user.user_metadata || {});
      const origin = getApiOrigin();
      const headers = { 'Authorization': `Bearer ${session.access_token}` };
      
      const [perfRes, missionRes, currRes, dashRes] = await Promise.all([
        fetch(`${origin}/api/performance`, { headers }),
        fetch(`${origin}/api/daily-mission`, { headers }),
        fetch(`${origin}/api/curriculum`, { headers }),
        fetch(`${origin}/api/dashboard`, { headers })
      ]);
      
      const perfData = await perfRes.json();
      const missData = await missionRes.json();
      const currData = await currRes.json();
      const dashData = await dashRes.json();

      if (perfData.error) throw new Error(perfData.error);
      if (missData.error) throw new Error(missData.error);
      
      setPerformanceData(perfData);
      setMissionData(missData);
      setCurriculumData(currData.curriculum || []);
      setRevisionStats(dashData.revisionStats || null);
      setActiveRevisions(dashData.activeRevisions || []);
      setRecentSubjects(dashData.recentSubjects || []);
      setSubjectProgress(dashData.subjectProgress || []);
      setStudyStats(dashData.studyStats || { todayStudySeconds: 0, currentStreak: 0 });
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: theme.critical, marginBottom: SPACING.md }}>{error}</Text>
        <PrimaryButton title="Retry" onPress={loadDashboard} />
      </Screen>
    );
  }

  const currentExamId = metadata?.target_exam || CURRENT_EXAM_ID;
  const target = EXAM_TARGETS[currentExamId] || EXAM_TARGETS[CURRENT_EXAM_ID];
  const countdown = getExamCountdown(target, currentDate);

  const greeting = currentDate.getHours() < 12 ? 'GOOD MORNING' : currentDate.getHours() < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
  const userName = metadata?.name || metadata?.institution ? (metadata.name || 'DOC') : 'DOC';

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0 min';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  };

  // Authoritative daily study target hours from user metadata / profile
  const dailyTargetHours = Number(metadata?.daily_study_target_hours) || 6;
  const dailyTargetSeconds = dailyTargetHours * 3600;
  const todayProgress = Math.min(100, Math.round(((studyStats?.todayStudySeconds || 0) / dailyTargetSeconds) * 100));

  // Calculate subjects completed
  const totalSubjectsCount = curriculumData?.length || 19;
  const overallCompletedSubjects = (curriculumData || []).filter((s: any) => s.completionPercentage >= 100).length;

  // For Curriculum Progress preview on Home, show first 4 subjects from subjectProgress or curriculumData
  const previewSubjects = (subjectProgress.length > 0 ? subjectProgress : (curriculumData || [])).slice(0, 4);

  return (
    <Screen noPadding>
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl }}>
        
        {/* Top Greeting */}
        <View style={{ marginBottom: SPACING.md, marginTop: SPACING.sm }}>
          <Text style={{ color: theme.secondaryText, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
            {greeting}, {userName}
          </Text>
        </View>

        {/* Exam Target Header */}
        <ExamCountdown target={target} countdown={countdown} />

        {/* Study Focus / Today's Focus */}
        <SectionHeader title="Today's Focus" />
        {studyStats?.recentTopicDetails ? (
          <GlassCard style={{ padding: SPACING.md, flexDirection: 'row', alignItems: 'center', backgroundColor: themeType === 'colorful' ? theme.learning : theme.surface }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: themeType === 'colorful' ? 'rgba(255,255,255,0.8)' : theme.tertiaryText, fontSize: 13, textTransform: 'uppercase', fontWeight: '600', marginBottom: 2 }}>
                {studyStats.recentTopicDetails.subjectName}
              </Text>
              <Text style={{ color: themeType === 'colorful' ? '#FFF' : theme.primaryText, fontSize: 18, fontWeight: '700' }}>
                {studyStats.recentTopicDetails.name}
              </Text>
              <Text style={{ color: themeType === 'colorful' ? 'rgba(255,255,255,0.9)' : theme.secondaryText, fontSize: 14, marginTop: 4 }}>
                Continue studying
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push(`/topic/${studyStats.recentTopicDetails.id}` as any)} style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: themeType === 'colorful' ? 'rgba(255,255,255,0.2)' : theme.surfaceHighlight, borderRadius: RADIUS.full }}>
              <Text style={{ color: themeType === 'colorful' ? '#FFF' : theme.accent, fontWeight: '600' }}>Continue</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : previewSubjects.length > 0 ? (
          <GlassCard style={{ padding: SPACING.md, flexDirection: 'row', alignItems: 'center', backgroundColor: themeType === 'colorful' ? theme.learning : theme.surface }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: themeType === 'colorful' ? 'rgba(255,255,255,0.8)' : theme.tertiaryText, fontSize: 13, textTransform: 'uppercase', fontWeight: '600', marginBottom: 2 }}>
                {previewSubjects[0].name}
              </Text>
              <Text style={{ color: themeType === 'colorful' ? '#FFF' : theme.primaryText, fontSize: 18, fontWeight: '700' }}>
                Start Studying
              </Text>
              <Text style={{ color: themeType === 'colorful' ? 'rgba(255,255,255,0.9)' : theme.secondaryText, fontSize: 14, marginTop: 4 }}>
                Explore curriculum topics
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/curriculum')} style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: themeType === 'colorful' ? 'rgba(255,255,255,0.2)' : theme.surfaceHighlight, borderRadius: RADIUS.full }}>
              <Text style={{ color: themeType === 'colorful' ? '#FFF' : theme.accent, fontWeight: '600' }}>Open</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : (
          <GlassCard style={{ padding: SPACING.md }}>
             <Text style={{ color: theme.secondaryText, textAlign: 'center' }}>No topics available. Check curriculum.</Text>
          </GlassCard>
        )}

        {/* Today's Revision (M17 Topic Spaced Repetition) */}
        <SectionHeader title="Today's Revision" actionTitle="View all" onAction={() => router.push('/(tabs)/revision')} />
        {activeRevisions && activeRevisions.length > 0 ? (
          <View style={{ gap: SPACING.sm }}>
            {activeRevisions.slice(0, 3).map((rev: any) => (
              <GlassCard key={rev.id} style={{ padding: SPACING.md, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={{ color: theme.tertiaryText, fontSize: 11, textTransform: 'uppercase', fontWeight: '600' }}>
                      {rev.subjectName}
                    </Text>
                    {rev.intervalDays && (
                      <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '600' }}>
                        • {rev.intervalDays}d cycle
                      </Text>
                    )}
                  </View>
                  <Text style={{ color: theme.primaryText, fontSize: 16, fontWeight: '600' }}>{rev.topicName}</Text>
                  <Text style={{ color: rev.status === 'OVERDUE' ? theme.critical : theme.accent, fontSize: 13, marginTop: 4, fontWeight: '500' }}>
                    {rev.status === 'OVERDUE' ? '⚠️ Overdue' : 'Due today'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => router.push(`/topic/${rev.topicId}` as any)} style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: theme.surfaceHighlight, borderRadius: RADIUS.full }}>
                  <Text style={{ color: theme.primaryText, fontWeight: '600', fontSize: 13 }}>Review Topic</Text>
                </TouchableOpacity>
              </GlassCard>
            ))}
          </View>
        ) : (
          <GlassCard style={{ padding: SPACING.md }}>
            <Text style={{ color: theme.secondaryText, textAlign: 'center' }}>No revisions due today</Text>
          </GlassCard>
        )}

        {/* Study Stats Today & Streak */}
        <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xl }}>
          <GlassCard style={{ flex: 1, padding: SPACING.md }}>
            <Text style={{ color: theme.secondaryText, fontSize: 13, fontWeight: '600', marginBottom: SPACING.xs, textTransform: 'uppercase' }}>Study Today</Text>
            <Text style={{ color: theme.primaryText, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>{formatDuration(studyStats?.todayStudySeconds)}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm, marginBottom: 4 }}>
              <Text style={{ color: theme.tertiaryText, fontSize: 12, marginRight: SPACING.sm }}>Target: {dailyTargetHours}h</Text>
            </View>
            <ProgressBar progress={todayProgress} height={4} />
          </GlassCard>
          
          <GlassCard style={{ flex: 1, padding: SPACING.md, justifyContent: 'center' }}>
            <Text style={{ color: theme.secondaryText, fontSize: 13, fontWeight: '600', marginBottom: SPACING.xs, textTransform: 'uppercase' }}>Current Streak</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 24, marginRight: 6 }}>🔥</Text>
              <Text style={{ color: theme.primaryText, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>{studyStats?.currentStreak || 0} days</Text>
            </View>
          </GlassCard>
        </View>

        {/* Recent Subjects (Phase 3) */}
        <SectionHeader title="Recent Subjects" />
        {recentSubjects && recentSubjects.length > 0 ? (
          <View style={{ gap: SPACING.sm }}>
            {recentSubjects.map((sub: any) => (
              <GlassCard
                key={sub.id}
                style={{ padding: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                onPress={() => router.push('/(tabs)/curriculum')}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.primaryText, fontSize: 16, fontWeight: '700' }}>{sub.name}</Text>
                  <Text style={{ color: theme.secondaryText, fontSize: 13, marginTop: 2 }}>
                    {sub.relativeTime} {sub.topicName ? `• ${sub.topicName}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.tertiaryText} />
              </GlassCard>
            ))}
          </View>
        ) : (
          <GlassCard style={{ padding: SPACING.md, alignItems: 'center' }}>
            <Text style={{ color: theme.secondaryText, textAlign: 'center', fontSize: 14 }}>
              Start studying to build your recent subjects.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/curriculum')}
              style={{ marginTop: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 6, backgroundColor: theme.surfaceHighlight, borderRadius: RADIUS.full }}
            >
              <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600' }}>Browse Curriculum</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* Curriculum Progress with Dual Metrics (Phase 1 & Phase 2) */}
        <SectionHeader title="Curriculum Progress" actionTitle="View all" onAction={() => router.push('/(tabs)/curriculum')} />
        <Text style={{ color: theme.secondaryText, fontSize: 14, marginBottom: SPACING.sm }}>
          {overallCompletedSubjects} / {totalSubjectsCount} subjects completed
        </Text>
        
        <View style={{ gap: SPACING.sm }}>
          {previewSubjects.length > 0 ? (
            previewSubjects.map((sub: any) => (
              <SubjectProgressCard
                key={sub.id}
                id={sub.id}
                name={sub.name}
                slug={sub.slug}
                completedTopics={sub.completedTopics ?? sub.completedTopicCount ?? 0}
                totalTopics={sub.totalTopics ?? sub.topicCount ?? 0}
                mcqAttempted={sub.mcqAttempted ?? 0}
                mcqCorrect={sub.mcqCorrect ?? 0}
                mcqAccuracy={sub.mcqAccuracy ?? null}
                hasMcqData={sub.hasMcqData ?? false}
                onPress={() => router.push('/(tabs)/curriculum')}
              />
            ))
          ) : (
            <GlassCard style={{ padding: SPACING.md }}>
              <Text style={{ color: theme.secondaryText, textAlign: 'center' }}>No subjects loaded yet.</Text>
            </GlassCard>
          )}
        </View>

        {/* Needs Attention */}
        <SectionHeader title="Needs Attention" />
        {performanceData?.recommendedFocus ? (
          <GlassCard style={{ flexDirection: 'row', alignItems: 'center', padding: SPACING.md, backgroundColor: themeType === 'colorful' ? theme.critical : theme.surface }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: themeType === 'colorful' ? '#FFF' : theme.primaryText, fontSize: 18, fontWeight: '700' }}>{performanceData.recommendedFocus.name}</Text>
              <Text style={{ color: themeType === 'colorful' ? 'rgba(255,255,255,0.8)' : theme.secondaryText, fontSize: 14, marginTop: 2 }}>{performanceData.recommendedFocus.subjectName}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push(`/topic/${performanceData.recommendedFocus.id}` as any)} style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: themeType === 'colorful' ? 'rgba(255,255,255,0.2)' : theme.surfaceHighlight, borderRadius: RADIUS.full }}>
              <Text style={{ color: themeType === 'colorful' ? '#FFF' : theme.accent, fontWeight: '600' }}>Study</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : (
          <GlassCard style={{ padding: SPACING.md }}>
            <Text style={{ color: theme.secondaryText, textAlign: 'center' }}>No immediate topics require attention.</Text>
          </GlassCard>
        )}

      </ScrollView>
    </Screen>
  );
}
