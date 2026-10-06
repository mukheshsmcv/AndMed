import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { getApiOrigin } from '../../lib/api-url';
import { Screen, SectionHeader, GlassCard, ProgressRing, ProgressBar, PrimaryButton, ExamCountdown, TimelineItem, SPACING, RADIUS } from '../../components/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import { EXAM_TARGETS, CURRENT_EXAM_ID, getExamCountdown } from '../../config/exam';
import { useTheme } from '../../theme/ThemeProvider';

export default function Home() {
  const { theme, themeType } = useTheme();

  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [missionData, setMissionData] = useState<any>(null);
  const [curriculumData, setCurriculumData] = useState<any>(null);
  const [revisionStats, setRevisionStats] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
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
      setMetadata(session.user.user_metadata || {});
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

  const isNewUser = performanceData?.totalQuestionsAttempted < 5;
  const readinessValue = isNewUser ? 10 : (performanceData?.readinessScore || 0);

  const topSubjects = curriculumData?.slice(0, 4) || [];
  
  const currentExamId = metadata?.target_exam || CURRENT_EXAM_ID;
  const target = EXAM_TARGETS[currentExamId] || EXAM_TARGETS[CURRENT_EXAM_ID];
  const countdown = getExamCountdown(target);

  const totalActionableRevision = (revisionStats?.overdueCount || 0) + (revisionStats?.dueTodayCount || 0);

  const greeting = new Date().getHours() < 12 ? 'GOOD MORNING' : new Date().getHours() < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
  const userName = metadata?.name || metadata?.institution ? (metadata.name || 'DOC') : 'DOC';

  return (
    <Screen noPadding>
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl }}>
        
        <View style={{ marginBottom: SPACING.md, marginTop: SPACING.sm }}>
          <Text style={{ color: theme.secondaryText, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>{greeting}, {userName}</Text>
        </View>

        {/* Exam Target Header */}
        <ExamCountdown target={target} countdown={countdown} />

        {/* Readiness Section */}
        <SectionHeader title="Exam Readiness" />
        <GlassCard style={{ alignItems: 'center', paddingVertical: SPACING.xl, marginBottom: SPACING.lg }}>
          <ProgressRing progress={isNewUser ? 0 : readinessValue} size={140} strokeWidth={8} color={isNewUser ? theme.border : theme.accent}>
            <Text style={{ color: theme.primaryText, fontSize: 48, fontWeight: '800', letterSpacing: -1 }}>
              {readinessValue}
            </Text>
          </ProgressRing>
          <Text style={{ color: theme.primaryText, fontSize: 16, fontWeight: '600', marginTop: SPACING.md }}>
            {isNewUser ? 'Baseline establishing' : 'Internal readiness metric'}
          </Text>
          <Text style={{ color: theme.secondaryText, fontSize: 14, marginTop: 4, textAlign: 'center' }}>
            {isNewUser ? 'Complete your first mission to establish your baseline.' : 'Based on mastery, accuracy, and practice.'}
          </Text>
        </GlassCard>

        {/* Today's Mission */}
        <SectionHeader title="Today's Mission" />
        <GlassCard style={{ padding: SPACING.lg, backgroundColor: themeType === 'colorful' ? theme.learning : theme.surface }}>
          <Text style={{ color: themeType === 'colorful' ? '#FFF' : theme.primaryText, fontSize: 22, fontWeight: '700', marginBottom: 2 }}>
            {missionData?.nextAction?.title || 'Build your baseline'}
          </Text>
          <Text style={{ color: themeType === 'colorful' ? 'rgba(255,255,255,0.8)' : theme.secondaryText, fontSize: 15, marginBottom: SPACING.md }}>
            {missionData?.progress?.completedCount || 0} / {missionData?.target?.dailyQuestionTarget || 25} questions • ~15 min
          </Text>
          <PrimaryButton 
            title={missionData?.nextAction?.actionType === 'COMPLETE' ? 'CONTINUE ANYWAY' : 'START MISSION'} 
            onPress={() => router.push('/mcq')} 
          />
        </GlassCard>

        {/* Continue Studying (Simulated best-guess from recent activity, as there isn't a direct API for last studied topic yet) */}
        {topSubjects.length > 0 && topSubjects[0].topics && topSubjects[0].topics.length > 0 && (
          <>
            <SectionHeader title="Continue Studying" />
            <GlassCard style={{ padding: SPACING.md, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.tertiaryText, fontSize: 13, textTransform: 'uppercase', fontWeight: '600', marginBottom: 2 }}>{topSubjects[0].name}</Text>
                <Text style={{ color: theme.primaryText, fontSize: 18, fontWeight: '700' }}>{topSubjects[0].topics[0].name}</Text>
                <Text style={{ color: theme.secondaryText, fontSize: 14, marginTop: 2 }}>{topSubjects[0].topics[0].masteryScore}% mastery</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/curriculum')} style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: theme.surfaceHighlight, borderRadius: RADIUS.full }}>
                <Text style={{ color: theme.accent, fontWeight: '600' }}>Continue</Text>
              </TouchableOpacity>
            </GlassCard>
          </>
        )}

        {/* Review Today */}
        <SectionHeader title="Review Today" />
        <GlassCard style={{ padding: SPACING.md, backgroundColor: themeType === 'colorful' ? theme.revision : theme.surface }}>
          {totalActionableRevision > 0 ? (
            <View>
              <Text style={{ color: themeType === 'colorful' ? '#FFF' : theme.primaryText, fontSize: 18, fontWeight: '700', marginBottom: SPACING.sm }}>
                {totalActionableRevision} topics due
              </Text>
              <TimelineItem title="Revision Session" subtitle={`${totalActionableRevision} items need your attention`} isToday={true} />
              <TouchableOpacity onPress={() => router.push('/(tabs)/revision')} style={{ marginTop: SPACING.sm }}>
                <Text style={{ color: themeType === 'colorful' ? '#FFF' : theme.accent, fontWeight: '600', fontSize: 15 }}>Start Revision →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={{ color: themeType === 'colorful' ? '#FFF' : theme.primaryText, fontSize: 18, fontWeight: '700', marginBottom: 4 }}>
                You're clear for today.
              </Text>
              <Text style={{ color: themeType === 'colorful' ? 'rgba(255,255,255,0.8)' : theme.secondaryText, fontSize: 14 }}>
                Next review: {revisionStats?.upcomingCount > 0 ? 'Tomorrow' : 'None scheduled'}
              </Text>
            </View>
          )}
        </GlassCard>

        {/* Subjects Preview */}
        <SectionHeader title="Curriculum Progress" actionTitle="View all" onAction={() => router.push('/(tabs)/curriculum')} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginHorizontal: -SPACING.xs }}>
          {topSubjects.length > 0 ? topSubjects.map((sub: any) => {
            let cardColor = theme.surface;
            if (themeType === 'colorful') {
              if (sub.completionPercentage > 80) cardColor = theme.success;
              else if (sub.completionPercentage > 50) cardColor = theme.learning;
              else if (sub.completionPercentage > 20) cardColor = theme.warning;
              else cardColor = theme.surfaceElevated;
            }
            
            return (
            <TouchableOpacity key={sub.id} style={{ width: '50%', padding: SPACING.xs }} onPress={() => router.push('/(tabs)/curriculum')}>
              <View style={{ backgroundColor: cardColor, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: themeType === 'colorful' ? 0 : 1, borderColor: theme.border }}>
                <Text style={{ color: themeType === 'colorful' && sub.completionPercentage > 20 ? '#FFF' : theme.primaryText, fontSize: 16, fontWeight: '600', marginBottom: SPACING.sm }} numberOfLines={1}>
                  {sub.name}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs }}>
                  <Text style={{ color: themeType === 'colorful' && sub.completionPercentage > 20 ? 'rgba(255,255,255,0.9)' : theme.secondaryText, fontSize: 12 }}>{sub.completionPercentage || 0}%</Text>
                </View>
                <ProgressBar progress={sub.completionPercentage || 0} height={4} color={themeType === 'colorful' ? '#FFF' : theme.accent} />
              </View>
            </TouchableOpacity>
          )}) : (
            <Text style={{ color: theme.secondaryText, paddingHorizontal: SPACING.xs }}>No subjects loaded yet.</Text>
          )}
        </View>

        {/* Needs Attention */}
        <SectionHeader title="Needs Attention" />
        {performanceData?.recommendedFocus ? (
          <GlassCard style={{ flexDirection: 'row', alignItems: 'center', padding: SPACING.md, backgroundColor: themeType === 'colorful' ? theme.critical : theme.surface }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: themeType === 'colorful' ? '#FFF' : theme.primaryText, fontSize: 18, fontWeight: '700' }}>{performanceData.recommendedFocus.name}</Text>
              <Text style={{ color: themeType === 'colorful' ? 'rgba(255,255,255,0.8)' : theme.secondaryText, fontSize: 14, marginTop: 2 }}>Critical weakness in {performanceData.recommendedFocus.subjectName}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/mcq')} style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: themeType === 'colorful' ? 'rgba(255,255,255,0.2)' : theme.surfaceHighlight, borderRadius: RADIUS.full }}>
              <Text style={{ color: themeType === 'colorful' ? '#FFF' : theme.accent, fontWeight: '600' }}>Practice</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : (
          <GlassCard style={{ padding: SPACING.md }}>
            <Text style={{ color: theme.secondaryText, textAlign: 'center' }}>Complete more questions to identify your weak areas.</Text>
          </GlassCard>
        )}

        {/* Recent Performance Summary */}
        <SectionHeader title="Recent Performance" />
        <View style={{ flexDirection: 'row', gap: SPACING.md }}>
          <GlassCard style={{ flex: 1, padding: SPACING.md }}>
            <Text style={{ color: theme.secondaryText, fontSize: 13, fontWeight: '600', marginBottom: SPACING.sm }}>Accuracy</Text>
            <Text style={{ color: theme.primaryText, fontSize: 32, fontWeight: '800', letterSpacing: -1 }}>{performanceData?.overallAccuracy || 0}%</Text>
          </GlassCard>
          <GlassCard style={{ flex: 1, padding: SPACING.md }}>
            <Text style={{ color: theme.secondaryText, fontSize: 13, fontWeight: '600', marginBottom: SPACING.sm }}>Questions</Text>
            <Text style={{ color: theme.primaryText, fontSize: 32, fontWeight: '800', letterSpacing: -1 }}>{performanceData?.totalQuestionsAttempted || 0}</Text>
          </GlassCard>
        </View>

      </ScrollView>
    </Screen>
  );
}
