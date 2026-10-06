import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { router, Stack } from 'expo-router';
import { getApiOrigin } from '../lib/api-url';
import { Screen, GlassCard, SPACING, RADIUS } from '../components/DesignSystem';
import { StudyAnalytics } from '../components/StudyAnalytics';
import { useTheme } from '../theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';

export default function TodaysStudy() {
  const { theme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    loadTodayStudy();
  }, []);

  const loadTodayStudy = async () => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const origin = getApiOrigin();
      const headers = { 'Authorization': `Bearer ${session.access_token}` };
      const currentDate = new Date();
      const tzOffset = currentDate.getTimezoneOffset();
      const clientDateStr = currentDate.toLocaleDateString('en-CA');
      
      const res = await fetch(`${origin}/api/study-activity?clientDate=${clientDateStr}&tzOffset=${tzOffset}`, { headers });
      const result = await res.json();

      if (result.error) throw new Error(result.error);
      
      setData(result.today);

      // Also load streak from dashboard
      try {
        const dashRes = await fetch(`${origin}/api/dashboard?clientDate=${clientDateStr}&tzOffset=${tzOffset}`, { headers });
        const dashJson = await dashRes.json();
        setCurrentStreak(dashJson.studyStats?.currentStreak || 0);
      } catch {
        // non-critical
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load study activity');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0 min';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  };

  if (loading) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }} tabIndex={-1}>
        <Stack.Screen options={{ title: "Today's Study", headerBackTitle: 'Home' }} />
        <ActivityIndicator size="large" color={theme.accent} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }} tabIndex={-1}>
        <Stack.Screen options={{ title: "Today's Study", headerBackTitle: 'Home' }} />
        <Text style={{ color: theme.critical, marginBottom: SPACING.md }}>{error}</Text>
        <TouchableOpacity onPress={loadTodayStudy} style={{ backgroundColor: theme.primaryText, padding: SPACING.md, borderRadius: RADIUS.full }}>
          <Text style={{ color: theme.background, fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  const currentDateStr = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <Screen noPadding tabIndex={-1}>
      <Stack.Screen options={{ title: "Today's Study", headerBackTitle: 'Home', headerStyle: { backgroundColor: theme.background }, headerTintColor: theme.primaryText }} />
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl }}>
        
        <View style={{ marginBottom: SPACING.xl, alignItems: 'center', paddingVertical: SPACING.md }}>
          <Text style={{ color: theme.secondaryText, fontSize: 14, fontWeight: '600', textTransform: 'uppercase', marginBottom: SPACING.sm }}>
            {currentDateStr}
          </Text>
          <Text style={{ color: theme.primaryText, fontSize: 36, fontWeight: '800', letterSpacing: -1 }}>
            {formatDuration(data?.totalSeconds || 0)}
          </Text>
          <Text style={{ color: theme.tertiaryText, fontSize: 14, marginTop: 4 }}>
            Total Studied
          </Text>
        </View>

        <Text style={{ color: theme.primaryText, fontSize: 18, fontWeight: '700', marginBottom: SPACING.md }}>
          Study Sessions
        </Text>

        {data?.sessions && data.sessions.length > 0 ? (
          <View style={{ gap: SPACING.sm }}>
            {data.sessions.map((session: any) => (
              <GlassCard key={session.sessionId} style={{ padding: SPACING.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm }}>
                  <View style={{ flex: 1, paddingRight: SPACING.md }}>
                    <Text style={{ color: theme.tertiaryText, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 }}>
                      {session.subjectName}
                    </Text>
                    <Text style={{ color: theme.primaryText, fontSize: 16, fontWeight: '700' }}>
                      {session.topicName}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: theme.surfaceHighlight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm }}>
                    <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '700' }}>
                      {formatDuration(session.durationSeconds)}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="time-outline" size={14} color={theme.secondaryText} style={{ marginRight: 4 }} />
                  <Text style={{ color: theme.secondaryText, fontSize: 13, fontWeight: '500' }}>
                    {formatTime(session.startedAt)} — {formatTime(session.endedAt)}
                  </Text>
                </View>
              </GlassCard>
            ))}
          </View>
        ) : (
          <GlassCard style={{ padding: SPACING.xl, alignItems: 'center' }}>
            <Ionicons name="book-outline" size={32} color={theme.surfaceHighlight} style={{ marginBottom: SPACING.sm }} />
            <Text style={{ color: theme.secondaryText, fontSize: 15, textAlign: 'center' }}>
              No completed sessions today.
            </Text>
          </GlassCard>
        )}

        {/* Study Analytics + Calendar */}
        <View style={{ marginTop: SPACING.xl }}>
          <StudyAnalytics currentStreak={currentStreak} />
        </View>
      </ScrollView>
    </Screen>
  );
}