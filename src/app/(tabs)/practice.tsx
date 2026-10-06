import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Screen, GlassCard, PrimaryButton, COLORS, SPACING, RADIUS } from '../../components/DesignSystem';
import { Ionicons } from '@expo/vector-icons';

export default function Practice() {
  return (
    <Screen noPadding tabIndex={2}>
      <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.xl, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface }}>
        <Text style={{ fontSize: 34, fontWeight: '800', color: COLORS.primaryText, letterSpacing: -0.5 }}>Practice</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl, gap: SPACING.lg }}>
        
        {/* Adaptive Practice */}
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          <View style={{ backgroundColor: COLORS.accent, padding: SPACING.lg, alignItems: 'center' }}>
            <Ionicons name="flash" size={48} color={COLORS.primaryText} style={{ marginBottom: SPACING.sm }} />
            <Text style={{ color: COLORS.primaryText, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>Adaptive Practice</Text>
            <Text style={{ color: COLORS.primaryText, fontSize: 15, opacity: 0.9, textAlign: 'center', marginTop: 4 }}>
              Let ANDE MED choose what you need next.
            </Text>
          </View>
          <View style={{ padding: SPACING.lg, backgroundColor: COLORS.surface }}>
            <PrimaryButton 
              title="START ADAPTIVE PRACTICE" 
              onPress={() => router.push('/mcq')} 
            />
          </View>
        </GlassCard>

        <Text style={{ color: COLORS.secondaryText, fontSize: 14, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginTop: SPACING.sm, marginLeft: SPACING.xs }}>Targeted Sessions</Text>

        {/* Subject Practice */}
        <TouchableOpacity onPress={() => router.push('/(tabs)/curriculum')}>
          <GlassCard style={{ flexDirection: 'row', alignItems: 'center', padding: SPACING.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.surfaceHighlight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md }}>
              <Ionicons name="book" size={24} color={COLORS.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.primaryText, fontSize: 18, fontWeight: '700' }}>Subject Practice</Text>
              <Text style={{ color: COLORS.secondaryText, fontSize: 14, marginTop: 2 }}>Practice an entire subject.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.tertiaryText} />
          </GlassCard>
        </TouchableOpacity>

        {/* Topic Practice */}
        <TouchableOpacity onPress={() => router.push('/(tabs)/curriculum')}>
          <GlassCard style={{ flexDirection: 'row', alignItems: 'center', padding: SPACING.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.surfaceHighlight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md }}>
              <Ionicons name="list" size={24} color={COLORS.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.primaryText, fontSize: 18, fontWeight: '700' }}>Topic Practice</Text>
              <Text style={{ color: COLORS.secondaryText, fontSize: 14, marginTop: 2 }}>Drill down into specific topics.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.tertiaryText} />
          </GlassCard>
        </TouchableOpacity>

        {/* Exam Practice */}
        <TouchableOpacity onPress={() => router.push('/mcq')}>
          <GlassCard style={{ flexDirection: 'row', alignItems: 'center', padding: SPACING.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.surfaceHighlight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md }}>
              <Ionicons name="school" size={24} color={'#BF5AF2'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.primaryText, fontSize: 18, fontWeight: '700' }}>Exam-Focused</Text>
              <Text style={{ color: COLORS.secondaryText, fontSize: 14, marginTop: 2 }}>Simulate INI-CET conditions.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.tertiaryText} />
          </GlassCard>
        </TouchableOpacity>

      </ScrollView>
    </Screen>
  );
}
