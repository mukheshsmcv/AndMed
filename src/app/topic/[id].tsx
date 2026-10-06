import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getApiOrigin } from '../../lib/api-url';
import { Screen, GlassCard, PrimaryButton, SPACING, RADIUS } from '../../components/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';

// Reusing ActiveTimer for active sessions
const ActiveTimer = ({ startedAt }: { startedAt: string }) => {
  const { theme } = useTheme();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  return (
    <Text style={{ color: theme.accent, fontSize: 14, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
      {h > 0 ? `${pad(h)}:` : ''}{pad(m)}:{pad(s)}
    </Text>
  );
};

export default function TopicDetail() {
  const { id } = useLocalSearchParams();
  const { theme, themeType } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) loadTopicDetails();
  }, [id]);

  const loadTopicDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const origin = getApiOrigin();
      const headers = { 'Authorization': `Bearer ${session.access_token}` };
      
      const res = await fetch(`${origin}/api/curriculum/topic/${id}`, { headers });
      const result = await res.json();

      if (result.error) throw new Error(result.error);
      
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load topic details');
    } finally {
      setLoading(false);
    }
  };

  const handleSessionAction = async (action: 'start' | 'complete' | 'abandon') => {
    try {
      setActionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const origin = getApiOrigin();
      const headers = { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
      
      const res = await fetch(`${origin}/api/curriculum/topic-session`, { 
        method: 'POST',
        headers,
        body: JSON.stringify({ topicId: id, action })
      });
      
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      
      await loadTopicDetails();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper for gap
  const getGapText = (currentSessionDate: string, prevSessionDate: string | null) => {
    if (!prevSessionDate) return "First study";
    
    // We only care about calendar dates in local time
    const d1 = new Date(currentSessionDate);
    const d2 = new Date(prevSessionDate);
    
    // Reset to local midnight
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    
    const diffTime = d1.getTime() - d2.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Same day";
    if (diffDays === 1) return "1 day later";
    return `${diffDays} days later`;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0 min';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };
  
  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Stack.Screen options={{ title: 'Loading...', headerStyle: { backgroundColor: theme.background }, headerTintColor: theme.primaryText }} />
        <ActivityIndicator size="large" color={theme.accent} />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Stack.Screen options={{ title: 'Error', headerStyle: { backgroundColor: theme.background }, headerTintColor: theme.primaryText }} />
        <Text style={{ color: theme.critical, marginBottom: SPACING.md }}>{error || 'Topic not found'}</Text>
        <PrimaryButton title="Retry" onPress={loadTopicDetails} />
      </Screen>
    );
  }

  const { topic, progress, mastery, revisionCount, sessions } = data;
  
  const completedSessions = sessions.filter((s: any) => s.status === 'COMPLETED');
  const activeSession = sessions.find((s: any) => s.status === 'ACTIVE');
  
  const totalStudySeconds = completedSessions.reduce((acc: number, s: any) => acc + (s.duration_seconds || 0), 0);
  
  const firstStudiedDate = completedSessions.length > 0 ? completedSessions[completedSessions.length - 1].started_at : null;
  const lastStudiedDate = completedSessions.length > 0 ? completedSessions[0].started_at : null;

  const isCompleted = progress.status === 'COMPLETED';
  const isStudying = progress.status === 'IN_PROGRESS';

  // Sort sessions oldest to newest for chronological timeline
  const chronologicalSessions = [...sessions].reverse();
  
  let headerColor = theme.primaryText;
  if (themeType === 'colorful') {
    if (isCompleted) headerColor = theme.success;
    else if (isStudying) headerColor = theme.learning;
  }

  return (
    <Screen noPadding>
      <Stack.Screen options={{ 
        title: topic.name, 
        headerStyle: { backgroundColor: theme.background }, 
        headerTintColor: theme.primaryText,
        headerBackTitle: 'Back'
      }} />

      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl }}>
        
        {/* Header Section */}
        <View style={{ marginBottom: SPACING.lg }}>
          <Text style={{ color: theme.tertiaryText, fontSize: 13, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>
            {topic.subjectName}
          </Text>
          <Text style={{ color: headerColor, fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginBottom: SPACING.sm }}>
            {topic.name}
          </Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <View style={{ 
              backgroundColor: isCompleted ? theme.success : isStudying ? theme.learning : theme.surfaceElevated,
              paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.sm
            }}>
              <Text style={{ color: isCompleted || isStudying ? '#FFF' : theme.secondaryText, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
                {isCompleted ? 'Completed' : isStudying ? 'In Progress' : 'Not Started'}
              </Text>
            </View>
            
            {activeSession && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.accent }} />
                <ActiveTimer startedAt={activeSession.started_at} />
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg }}>
          <TouchableOpacity 
            disabled={actionLoading}
            onPress={() => handleSessionAction(activeSession ? 'complete' : 'start')}
            style={{ flex: 1, backgroundColor: activeSession ? theme.success : theme.accent, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center', opacity: actionLoading ? 0.7 : 1 }}
          >
            {actionLoading ? <ActivityIndicator color="#FFF" /> : (
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
                {activeSession ? 'Complete Session' : isCompleted ? 'Study Again' : 'Start Now'}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            disabled={actionLoading}
            onPress={() => handleSessionAction(isCompleted ? 'abandon' : 'complete')}
            style={{ flex: 1, backgroundColor: theme.surfaceHighlight, borderWidth: 1, borderColor: theme.border, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center', opacity: actionLoading ? 0.7 : 1 }}
          >
            <Text style={{ color: theme.primaryText, fontSize: 16, fontWeight: '600' }}>
              {isCompleted ? 'Unmark Complete' : 'Mark Complete'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary Grid (Study Focus) */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -SPACING.xs, marginBottom: SPACING.lg }}>
          <View style={{ width: '50%', padding: SPACING.xs }}>
            <GlassCard style={{ padding: SPACING.md }}>
              <Text style={{ color: theme.secondaryText, fontSize: 12, textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 }}>Study Sessions</Text>
              <Text style={{ color: theme.primaryText, fontSize: 24, fontWeight: '700' }}>{completedSessions.length}</Text>
            </GlassCard>
          </View>
          <View style={{ width: '50%', padding: SPACING.xs }}>
            <GlassCard style={{ padding: SPACING.md }}>
              <Text style={{ color: theme.secondaryText, fontSize: 12, textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 }}>Total Time</Text>
              <Text style={{ color: theme.primaryText, fontSize: 24, fontWeight: '700' }}>{formatDuration(totalStudySeconds)}</Text>
            </GlassCard>
          </View>
        </View>

        {/* Milestone Dates */}
        <GlassCard style={{ marginBottom: SPACING.xl, padding: SPACING.md, backgroundColor: themeType === 'colorful' ? theme.surfaceElevated : theme.surface }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Text style={{ color: theme.secondaryText, fontSize: 14 }}>First studied</Text>
            <Text style={{ color: theme.primaryText, fontSize: 14, fontWeight: '500' }}>{firstStudiedDate ? formatDate(firstStudiedDate) : '—'}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Text style={{ color: theme.secondaryText, fontSize: 14 }}>Last studied</Text>
            <Text style={{ color: theme.primaryText, fontSize: 14, fontWeight: '500' }}>{lastStudiedDate ? formatDate(lastStudiedDate) : '—'}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: SPACING.sm }}>
            <Text style={{ color: theme.secondaryText, fontSize: 14 }}>Completed</Text>
            <Text style={{ color: isCompleted ? theme.success : theme.primaryText, fontSize: 14, fontWeight: '600' }}>
              {isCompleted && progress.manually_completed_at ? formatDate(progress.manually_completed_at) : isCompleted ? 'Completed' : 'Not completed'}
            </Text>
          </View>
        </GlassCard>

        {/* Timeline */}
        <Text style={{ color: theme.primaryText, fontSize: 20, fontWeight: '800', letterSpacing: -0.5, marginBottom: SPACING.lg }}>Study History</Text>
        
        {chronologicalSessions.length === 0 ? (
          <View style={{ alignItems: 'center', padding: SPACING.xl }}>
            <Text style={{ color: theme.secondaryText, fontSize: 15 }}>No study sessions yet.</Text>
          </View>
        ) : (
          <View style={{ paddingLeft: SPACING.sm }}>
            {chronologicalSessions.map((session: any, index: number) => {
              // Find previous COMPLETED session
              let prevCompletedDate = null;
              for (let i = index - 1; i >= 0; i--) {
                if (chronologicalSessions[i].status === 'COMPLETED') {
                  prevCompletedDate = chronologicalSessions[i].started_at;
                  break;
                }
              }

              const isFirst = index === 0;
              const isActive = session.status === 'ACTIVE';

              return (
                <View key={session.id}>
                  {/* Gap indicator */}
                  {!isFirst && session.status === 'COMPLETED' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
                      <Ionicons name="arrow-down" size={16} color={theme.tertiaryText} style={{ width: 24, textAlign: 'center' }} />
                      <Text style={{ color: theme.tertiaryText, fontSize: 13, fontWeight: '600', marginLeft: SPACING.sm }}>
                        {getGapText(session.started_at, prevCompletedDate)}
                      </Text>
                    </View>
                  )}

                  {/* Session Card */}
                  <View style={{ flexDirection: 'row', marginBottom: SPACING.lg }}>
                    <View style={{ width: 24, alignItems: 'center' }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: isActive ? theme.learning : theme.accent, marginTop: 4, zIndex: 2 }} />
                      {index < chronologicalSessions.length - 1 && (
                        <View style={{ position: 'absolute', top: 16, bottom: -SPACING.lg - (index === 0 ? 0 : 30), width: 2, backgroundColor: theme.border, zIndex: 1 }} />
                      )}
                    </View>
                    
                    <View style={{ flex: 1, paddingLeft: SPACING.md }}>
                      <Text style={{ color: theme.primaryText, fontSize: 16, fontWeight: '700', marginBottom: 2 }}>{formatDate(session.started_at)}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ color: theme.secondaryText, fontSize: 14 }}>
                          Started {formatTime(session.started_at)}
                          {session.ended_at ? ` – ${formatTime(session.ended_at)}` : ''}
                        </Text>
                      </View>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 2 }}>
                        {isActive ? (
                          <View style={{ backgroundColor: theme.learning, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>ACTIVE NOW</Text>
                          </View>
                        ) : (
                          <View style={{ backgroundColor: theme.surfaceHighlight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: theme.border }}>
                            <Text style={{ color: theme.secondaryText, fontSize: 12, fontWeight: '600' }}>Duration: {formatDuration(session.duration_seconds)}</Text>
                          </View>
                        )}
                        <Text style={{ color: isActive ? theme.learning : theme.success, fontSize: 12, fontWeight: '600' }}>
                          {isActive ? 'Session in progress' : 'Session completed'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Academic Data (Hidden if no evidence) */}
        {mastery.questions_attempted > 0 && (
          <View style={{ marginTop: SPACING.xl }}>
            <Text style={{ color: theme.primaryText, fontSize: 16, fontWeight: '800', letterSpacing: -0.5, marginBottom: SPACING.md, textTransform: 'uppercase' }}>Academic Data</Text>
            <GlassCard style={{ padding: SPACING.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={{ color: theme.secondaryText, fontSize: 14 }}>Questions attempted</Text>
                <Text style={{ color: theme.primaryText, fontSize: 14, fontWeight: '500' }}>{mastery.questions_attempted}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={{ color: theme.secondaryText, fontSize: 14 }}>Accuracy</Text>
                <Text style={{ color: theme.primaryText, fontSize: 14, fontWeight: '500' }}>
                  {mastery.questions_attempted > 0 ? `${Math.round((mastery.correct_attempts / mastery.questions_attempted) * 100)}%` : '—'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={{ color: theme.secondaryText, fontSize: 14 }}>Mastery</Text>
                <Text style={{ color: theme.primaryText, fontSize: 14, fontWeight: '500' }}>{Math.round(mastery.mastery_score)}%</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: SPACING.sm }}>
                <Text style={{ color: theme.secondaryText, fontSize: 14 }}>Revisions</Text>
                <Text style={{ color: theme.primaryText, fontSize: 14, fontWeight: '500' }}>{revisionCount}</Text>
              </View>
            </GlassCard>
          </View>
        )}

      </ScrollView>
    </Screen>
  );
}
