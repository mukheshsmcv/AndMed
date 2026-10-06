import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { Screen, GlassCard, SPACING, RADIUS } from '../../components/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import { EXAM_TARGETS, CURRENT_EXAM_ID } from '../../config/exam';
import { useTheme } from '../../theme/ThemeProvider';

export default function Profile() {
  const { theme, themeType, setThemeType } = useTheme();

  const [email, setEmail] = useState<string>('');
  const [examTargetId, setExamTargetId] = useState(CURRENT_EXAM_ID);
  const [metadata, setMetadata] = useState<any>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        setEmail(data.session.user.email || '');
        setMetadata(data.session.user.user_metadata || {});
        if (data.session.user.user_metadata?.target_exam) {
          setExamTargetId(data.session.user.user_metadata.target_exam);
        }
      }
    });
  }, []);

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/');
          }
        }
      ]
    );
  };

  const handleExamChange = () => {
    const options = Object.values(EXAM_TARGETS);
    const buttons = options.map(opt => ({
      text: opt.displayName,
      onPress: () => {
        // In a real app this would write to persistent storage / backend
        setExamTargetId(opt.id);
        Alert.alert("Target Updated", `Your target exam is now ${opt.displayName}`);
      }
    }));
    
    Alert.alert("Change Target Exam", "Select your target exam:", [
      ...buttons,
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const handleStudyTargetChange = () => {
    const options = [2, 4, 6, 8, 10, 12];
    const buttons = options.map(hours => ({
      text: hours === 12 ? '12+ hours' : `${hours} hours`,
      onPress: async () => {
        const { error } = await supabase.auth.updateUser({
          data: { daily_study_target_hours: hours }
        });
        if (!error) {
          setMetadata({ ...metadata, daily_study_target_hours: hours });
        }
      }
    }));
    
    Alert.alert("Daily Study Target", "Select your intended study target:", [
      ...buttons,
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const currentExam = EXAM_TARGETS[examTargetId];

  return (
    <Screen noPadding>
      <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.xl, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface }}>
        <Text style={{ fontSize: 34, fontWeight: '800', color: theme.primaryText, letterSpacing: -0.5 }}>Profile</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl, gap: SPACING.lg }}>
        
        <GlassCard style={{ padding: SPACING.lg, alignItems: 'center' }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.surfaceHighlight, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md }}>
            <Ionicons name="person" size={40} color={theme.primaryText} />
          </View>
          <Text style={{ color: theme.primaryText, fontSize: 22, fontWeight: '700' }}>Doc</Text>
          <Text style={{ color: theme.secondaryText, fontSize: 15, marginTop: 4 }}>{email}</Text>
        </GlassCard>

        <Text style={{ color: theme.secondaryText, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginLeft: SPACING.xs }}>Target Goal</Text>
        
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: SPACING.md }} onPress={handleExamChange}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.secondaryText, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 }}>Target Exam</Text>
              <Text style={{ color: theme.primaryText, fontSize: 20, fontWeight: '700' }}>{currentExam.displayName}</Text>
              <Text style={{ color: theme.primaryText, fontSize: 14 }}>{currentExam.targetMonth}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '500', marginRight: SPACING.xs }}>Change</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.tertiaryText} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderTopWidth: 1, borderTopColor: theme.border }} onPress={handleStudyTargetChange}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.secondaryText, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 }}>Daily Study Target</Text>
              <Text style={{ color: theme.primaryText, fontSize: 18, fontWeight: '700' }}>
                {metadata?.daily_study_target_hours ? (metadata.daily_study_target_hours === 12 ? '12+ hours' : `${metadata.daily_study_target_hours} hours`) : 'Not set'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '500', marginRight: SPACING.xs }}>Edit</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.tertiaryText} />
            </View>
          </TouchableOpacity>
        </GlassCard>

        <Text style={{ color: theme.secondaryText, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginLeft: SPACING.xs, marginTop: SPACING.sm }}>Appearance</Text>

        <View style={{ flexDirection: 'row', backgroundColor: theme.surfaceHighlight, borderRadius: RADIUS.md, padding: 4 }}>
          {['dark', 'light', 'colorful'].map((mode) => {
            const isSelected = themeType === mode;
            return (
              <TouchableOpacity
                key={mode}
                onPress={() => setThemeType(mode as any)}
                style={{
                  flex: 1,
                  paddingVertical: SPACING.sm,
                  alignItems: 'center',
                  backgroundColor: isSelected ? theme.surfaceElevated : 'transparent',
                  borderRadius: RADIUS.sm - 2,
                  shadowColor: isSelected && themeType !== 'dark' ? '#000' : 'transparent',
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  shadowOffset: { width: 0, height: 1 },
                  elevation: isSelected ? 1 : 0
                }}
              >
                <Text style={{ 
                  color: isSelected ? theme.primaryText : theme.secondaryText, 
                  fontWeight: isSelected ? '600' : '500',
                  textTransform: 'capitalize'
                }}>
                  {mode}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={{ color: theme.secondaryText, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginLeft: SPACING.xs, marginTop: SPACING.sm }}>Education</Text>
        
        <GlassCard style={{ padding: SPACING.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: theme.secondaryText, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 }}>MBBS Joined</Text>
              <Text style={{ color: theme.primaryText, fontSize: 20, fontWeight: '700' }}>{metadata?.mbbs_joining_year || 'Not specified'}</Text>
            </View>
          </View>
          {metadata?.institution && (
            <View style={{ marginTop: SPACING.md }}>
              <Text style={{ color: theme.secondaryText, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 }}>Institution</Text>
              <Text style={{ color: theme.primaryText, fontSize: 16 }}>{metadata.institution}</Text>
            </View>
          )}
        </GlassCard>

        <Text style={{ color: theme.secondaryText, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginLeft: SPACING.xs, marginTop: SPACING.sm }}>Account</Text>
        
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Ionicons name="settings-outline" size={24} color={theme.primaryText} style={{ marginRight: SPACING.md }} />
            <Text style={{ flex: 1, color: theme.primaryText, fontSize: 16 }}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.tertiaryText} />
          </TouchableOpacity>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Ionicons name="help-buoy-outline" size={24} color={theme.primaryText} style={{ marginRight: SPACING.md }} />
            <Text style={{ flex: 1, color: theme.primaryText, fontSize: 16 }}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.tertiaryText} />
          </TouchableOpacity>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: SPACING.md }} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={24} color={theme.critical} style={{ marginRight: SPACING.md }} />
            <Text style={{ flex: 1, color: theme.critical, fontSize: 16, fontWeight: '500' }}>Sign Out</Text>
          </TouchableOpacity>
        </GlassCard>

        <Text style={{ color: theme.tertiaryText, fontSize: 12, textAlign: 'center', marginTop: SPACING.xl }}>
          ANDE MED v1.0.1
        </Text>

      </ScrollView>
    </Screen>
  );
}
