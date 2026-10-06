import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { Screen, GlassCard, PrimaryButton, COLORS, SPACING } from '../../components/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import { getApiOrigin } from '../../lib/api-url';

export default function Revision() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRevisionStats();
  }, []);

  const loadRevisionStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const origin = getApiOrigin();
      const headers = { 'Authorization': `Bearer ${session.access_token}` };
      
      const res = await fetch(`${origin}/api/dashboard`, { headers });
      const data = await res.json();

      if (data.error) throw new Error(data.error);
      
      setStats(data.revisionStats);
    } catch (err: any) {
      setError(err.message || 'Failed to load revisions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </Screen>
    );
  }

  const overdueCount = stats?.overdueCount || 0;
  const dueTodayCount = stats?.dueTodayCount || 0;
  const upcomingCount = stats?.upcomingCount || 0;
  const totalActionable = overdueCount + dueTodayCount;

  return (
    <Screen noPadding>
      <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.xl, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface }}>
        <Text style={{ fontSize: 34, fontWeight: '800', color: COLORS.primaryText, letterSpacing: -0.5 }}>Revision</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl, gap: SPACING.lg }}>
        
        {totalActionable > 0 ? (
          <GlassCard style={{ padding: SPACING.lg, borderColor: overdueCount > 0 ? COLORS.critical : COLORS.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
              <Ionicons name="repeat" size={28} color={overdueCount > 0 ? COLORS.critical : COLORS.accent} />
              <View style={{ marginLeft: SPACING.md }}>
                <Text style={{ color: COLORS.primaryText, fontSize: 24, fontWeight: '800' }}>{totalActionable} Due</Text>
                <Text style={{ color: COLORS.secondaryText, fontSize: 15, marginTop: 2 }}>
                  {overdueCount > 0 ? `${overdueCount} overdue` : 'Clear for today'}
                </Text>
              </View>
            </View>
            <PrimaryButton 
              title="START REVISION" 
              onPress={() => router.push('/mcq')} 
            />
          </GlassCard>
        ) : (
          <GlassCard style={{ padding: SPACING.xl, alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.surfaceHighlight, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md }}>
              <Ionicons name="checkmark-done" size={32} color={COLORS.success} />
            </View>
            <Text style={{ color: COLORS.primaryText, fontSize: 20, fontWeight: '700', marginBottom: SPACING.xs }}>You're all caught up!</Text>
            <Text style={{ color: COLORS.secondaryText, fontSize: 15, textAlign: 'center' }}>No revisions due right now. Enjoy your day or practice new topics.</Text>
          </GlassCard>
        )}

        <View style={{ flexDirection: 'row', gap: SPACING.md }}>
          <GlassCard style={{ flex: 1, padding: SPACING.md }}>
            <Text style={{ color: COLORS.secondaryText, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: SPACING.xs }}>Due Today</Text>
            <Text style={{ color: COLORS.primaryText, fontSize: 28, fontWeight: '800' }}>{dueTodayCount}</Text>
          </GlassCard>
          <GlassCard style={{ flex: 1, padding: SPACING.md }}>
            <Text style={{ color: COLORS.secondaryText, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: SPACING.xs }}>Upcoming</Text>
            <Text style={{ color: COLORS.primaryText, fontSize: 28, fontWeight: '800' }}>{upcomingCount}</Text>
          </GlassCard>
        </View>
      </ScrollView>
    </Screen>
  );
}
