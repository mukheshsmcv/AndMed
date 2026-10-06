import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';
import { router, useFocusEffect } from 'expo-router';
import { Screen, GlassCard, PrimaryButton, SPACING, RADIUS } from '../../components/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import { getApiOrigin } from '../../lib/api-url';
import { useTheme } from '../../theme/ThemeProvider';

export default function Revision() {
  const { theme, themeType } = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadRevisions();
    }, [])
  );

  const loadRevisions = async () => {
    try {
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      
      const origin = getApiOrigin();
      const headers = { 'Authorization': `Bearer ${session.access_token}` };
      
      const res = await fetch(`${origin}/api/revisions`, { headers });
      const result = await res.json();

      if (result.error) throw new Error(result.error);
      
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load revisions');
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

  const topicRevisions = data?.topicRevisions;
  const overdueList = topicRevisions?.overdue || [];
  const dueTodayList = topicRevisions?.dueToday || [];
  const upcomingList = topicRevisions?.upcoming || [];
  const completedList = topicRevisions?.completed || [];
  const totalActive = topicRevisions?.totalActive || 0;
  const totalDueNow = overdueList.length + dueTodayList.length;

  return (
    <Screen noPadding tabIndex={3}>
      {/* Title Header */}
      <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.xl, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface }}>
        <Text style={{ fontSize: 34, fontWeight: '800', color: theme.primaryText, letterSpacing: -0.5 }}>Revision</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl, gap: SPACING.lg }}>
        
        {/* Top Status Card */}
        {totalDueNow > 0 ? (
          <GlassCard style={{ padding: SPACING.lg, borderColor: overdueList.length > 0 ? theme.critical : theme.accent }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
              <Ionicons name="repeat" size={28} color={overdueList.length > 0 ? theme.critical : theme.accent} />
              <View style={{ marginLeft: SPACING.md }}>
                <Text style={{ color: theme.primaryText, fontSize: 24, fontWeight: '800' }}>{totalDueNow} Revisions Due</Text>
                <Text style={{ color: theme.secondaryText, fontSize: 15, marginTop: 2 }}>
                  {overdueList.length > 0 ? `${overdueList.length} overdue, ${dueTodayList.length} due today` : 'Ready to review'}
                </Text>
              </View>
            </View>
            {overdueList.length > 0 && (
              <PrimaryButton 
                title={`START OVERDUE (${overdueList[0].topicName})`}
                onPress={() => router.push(`/topic/${overdueList[0].topicId}` as any)} 
              />
            )}
          </GlassCard>
        ) : (
          <GlassCard style={{ padding: SPACING.xl, alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.surfaceHighlight, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md }}>
              <Ionicons name="checkmark-done" size={32} color={theme.success} />
            </View>
            <Text style={{ color: theme.primaryText, fontSize: 20, fontWeight: '700', marginBottom: SPACING.xs }}>You're all caught up!</Text>
            <Text style={{ color: theme.secondaryText, fontSize: 15, textAlign: 'center' }}>
              {upcomingList.length > 0 
                ? 'No revisions due today. Next spaced revision is scheduled.' 
                : 'Your first topic revision will appear after you complete a topic.'}
            </Text>
          </GlassCard>
        )}

        {/* Metric Summary Counters */}
        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          <GlassCard style={{ flex: 1, padding: SPACING.md }}>
            <Text style={{ color: overdueList.length > 0 ? theme.critical : theme.secondaryText, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: SPACING.xs }}>Overdue</Text>
            <Text style={{ color: overdueList.length > 0 ? theme.critical : theme.primaryText, fontSize: 24, fontWeight: '800' }}>{overdueList.length}</Text>
          </GlassCard>
          <GlassCard style={{ flex: 1, padding: SPACING.md }}>
            <Text style={{ color: dueTodayList.length > 0 ? theme.accent : theme.secondaryText, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: SPACING.xs }}>Due Today</Text>
            <Text style={{ color: dueTodayList.length > 0 ? theme.accent : theme.primaryText, fontSize: 24, fontWeight: '800' }}>{dueTodayList.length}</Text>
          </GlassCard>
          <GlassCard style={{ flex: 1, padding: SPACING.md }}>
            <Text style={{ color: theme.secondaryText, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: SPACING.xs }}>Upcoming</Text>
            <Text style={{ color: theme.primaryText, fontSize: 24, fontWeight: '800' }}>{upcomingList.length}</Text>
          </GlassCard>
        </View>

        {/* Section 1: Overdue Revisions */}
        {overdueList.length > 0 && (
          <View>
            <Text style={{ color: theme.critical, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: SPACING.sm, marginLeft: SPACING.xs }}>
              ⚠️ Overdue Revisions
            </Text>
            <View style={{ gap: SPACING.sm }}>
              {overdueList.map((item: any) => (
                <GlassCard key={item.id} style={{ padding: SPACING.md, borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Text style={{ color: theme.tertiaryText, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>
                          {item.subjectName}
                        </Text>
                        <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '600' }}>
                          • {item.intervalDays}d revision
                        </Text>
                      </View>
                      <Text style={{ color: theme.primaryText, fontSize: 17, fontWeight: '700' }}>{item.topicName}</Text>
                      <Text style={{ color: theme.critical, fontSize: 13, fontWeight: '600', marginTop: 4 }}>
                        {item.daysOverdue} {item.daysOverdue === 1 ? 'day' : 'days'} overdue ({item.scheduledFor})
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => router.push(`/topic/${item.topicId}` as any)}
                      style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: theme.surfaceHighlight, borderRadius: RADIUS.full }}
                    >
                      <Text style={{ color: theme.primaryText, fontWeight: '700', fontSize: 13 }}>Start Revision</Text>
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              ))}
            </View>
          </View>
        )}

        {/* Section 2: Due Today */}
        {dueTodayList.length > 0 && (
          <View>
            <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: SPACING.sm, marginLeft: SPACING.xs }}>
              🎯 Today's Spaced Revisions
            </Text>
            <View style={{ gap: SPACING.sm }}>
              {dueTodayList.map((item: any) => (
                <GlassCard key={item.id} style={{ padding: SPACING.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Text style={{ color: theme.tertiaryText, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>
                          {item.subjectName}
                        </Text>
                        <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '600' }}>
                          • {item.intervalDays}d revision
                        </Text>
                      </View>
                      <Text style={{ color: theme.primaryText, fontSize: 17, fontWeight: '700' }}>{item.topicName}</Text>
                      <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600', marginTop: 4 }}>
                        Due today ({item.scheduledFor})
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => router.push(`/topic/${item.topicId}` as any)}
                      style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: theme.surfaceHighlight, borderRadius: RADIUS.full }}
                    >
                      <Text style={{ color: theme.primaryText, fontWeight: '700', fontSize: 13 }}>Start Revision</Text>
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              ))}
            </View>
          </View>
        )}

        {/* Section 3: Upcoming Revisions */}
        {upcomingList.length > 0 && (
          <View>
            <Text style={{ color: theme.secondaryText, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: SPACING.sm, marginLeft: SPACING.xs }}>
              📅 Upcoming Spaced Revisions
            </Text>
            <View style={{ gap: SPACING.sm }}>
              {upcomingList.map((item: any) => (
                <GlassCard key={item.id} style={{ padding: SPACING.md }} onPress={() => router.push(`/topic/${item.topicId}` as any)}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Text style={{ color: theme.tertiaryText, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>
                          {item.subjectName}
                        </Text>
                        <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '600' }}>
                          • {item.intervalDays}d interval
                        </Text>
                      </View>
                      <Text style={{ color: theme.primaryText, fontSize: 16, fontWeight: '600' }}>{item.topicName}</Text>
                      <Text style={{ color: theme.secondaryText, fontSize: 13, marginTop: 4 }}>
                        Due in {item.daysUntil} {item.daysUntil === 1 ? 'day' : 'days'} ({item.scheduledFor})
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.tertiaryText} />
                  </View>
                </GlassCard>
              ))}
            </View>
          </View>
        )}

        {/* Section 4: Question Revision (Dormant/Preserved) */}
        <View style={{ marginTop: SPACING.sm }}>
          <Text style={{ color: theme.tertiaryText, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: SPACING.xs, marginLeft: SPACING.xs }}>
            Question-Level Revision (Decoupled)
          </Text>
          <GlassCard style={{ padding: SPACING.md, backgroundColor: theme.surfaceHighlight }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="information-circle-outline" size={20} color={theme.tertiaryText} style={{ marginRight: SPACING.sm }} />
              <Text style={{ color: theme.secondaryText, fontSize: 13, flex: 1 }}>
                Question-level adaptive revision operates independently from topic study spaced repetition.
              </Text>
            </View>
          </GlassCard>
        </View>

      </ScrollView>
    </Screen>
  );
}
