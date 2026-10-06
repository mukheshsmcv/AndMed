import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams, router, Stack, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getApiOrigin } from '../../lib/api-url';
import { Screen, GlassCard, PrimaryButton, ActiveTimer, SPACING, RADIUS } from '../../components/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';

export default function TopicDetail() {
  const { id } = useLocalSearchParams();
  const { theme, themeType } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Local-first active session & completion state for instant UI responsiveness
  const [activeSession, setActiveSession] = useState<any>(null);
  const [isTopicCompleted, setIsTopicCompleted] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      if (id) loadTopicDetails();
    }, [id])
  );

  const loadTopicDetails = async () => {
    try {
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      
      const origin = getApiOrigin();
      const headers = { 'Authorization': `Bearer ${session.access_token}` };
      
      const res = await fetch(`${origin}/api/curriculum/topic/${id}`, { headers });
      const result = await res.json();

      if (result.error) throw new Error(result.error);
      
      setData(result);
      const active = result.sessions?.find((s: any) => s.status === 'ACTIVE');
      setActiveSession(active || null);
      setIsTopicCompleted(result.progress?.status === 'COMPLETED');
    } catch (err: any) {
      setError(err.message || 'Failed to load topic details');
    } finally {
      setLoading(false);
    }
  };

  // 1. Local-First Study Session Handler (Start / End Session)
  const handleSessionToggle = async () => {
    if (activeSession) {
      // STOP / COMPLETE SESSION (Instant local-first response)
      const now = new Date();
      const startedAtTime = new Date(activeSession.started_at).getTime();
      const durationSeconds = Math.max(1, Math.floor((now.getTime() - startedAtTime) / 1000));
      
      const completedSessionObj = {
        id: activeSession.id,
        status: 'COMPLETED',
        started_at: activeSession.started_at,
        ended_at: now.toISOString(),
        duration_seconds: durationSeconds
      };

      // Instantly update local UI
      setActiveSession(null);
      if (data) {
        const updatedSessions = [completedSessionObj, ...(data.sessions || []).filter((s: any) => s.id !== activeSession.id)];
        setData({ ...data, sessions: updatedSessions });
      }

      // Persist to backend asynchronously without blocking UI
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authSession) {
          const origin = getApiOrigin();
          await fetch(`${origin}/api/curriculum/topic-session`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authSession.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ topicId: id, action: 'complete', durationSeconds })
          });
        }
      } catch (err: any) {
        console.warn('Background session completion sync failed:', err.message);
      }
    } else {
      // START SESSION (Instant local-first response)
      const nowIso = new Date().toISOString();
      const tempActive = {
        id: `temp-${Date.now()}`,
        status: 'ACTIVE',
        started_at: nowIso
      };

      // Instantly render live timer
      setActiveSession(tempActive);
      if (data) {
        setData({
          ...data,
          sessions: [tempActive, ...(data.sessions || [])]
        });
      }

      // Persist to backend asynchronously without blocking UI
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authSession) {
          const origin = getApiOrigin();
          const res = await fetch(`${origin}/api/curriculum/topic-session`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authSession.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ topicId: id, action: 'start' })
          });
          const result = await res.json();
          if (result?.session) {
            setActiveSession(result.session);
          }
        }
      } catch (err: any) {
        console.warn('Background session start sync failed:', err.message);
      }
    }
  };

  // 2. Explicit Topic Completion Handler (Mark Complete / Unmark Complete)
  const handleCompletionToggle = async () => {
    const newStatus = isTopicCompleted ? 'NOT_STARTED' : 'COMPLETED';
    const nowIso = new Date().toISOString();

    // Instantly update local UI
    setIsTopicCompleted(!isTopicCompleted);
    if (data) {
      setData({
        ...data,
        progress: {
          ...data.progress,
          status: newStatus,
          manually_completed: newStatus === 'COMPLETED',
          manually_completed_at: newStatus === 'COMPLETED' ? nowIso : null
        }
      });
    }

    // Persist to authoritative topic-progress API & trigger M17 Spaced Repetition scheduling
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession) {
        const origin = getApiOrigin();
        await fetch(`${origin}/api/curriculum/topic-progress`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ topicId: id, status: newStatus })
        });
      }
    } catch (err: any) {
      console.warn('Topic completion sync error:', err.message);
    }
  };

  // Helper for gap calculation
  const getGapText = (currentSessionDate: string, prevSessionDate: string | null) => {
    if (!prevSessionDate) return "First study";
    
    const d1 = new Date(currentSessionDate);
    const d2 = new Date(prevSessionDate);
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

  const { topic, mastery, revisionCount, sessions = [] } = data;
  const completedSessions = sessions.filter((s: any) => s.status === 'COMPLETED');
  const totalStudySeconds = completedSessions.reduce((acc: number, s: any) => acc + (s.duration_seconds || 0), 0);
  
  const firstStudiedDate = completedSessions.length > 0 ? completedSessions[completedSessions.length - 1].started_at : null;
  const lastStudiedDate = completedSessions.length > 0 ? completedSessions[0].started_at : null;

  const isStudying = !!activeSession;

  let headerColor = theme.primaryText;
  if (themeType === 'colorful') {
    if (isTopicCompleted) headerColor = theme.success;
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
              backgroundColor: isTopicCompleted ? theme.success : isStudying ? theme.learning : theme.surfaceElevated,
              paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.sm
            }}>
              <Text style={{ color: isTopicCompleted || isStudying ? '#FFF' : theme.secondaryText, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
                {isTopicCompleted ? 'Completed' : isStudying ? 'Studying Now' : 'Not Started'}
              </Text>
            </View>
            
            {activeSession && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.accent }} />
                <ActiveTimer startedAt={activeSession.started_at} />
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons: Instant, Local-First Response */}
        <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg }}>
          <TouchableOpacity 
            onPress={handleSessionToggle}
            style={{ 
              flex: 1, 
              backgroundColor: activeSession ? theme.critical : theme.accent, 
              paddingVertical: 14, 
              borderRadius: RADIUS.md, 
              alignItems: 'center' 
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
              {activeSession ? 'End Study Session' : isTopicCompleted ? 'Study Again' : 'Start Now'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleCompletionToggle}
            style={{ 
              flex: 1, 
              backgroundColor: isTopicCompleted ? 'rgba(16, 185, 129, 0.15)' : theme.surfaceHighlight, 
              borderWidth: 1, 
              borderColor: isTopicCompleted ? theme.success : theme.border, 
              paddingVertical: 14, 
              borderRadius: RADIUS.md, 
              alignItems: 'center' 
            }}
          >
            <Text style={{ color: isTopicCompleted ? theme.success : theme.primaryText, fontSize: 16, fontWeight: '700' }}>
              {isTopicCompleted ? '✓ Completed' : 'Mark Complete'}
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
            <Text style={{ color: isTopicCompleted ? theme.success : theme.primaryText, fontSize: 14, fontWeight: '600' }}>
              {isTopicCompleted ? 'Completed' : 'Not completed'}
            </Text>
          </View>
        </GlassCard>

        {/* Timeline */}
        <Text style={{ color: theme.primaryText, fontSize: 20, fontWeight: '800', letterSpacing: -0.5, marginBottom: SPACING.lg }}>Study History</Text>
        
        {completedSessions.length === 0 && !activeSession ? (
          <View style={{ alignItems: 'center', padding: SPACING.xl }}>
            <Text style={{ color: theme.secondaryText, fontSize: 15 }}>No study sessions yet.</Text>
          </View>
        ) : (
          <View style={{ paddingLeft: SPACING.sm }}>
            {/* Render Active Session at top of history if currently studying */}
            {activeSession && (
              <View style={{ flexDirection: 'row', marginBottom: SPACING.lg }}>
                <View style={{ width: 24, alignItems: 'center' }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: theme.learning, marginTop: 4, zIndex: 2 }} />
                  {completedSessions.length > 0 && (
                    <View style={{ position: 'absolute', top: 16, bottom: -SPACING.lg, width: 2, backgroundColor: theme.border, zIndex: 1 }} />
                  )}
                </View>
                <View style={{ flex: 1, paddingLeft: SPACING.md }}>
                  <Text style={{ color: theme.primaryText, fontSize: 16, fontWeight: '700', marginBottom: 2 }}>Today (Active)</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <View style={{ backgroundColor: theme.learning, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>ACTIVE NOW</Text>
                    </View>
                    <ActiveTimer startedAt={activeSession.started_at} />
                  </View>
                </View>
              </View>
            )}

            {completedSessions.map((session: any, index: number) => {
              const prevSession = index < completedSessions.length - 1 ? completedSessions[index + 1] : null;
              return (
                <View key={session.id}>
                  {/* Session Card */}
                  <View style={{ flexDirection: 'row', marginBottom: SPACING.lg }}>
                    <View style={{ width: 24, alignItems: 'center' }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: theme.accent, marginTop: 4, zIndex: 2 }} />
                      {index < completedSessions.length - 1 && (
                        <View style={{ position: 'absolute', top: 16, bottom: -SPACING.lg, width: 2, backgroundColor: theme.border, zIndex: 1 }} />
                      )}
                    </View>
                    
                    <View style={{ flex: 1, paddingLeft: SPACING.md }}>
                      <Text style={{ color: theme.primaryText, fontSize: 16, fontWeight: '700', marginBottom: 2 }}>{formatDate(session.started_at)}</Text>
                      <Text style={{ color: theme.secondaryText, fontSize: 14, marginBottom: 4 }}>
                        Started {formatTime(session.started_at)} {session.ended_at ? `– ${formatTime(session.ended_at)}` : ''}
                      </Text>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 2 }}>
                        <View style={{ backgroundColor: theme.surfaceHighlight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: theme.border }}>
                          <Text style={{ color: theme.secondaryText, fontSize: 12, fontWeight: '600' }}>Duration: {formatDuration(session.duration_seconds)}</Text>
                        </View>
                        <Text style={{ color: theme.success, fontSize: 12, fontWeight: '600' }}>Session completed</Text>
                      </View>
                    </View>
                  </View>

                  {/* Gap indicator */}
                  {prevSession && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md, paddingLeft: 4 }}>
                      <Ionicons name="arrow-up" size={14} color={theme.tertiaryText} style={{ width: 24, textAlign: 'center' }} />
                      <Text style={{ color: theme.tertiaryText, fontSize: 12, fontWeight: '600', marginLeft: SPACING.sm }}>
                        {getGapText(session.started_at, prevSession.started_at)}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Academic Data (MCQ section preserved dormant) */}
        {mastery && mastery.questions_attempted > 0 && (
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
