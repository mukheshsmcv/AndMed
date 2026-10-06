import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import { Screen, PrimaryButton, SPACING, RADIUS } from '../components/DesignSystem';
import { EXAM_TARGETS } from '../config/exam';
import { useTheme } from '../theme/ThemeProvider';

export default function Onboarding() {
  const { theme, themeType } = useTheme();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [institution, setInstitution] = useState('');
  const [mbbsYear, setMbbsYear] = useState<number | null>(null);
  const [targetExam, setTargetExam] = useState<string | null>(null);
  const [studyTarget, setStudyTarget] = useState<number | null>(null);

  const handleNext = async () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        data: {
          institution,
          mbbs_joining_year: mbbsYear,
          target_exam: targetExam,
          daily_study_target_hours: studyTarget,
          onboarding_complete: true
        }
      });
      
      if (error) throw error;
      
      router.replace('/(tabs)' as any);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to complete onboarding');
      setLoading(false);
    }
  };

  const OptionButton = ({ label, selected, onPress }: any) => (
    <TouchableOpacity 
      onPress={onPress}
      style={{
        backgroundColor: selected ? theme.accent : theme.surface,
        borderWidth: 1,
        borderColor: selected ? theme.accent : theme.border,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        marginBottom: SPACING.md
      }}
    >
      <Text style={{ 
        color: selected ? theme.background : theme.primaryText, 
        fontSize: 18, 
        fontWeight: selected ? '700' : '500' 
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderStepIndicator = () => (
    <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl, justifyContent: 'center' }}>
      {[1, 2, 3, 4].map(s => (
        <View key={s} style={{ 
          height: 4, 
          width: 40, 
          backgroundColor: s <= step ? theme.accent : theme.surfaceHighlight, 
          borderRadius: 2 
        }} />
      ))}
    </View>
  );

  return (
    <Screen style={{ paddingTop: SPACING.xxl, paddingHorizontal: SPACING.lg }}>
      {renderStepIndicator()}
      
      <View style={{ flex: 1 }}>
        {step === 1 && (
          <View>
            <Text style={{ color: theme.secondaryText, fontSize: 16, textTransform: 'uppercase', fontWeight: '600', marginBottom: SPACING.sm }}>Step 1</Text>
            <Text style={{ color: theme.primaryText, fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginBottom: SPACING.lg }}>
              Where do you study?
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.surface,
                color: theme.primaryText,
                paddingHorizontal: SPACING.md,
                paddingVertical: 16,
                borderRadius: RADIUS.md,
                borderWidth: 1,
                borderColor: theme.border,
                fontSize: 18
              }}
              onChangeText={setInstitution}
              value={institution}
              placeholder="Institution / College (Optional)"
              placeholderTextColor={theme.tertiaryText}
            />
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={{ color: theme.secondaryText, fontSize: 16, textTransform: 'uppercase', fontWeight: '600', marginBottom: SPACING.sm }}>Step 2</Text>
            <Text style={{ color: theme.primaryText, fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginBottom: SPACING.lg }}>
              Which year did you join MBBS?
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md }}>
              {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map(year => (
                <View key={year} style={{ width: '47%' }}>
                  <OptionButton 
                    label={year.toString()} 
                    selected={mbbsYear === year} 
                    onPress={() => setMbbsYear(year)} 
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={{ color: theme.secondaryText, fontSize: 16, textTransform: 'uppercase', fontWeight: '600', marginBottom: SPACING.sm }}>Step 3</Text>
            <Text style={{ color: theme.primaryText, fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginBottom: SPACING.lg }}>
              What's your target exam?
            </Text>
            <View>
              {Object.values(EXAM_TARGETS).map(exam => (
                <OptionButton 
                  key={exam.id}
                  label={exam.displayName} 
                  selected={targetExam === exam.id} 
                  onPress={() => setTargetExam(exam.id)} 
                />
              ))}
            </View>
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={{ color: theme.secondaryText, fontSize: 16, textTransform: 'uppercase', fontWeight: '600', marginBottom: SPACING.sm }}>Step 4</Text>
            <Text style={{ color: theme.primaryText, fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginBottom: SPACING.lg }}>
              How many hours can you target studying each day?
            </Text>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={true}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, paddingBottom: SPACING.xl }}>
                {Array.from({length: 20}, (_, i) => i + 1).map(hours => (
                  <View key={hours} style={{ width: '47%' }}>
                    <OptionButton 
                      label={`${hours} ${hours === 1 ? 'hour' : 'hours'}`} 
                      selected={studyTarget === hours} 
                      onPress={() => setStudyTarget(hours)} 
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      <View style={{ paddingBottom: SPACING.xl }}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.accent} />
        ) : (
          <PrimaryButton 
            title={step === 4 ? "START PREPARATION" : "Continue"} 
            onPress={handleNext}
            disabled={
              (step === 2 && !mbbsYear) || 
              (step === 3 && !targetExam) || 
              (step === 4 && !studyTarget)
            }
          />
        )}
      </View>
    </Screen>
  );
}
