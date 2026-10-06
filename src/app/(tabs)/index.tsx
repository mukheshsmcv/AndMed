import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, AppState } from 'react-native';
import { supabase } from '../../lib/supabase';
import { router, useFocusEffect } from 'expo-router';
import { getApiOrigin } from '../../lib/api-url';
import { Screen, SectionHeader, GlassCard, ProgressBar, PrimaryButton, ExamCountdown, ActiveTimer, SPACING, RADIUS } from '../../components/DesignSystem';
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
  const [activeStudySession, setActiveStudySession] = useState<any>(null);
  const [revisionStats, setRevisionStats] = useState<any>(null);
  const [activeRevisions, setActiveRevisions] = useState<any[]>([]);
  const [studyStats, setStudyStats] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Focus effect for instantaneous refresh on returning to Home
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      
      const fetchWithRetry = async () => {
        await loadDashboard();
        
        // Short-delay silent retry to reconcile any in-flight background 
        // session creation/completion API requests from topic screen.
        setTimeout(() => {
          if (isActive) {
            loadDashboard(true); // true = silent background refresh
          }
        }, 1500);
      };
      
      fetchWithRetry();
      setCurrentDate(new Date());

      return () => {
        isActive = false;
      };
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

  const loadDashboard = async (isSilent = false) => {
    try {
      if (!isSilent) setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      
      setMetadata(session.user.user_metadata || {});
      const origin = getApiOrigin();
      const headers = { 'Authorization': `Bearer ${session.access_token}` };
      const tzOffset = new Date().getTimezoneOffset(); // e.g. -330 for IST
      const clientDateStr = currentDate.toLocaleDateString('en-CA');
      
      const [perfRes, missionRes, currRes, dashRes, activityRes] = await Promise.all([
        fetch(`${origin}/api/performance`, { headers }),
        fetch(`${origin}/api/daily-mission`, { headers }),
        fetch(`${origin}/api/curriculum`, { headers }),
        fetch(`${origin}/api/dashboard?clientDate=${clientDateStr}&tzOffset=${tzOffset}`, { headers }),
        fetch(`${origin}/api/study-activity?clientDate=${clientDateStr}&tzOffset=${tzOffset}`, { headers })
      ]);
      
      const perfData = await perfRes.json();
      const missData = await missionRes.json();
      const currData = await currRes.json();
      const dashData = await dashRes.json();
      const activityData = await activityRes.json();

      if (perfData.error) throw new Error(perfData.error);
      if (missData.error) throw new Error(missData.error);
      if (activityData.error) throw new Error(activityData.error);
      
      setPerformanceData(perfData);
      setMissionData(missData);
      setCurriculumData(currData.curriculum || []);
      setRevisionStats(dashData.revisionStats || null);
      setActiveStudySession(activityData.activeSession || null);
      setActiveRevisions(dashData.activeRevisions || []);
      setRecentSubjects(activityData.recent || []);
      
      setSubjectProgress(dashData.subjectProgress || []);
      setStudyStats({
        todayStudySeconds: activityData.today?.totalSeconds || 0,
        currentStreak: dashData.studyStats?.currentStreak || 0
      });
    } catch (err: any) {
      if (!isSilent) setError(err.message || 'Failed to load dashboard');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  if (loading) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }} tabIndex={0}>
        <ActivityIndicator size="large" color={theme.accent} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }} tabIndex={0}>
        <Text style={{ color: theme.critical, marginBottom: SPACING.md }}>{error}</Text>
        <PrimaryButton title="Retry" onPress={loadDashboard} />
      </Screen>
    );
  }

  const currentExamId = metadata?.target_exam || CURRENT_EXAM_ID;
  const target = EXAM_TARGETS[currentExamId] || EXAM_TARGETS[CURRENT_EXAM_ID];
  const countdown = getExamCountdown(target, currentDate);

  const hour = currentDate.getHours();
  let greeting = 'GOOD EVENING';
  if (hour >= 5 && hour < 12) {
    greeting = 'GOOD MORNING';
  } else if (hour >= 12 && hour < 17) {
    greeting = 'GOOD AFTERNOON';
  }
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

  // Preview subjects for Curriculum Progress
  const previewSubjects = (subjectProgress.length > 0 ? subjectProgress : (curriculumData || [])).slice(0, 4);

  return (
    <Screen noPadding tabIndex={0}>
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl }}>
        
        {/* Top Greeting */}
        <View style={{ marginBottom: SPACING.lg, marginTop: SPACING.sm, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => router.push('/(tabs)/profile')} 
            accessibilityRole="button" 
            accessibilityLabel="Open profile"
          >
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: theme.surfaceHighlight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md }}>
              <Text style={{ color: theme.primaryText, fontSize: 18, fontWeight: '800' }}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
          <Text style={{ color: theme.secondaryText, fontSize: 15, fontWeight: '600' }}>
            {greeting.charAt(0).toUpperCase() + greeting.slice(1).toLowerCase()}, {userName}
          </Text>
        </View>

        {/* Exam Target Header */}
        <ExamCountdown target={target} countdown={countdown} />

        {/* 2. Currently Studying */}
        {activeStudySession && (
          <View style={{ marginBottom: SPACING.lg }}>
            <SectionHeader title="Currently Studying" />
            <GlassCard style={{ padding: SPACING.md, borderColor: theme.learning, backgroundColor: 'rgba(59, 130, 246, 0.08)' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: SPACING.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.learning }} />
                    <Text style={{ color: theme.learning, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
                      {activeStudySession.subjectName}
                    </Text>
                  </View>
                  <Text style={{ color: theme.primaryText, fontSize: 18, fontWeight: '800', marginBottom: 4 }}>
                    {activeStudySession.topicName}
                  </Text>
                  <ActiveTimer startedAt={activeStudySession.startedAt} style={{ fontSize: 15, color: theme.learning }} />
                </View>
                <TouchableOpacity
                  onPress={() => router.push(`/topic/${activeStudySession.topicId}` as any)}
                  style={{ paddingHorizontal: SPACING.md, paddingVertical: 10, backgroundColor: theme.learning, borderRadius: RADIUS.full }}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Continue</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>
        )}

        {/* 3. Today's Study */}
        <SectionHeader title="Today's Study" />
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/todays-study')} style={{ marginBottom: SPACING.xl }}>
          <GlassCard style={{ padding: SPACING.lg, backgroundColor: theme.surface }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: SPACING.md }}>
              <View>
                <Text style={{ color: theme.primaryText, fontSize: 32, fontWeight: '800', letterSpacing: -1 }}>
                  {formatDuration(studyStats?.todayStudySeconds || 0)} <Text style={{ fontSize: 18, color: theme.tertiaryText }}>/ {dailyTargetHours}h</Text>
                </Text>
              </View>
              <Text style={{ color: theme.accent, fontSize: 18, fontWeight: '700' }}>
                {todayProgress}%
              </Text>
            </View>
            <ProgressBar progress={todayProgress} height={8} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md }}>
              <Text style={{ fontSize: 16, marginRight: 6 }}>🔥</Text>
              <Text style={{ color: theme.secondaryText, fontSize: 14, fontWeight: '600' }}>
                {studyStats?.currentStreak || 0} day streak
              </Text>
            </View>
          </GlassCard>
        </TouchableOpacity>

        {/* 4. Recent Subjects */}
        <SectionHeader title="Recent Subjects" />
        {recentSubjects && recentSubjects.length > 0 ? (
          <View style={{ gap: SPACING.sm, marginBottom: SPACING.xl }}>
            {recentSubjects.map((subject: any) => (
              <GlassCard
                key={subject.subjectId}
                style={{ padding: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                onPress={() => router.push('/(tabs)/curriculum')}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.primaryText, fontSize: 16, fontWeight: '700' }}>{subject.subjectName}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.tertiaryText} />
              </GlassCard>
            ))}
          </View>
        ) : (
          <GlassCard style={{ padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.xl }}>
            <Text style={{ color: theme.secondaryText, textAlign: 'center', fontSize: 14 }}>
              No study sessions yet.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/curriculum')}
              style={{ marginTop: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 6, backgroundColor: theme.surfaceHighlight, borderRadius: RADIUS.full }}
            >
              <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600' }}>Browse Curriculum</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* 5. Curriculum Progress with Dual Metrics */}
        <SectionHeader title="Curriculum Progress" actionTitle="View all" onAction={() => router.push('/(tabs)/curriculum')} />
        <Text style={{ color: theme.secondaryText, fontSize: 14, marginBottom: SPACING.sm }}>
          {overallCompletedSubjects} / {totalSubjectsCount} subjects completed
        </Text>
        
        <View style={{ gap: SPACING.sm, marginBottom: SPACING.xl }}>
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

        {/* 6. Today's Revision (M17 Topic Spaced Repetition) */}
        <SectionHeader title="Today's Revision" actionTitle="View all" onAction={() => router.push('/(tabs)/revision')} />
        {activeRevisions && activeRevisions.length > 0 ? (
          <View style={{ gap: SPACING.sm, marginBottom: SPACING.xl }}>
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
          <GlassCard style={{ padding: SPACING.md, marginBottom: SPACING.xl }}>
            <Text style={{ color: theme.secondaryText, textAlign: 'center' }}>No revisions due today</Text>
          </GlassCard>
        )}

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
