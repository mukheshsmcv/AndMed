import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { getApiOrigin } from '../lib/api-url';
import { GlassCard, SectionHeader, SPACING, RADIUS } from './DesignSystem';
import { useTheme } from '../theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';

export const StudyAnalytics = ({ currentStreak }: { currentStreak: number }) => {
  const { theme } = useTheme();
  
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const [calendarDate, setCalendarDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selectedGraphDay, setSelectedGraphDay] = useState<any>(null);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<any>(null);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0 min';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range, calendarDate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const today = new Date();
      
      // Calculate Graph Boundaries
      const graphStart = new Date(today);
      graphStart.setDate(graphStart.getDate() - (range === '7d' ? 6 : 29));
      
      // Calculate Calendar Boundaries
      const calendarStart = new Date(calendarDate);
      calendarStart.setDate(1);
      
      const calendarEnd = new Date(calendarDate);
      calendarEnd.setMonth(calendarEnd.getMonth() + 1);
      calendarEnd.setDate(0);

      // Find absolute min and max
      const minDate = graphStart < calendarStart ? graphStart : calendarStart;
      const maxDate = today > calendarEnd ? today : calendarEnd;

      const tzOffset = new Date().getTimezoneOffset();

      const formatYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

      const res = await fetch(`${getApiOrigin()}/api/study-analytics?startDate=${formatYMD(minDate)}&endDate=${formatYMD(maxDate)}&tzOffset=${tzOffset}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      if (!res.ok) throw new Error('Failed to fetch analytics');
      
      const json = await res.json();
      setData(json.days || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }, []);

  const graphDays = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - (range === '7d' ? 6 : 29));
    
    const startStr = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;
    
    return data.filter(d => d.date >= startStr && d.date <= todayStr);
  }, [data, range, todayStr]);

  const graphStats = useMemo(() => {
    let total = 0;
    let studyDays = 0;
    graphDays.forEach(d => {
      total += d.durationSeconds;
      if (d.durationSeconds > 0) studyDays++;
    });
    const avg = graphDays.length > 0 ? Math.round(total / graphDays.length) : 0;
    return { total, avg, studyDays };
  }, [graphDays]);

  const calendarDays = useMemo(() => {
    const startStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth()+1).padStart(2,'0')}-01`;
    const end = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);
    const endStr = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
    
    return data.filter(d => d.date >= startStr && d.date <= endStr);
  }, [data, calendarDate]);

  const changeMonth = (delta: number) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + delta);
    if (newDate > new Date()) return; // No future months
    setSelectedCalendarDay(null);
    setCalendarDate(newDate);
  };

  const renderGraph = () => {
    if (data.length === 0 && !loading) {
      return (
        <View style={{ alignItems: 'center', padding: SPACING.xl }}>
          <Text style={{ color: theme.secondaryText, fontSize: 16, marginBottom: 8, fontWeight: '600' }}>No study history yet.</Text>
          <Text style={{ color: theme.tertiaryText, fontSize: 14 }}>Start your first study session to build your history.</Text>
        </View>
      );
    }

    const BAR_MAX_HEIGHT = 120;
    const SECONDS_20_HOURS = 20 * 3600;

    return (
      <View style={{ marginTop: SPACING.md }}>
        <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg }}>
          <TouchableOpacity onPress={() => { setRange('7d'); setSelectedGraphDay(null); }} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: range === '7d' ? theme.accent : theme.surfaceHighlight }}>
            <Text style={{ color: range === '7d' ? '#fff' : theme.primaryText, fontWeight: '700', fontSize: 12 }}>7 DAYS</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setRange('30d'); setSelectedGraphDay(null); }} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: range === '30d' ? theme.accent : theme.surfaceHighlight }}>
            <Text style={{ color: range === '30d' ? '#fff' : theme.primaryText, fontWeight: '700', fontSize: 12 }}>30 DAYS</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: BAR_MAX_HEIGHT, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingLeft: 4 }}>
          {graphDays.map((d, i) => {
            const cappedSeconds = Math.min(d.durationSeconds, SECONDS_20_HOURS);
            const height = Math.max(d.durationSeconds > 0 ? 4 : 0, (cappedSeconds / SECONDS_20_HOURS) * BAR_MAX_HEIGHT);
            const isSelected = selectedGraphDay?.date === d.date;
            
            return (
              <TouchableOpacity
                key={d.date}
                onPress={() => setSelectedGraphDay(d)}
                style={{
                  width: range === '7d' ? '12%' : '2.5%',
                  height,
                  backgroundColor: d.durationSeconds > 0 ? (isSelected ? theme.accent : theme.learning) : 'transparent',
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  minHeight: isSelected ? 4 : 0
                }}
              />
            );
          })}
        </View>
        <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 4 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: theme.tertiaryText, fontSize: 10 }}>{graphDays[0]?.date?.substring(5)}</Text>
          <Text style={{ color: theme.tertiaryText, fontSize: 10 }}>{graphDays[graphDays.length - 1]?.date?.substring(5)}</Text>
        </View>

        {selectedGraphDay && (
          <View style={{ marginTop: SPACING.md, padding: SPACING.md, backgroundColor: theme.surfaceHighlight, borderRadius: RADIUS.md, alignItems: 'center' }}>
            <Text style={{ color: theme.primaryText, fontWeight: '700', marginBottom: 4 }}>
              {new Date(selectedGraphDay.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
            </Text>
            <Text style={{ color: theme.accent, fontSize: 20, fontWeight: '800' }}>
              {formatDuration(selectedGraphDay.durationSeconds)} <Text style={{ fontSize: 14, color: theme.secondaryText, fontWeight: '500' }}>studied</Text>
            </Text>
            <Text style={{ color: theme.secondaryText, fontSize: 12, marginTop: 4 }}>{selectedGraphDay.sessionCount} sessions</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.lg, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: theme.border }}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ color: theme.primaryText, fontSize: 18, fontWeight: '800' }}>{formatDuration(graphStats.total)}</Text>
            <Text style={{ color: theme.tertiaryText, fontSize: 11, fontWeight: '600' }}>TOTAL</Text>
          </View>
          <View style={{ alignItems: 'center', flex: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: theme.border }}>
            <Text style={{ color: theme.primaryText, fontSize: 18, fontWeight: '800' }}>{formatDuration(graphStats.avg)}</Text>
            <Text style={{ color: theme.tertiaryText, fontSize: 11, fontWeight: '600' }}>DAILY AVG</Text>
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ color: theme.primaryText, fontSize: 18, fontWeight: '800' }}>{graphStats.studyDays} days</Text>
            <Text style={{ color: theme.tertiaryText, fontSize: 11, fontWeight: '600' }}>STUDY DAYS</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCalendar = () => {
    const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay();
    
    // adjust for Monday start (1=Mon, 7=Sun)
    const offset = firstDay === 0 ? 6 : firstDay - 1; 

    const cells = Array(offset).fill(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const dStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth()+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
      const dayData = calendarDays.find(d => d.date === dStr) || { date: dStr, durationSeconds: 0, sessionCount: 0 };
      cells.push(dayData);
    }

    const getColor = (seconds: number) => {
      if (seconds === 0) return theme.surfaceHighlight;
      if (seconds <= 1800) return 'rgba(59, 130, 246, 0.2)'; // very light
      if (seconds <= 3600) return 'rgba(59, 130, 246, 0.4)'; // light
      if (seconds <= 7200) return 'rgba(59, 130, 246, 0.6)'; // medium
      if (seconds <= 14400) return 'rgba(59, 130, 246, 0.8)'; // strong
      return theme.learning; // strongest
    };

    const isCurrentMonth = calendarDate.getFullYear() === new Date().getFullYear() && calendarDate.getMonth() === new Date().getMonth();

    return (
      <View style={{ marginTop: SPACING.xl }}>
        <SectionHeader title="Study Calendar" />
        <GlassCard style={{ padding: SPACING.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md }}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={24} color={theme.primaryText} />
            </TouchableOpacity>
            <Text style={{ color: theme.primaryText, fontSize: 18, fontWeight: '700' }}>
              {calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={{ padding: 4, opacity: isCurrentMonth ? 0.3 : 1 }} disabled={isCurrentMonth}>
              <Ionicons name="chevron-forward" size={24} color={theme.primaryText} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <Text key={i} style={{ flex: 1, textAlign: 'center', color: theme.tertiaryText, fontSize: 12, fontWeight: '600' }}>{d}</Text>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {cells.map((cell, i) => {
              if (!cell) {
                return <View key={`empty-${i}`} style={{ width: '13%', aspectRatio: 1 }} />;
              }
              const isToday = cell.date === todayStr;
              return (
                <TouchableOpacity
                  key={cell.date}
                  onPress={() => setSelectedCalendarDay(cell)}
                  style={{
                    width: '13%',
                    aspectRatio: 1,
                    backgroundColor: getColor(cell.durationSeconds),
                    borderRadius: 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: isToday ? 2 : 0,
                    borderColor: theme.accent
                  }}
                >
                  {isToday && cell.durationSeconds > 0 && currentStreak > 0 && (
                    <Text style={{ fontSize: 10 }}>🔥</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedCalendarDay && (
            <View style={{ marginTop: SPACING.lg, padding: SPACING.md, backgroundColor: theme.surfaceHighlight, borderRadius: RADIUS.md, alignItems: 'center' }}>
              <Text style={{ color: theme.primaryText, fontWeight: '700', marginBottom: 4 }}>
                {new Date(selectedCalendarDay.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
              </Text>
              <Text style={{ color: theme.accent, fontSize: 20, fontWeight: '800' }}>
                {formatDuration(selectedCalendarDay.durationSeconds)} <Text style={{ fontSize: 14, color: theme.secondaryText, fontWeight: '500' }}>studied</Text>
              </Text>
              <Text style={{ color: theme.secondaryText, fontSize: 12, marginTop: 4 }}>
                {selectedCalendarDay.sessionCount > 0 ? `${selectedCalendarDay.sessionCount} sessions` : 'No study sessions'}
              </Text>
            </View>
          )}
        </GlassCard>
      </View>
    );
  };

  return (
    <View>
      <SectionHeader title="Study Analytics" />
      <GlassCard style={{ padding: SPACING.lg, marginBottom: SPACING.md }}>
        {loading && data.length === 0 ? (
          <ActivityIndicator size="small" color={theme.accent} />
        ) : (
          renderGraph()
        )}
      </GlassCard>
      {renderCalendar()}
    </View>
  );
};
