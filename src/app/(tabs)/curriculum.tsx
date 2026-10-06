import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, LayoutAnimation, UIManager, Platform, TextInput, Animated, Easing, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { router, useFocusEffect } from 'expo-router';
import { getApiOrigin } from '../../lib/api-url';
import { Screen, GlassCard, ProgressBar, PrimaryButton, SPACING, RADIUS } from '../../components/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Timer Component to prevent parent re-renders
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
    <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
      {h > 0 ? `${pad(h)}:` : ''}{pad(m)}:{pad(s)}
    </Text>
  );
};

// Celebration Overlay Component
const CelebrationOverlay = ({ visible, onAnimationComplete }: { visible: boolean, onAnimationComplete: () => void }) => {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const { theme } = useTheme();

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true })
        ]),
        Animated.delay(1500),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true })
      ]).start(() => {
        scale.setValue(0);
        onAnimationComplete();
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ transform: [{ scale }], opacity, alignItems: 'center' }}>
          <Text style={{ fontSize: 60, marginBottom: SPACING.md }}>🎉</Text>
          <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2 }}>Topic Complete</Text>
        </Animated.View>
      </View>
    </View>
  );
};

export default function Curriculum() {
  const { theme, themeType } = useTheme();

  const [loading, setLoading] = useState(true);
  const [curriculumData, setCurriculumData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  useFocusEffect(
    React.useCallback(() => {
      loadCurriculum();
    }, [])
  );

  const loadCurriculum = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const origin = getApiOrigin();
      const headers = { 'Authorization': `Bearer ${session.access_token}` };
      
      const res = await fetch(`${origin}/api/curriculum`, { headers });
      const data = await res.json();

      if (data.error) throw new Error(data.error);
      
      setCurriculumData(data.curriculum || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load curriculum');
    } finally {
      setLoading(false);
    }
  };

  const handleSessionAction = async (topicId: string, action: 'start' | 'complete' | 'abandon') => {
    try {
      setActionLoading(topicId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const origin = getApiOrigin();
      const headers = { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
      
      const res = await fetch(`${origin}/api/curriculum/topic-session`, { 
        method: 'POST',
        headers,
        body: JSON.stringify({ topicId, action })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (action === 'complete') {
        setCelebrate(true);
      }
      
      // Reload curriculum to get updated statuses silently
      await loadCurriculum();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading && curriculumData.length === 0) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </Screen>
    );
  }

  if (error && curriculumData.length === 0) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: theme.critical, marginBottom: SPACING.md }}>{error}</Text>
        <PrimaryButton title="Retry" onPress={loadCurriculum} />
      </Screen>
    );
  }

  // Calculate overall stats
  let totalTopics = 0;
  let studiedTopics = 0; 
  let allTopicsFlattened: any[] = [];
  
  curriculumData.forEach(sub => {
    totalTopics += sub.topicCount || (sub.topics ? sub.topics.length : 0);
    if (sub.topics) {
      sub.topics.forEach((t: any) => {
        if (t.status === 'COMPLETED' || t.masteryScore > 0 || t.questionCount > 0) studiedTopics++;
        allTopicsFlattened.push({ ...t, subjectName: sub.name });
      });
    }
  });

  const overallProgress = totalTopics > 0 ? Math.round((studiedTopics / totalTopics) * 100) : 0;

  // Filter for Search
  const searchLower = searchQuery.toLowerCase().trim();
  const searchResults = searchLower ? allTopicsFlattened.filter(t => 
    t.name.toLowerCase().includes(searchLower) || 
    t.subjectName.toLowerCase().includes(searchLower)
  ) : [];

  const renderTopic = (topic: any) => {
    const isWorking = actionLoading === topic.id;
    const isCompleted = topic.status === 'COMPLETED' || topic.status === 'MASTERED';
    const isStudying = topic.status === 'IN_PROGRESS';
    const isDue = topic.revisionStatus === 'Due';

    return (
      <TouchableOpacity 
        key={topic.id} 
        onPress={() => router.push(`/topic/${topic.id}` as any)}
        style={{ 
          padding: SPACING.md,
          backgroundColor: themeType === 'colorful' ? theme.surfaceElevated : theme.surfaceHighlight,
          borderTopWidth: 1,
          borderTopColor: theme.border
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: SPACING.md }}>
            {topic.subjectName && searchLower ? (
              <Text style={{ color: theme.tertiaryText, fontSize: 11, textTransform: 'uppercase', fontWeight: '700', marginBottom: 2 }}>{topic.subjectName}</Text>
            ) : null}
            <Text style={{ color: theme.primaryText, fontSize: 16, fontWeight: '600', marginBottom: 4 }}>{topic.name}</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
              {isCompleted ? (
                <View style={{ backgroundColor: theme.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Completed</Text>
                </View>
              ) : isStudying ? (
                <View style={{ backgroundColor: theme.learning, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginRight: 4 }}>Studying</Text>
                  {topic.sessionStartedAt && <ActiveTimer startedAt={topic.sessionStartedAt} />}
                </View>
              ) : (
                <View style={{ backgroundColor: theme.tertiaryText, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Not Started</Text>
                </View>
              )}
              {isDue && (
                <View style={{ backgroundColor: theme.revision, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Revision Due</Text>
                </View>
              )}
            </View>
            
            <Text style={{ color: theme.tertiaryText, fontSize: 13 }}>
              Mastery: {topic.masteryScore}% • Questions: {topic.questionCount}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.tertiaryText} style={{ marginTop: 2 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Screen noPadding>
      <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.xl, paddingBottom: SPACING.sm, backgroundColor: theme.surface }}>
        <Text style={{ fontSize: 34, fontWeight: '800', color: theme.primaryText, letterSpacing: -0.5, marginBottom: SPACING.md }}>Curriculum</Text>
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          backgroundColor: theme.surfaceHighlight, 
          borderRadius: RADIUS.lg,
          paddingHorizontal: SPACING.sm,
          height: 44,
          marginBottom: SPACING.sm
        }}>
          <Ionicons name="search" size={20} color={theme.tertiaryText} style={{ marginRight: SPACING.xs }} />
          <TextInput 
            style={{ flex: 1, color: theme.primaryText, fontSize: 16 }}
            placeholder="Search subjects and topics..."
            placeholderTextColor={theme.tertiaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.tertiaryText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl }}>
        
        {!searchLower ? (
          <>
            <View style={{ marginBottom: SPACING.lg }}>
              <Text style={{ color: theme.secondaryText, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: SPACING.xs }}>Your MBBS Curriculum</Text>
              <Text style={{ color: theme.primaryText, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>{studiedTopics} / {totalTopics} topics studied</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs, marginBottom: SPACING.md }}>
                <Text style={{ color: theme.accent, fontSize: 16, fontWeight: '700', marginRight: SPACING.sm }}>{overallProgress}%</Text>
                <ProgressBar progress={overallProgress} height={6} />
              </View>
            </View>

            {curriculumData.map((subject: any) => {
              const isExpanded = expandedId === subject.id;
              
              let subStudied = 0;
              if (subject.topics) {
                subject.topics.forEach((t: any) => {
                  if (t.status === 'COMPLETED' || t.masteryScore > 0 || t.questionCount > 0) subStudied++;
                });
              }

              return (
                <GlassCard key={subject.id} style={{ marginBottom: SPACING.md, padding: 0, overflow: 'hidden' }}>
                  <TouchableOpacity onPress={() => toggleExpand(subject.id)} style={{ padding: SPACING.lg }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs }}>
                      <Text style={{ color: theme.primaryText, fontSize: 18, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>{subject.name}</Text>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={24} color={theme.tertiaryText} />
                    </View>
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: SPACING.sm }}>
                      <View>
                        <Text style={{ color: theme.secondaryText, fontSize: 14 }}>{subStudied} / {subject.topicCount} topics studied</Text>
                        <Text style={{ color: theme.tertiaryText, fontSize: 13, marginTop: 2 }}>{subject.completionPercentage}% mastery overall</Text>
                      </View>
                      <Text style={{ color: theme.primaryText, fontSize: 24, fontWeight: '700' }}>{subject.completionPercentage}%</Text>
                    </View>

                    <ProgressBar progress={subject.completionPercentage} height={6} color={theme.accent} />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={{ paddingTop: 0 }}>
                      {subject.topics?.map((topic: any) => renderTopic(topic))}
                      {(!subject.topics || subject.topics.length === 0) && (
                        <View style={{ padding: SPACING.md, backgroundColor: theme.surfaceHighlight, borderTopWidth: 1, borderTopColor: theme.border }}>
                          <Text style={{ color: theme.secondaryText }}>No topics available.</Text>
                        </View>
                      )}
                    </View>
                  )}
                </GlassCard>
              );
            })}
          </>
        ) : (
          <View>
            <Text style={{ color: theme.secondaryText, fontSize: 14, fontWeight: '600', textTransform: 'uppercase', marginBottom: SPACING.md }}>
              Search Results ({searchResults.length})
            </Text>
            {searchResults.length > 0 ? (
              <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
                {searchResults.map(topic => renderTopic(topic))}
              </GlassCard>
            ) : (
              <View style={{ alignItems: 'center', marginTop: SPACING.xl }}>
                <Ionicons name="search" size={48} color={theme.surfaceHighlight} style={{ marginBottom: SPACING.sm }} />
                <Text style={{ color: theme.secondaryText, fontSize: 16 }}>No topics found for "{searchQuery}"</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <CelebrationOverlay visible={celebrate} onAnimationComplete={() => setCelebrate(false)} />
    </Screen>
  );
}
