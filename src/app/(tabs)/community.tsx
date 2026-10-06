import React from 'react';
import { View, Text } from 'react-native';
import { Screen, GlassCard, SPACING } from '../../components/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';

export default function Community() {
  const { theme } = useTheme();

  return (
    <Screen noPadding tabIndex={5}>
      <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.xl, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface }}>
        <Text style={{ fontSize: 34, fontWeight: '800', color: theme.primaryText, letterSpacing: -0.5 }}>Community</Text>
      </View>
      <View style={{ flex: 1, padding: SPACING.md, justifyContent: 'center', alignItems: 'center' }}>
        <GlassCard style={{ padding: SPACING.xl, alignItems: 'center', width: '100%' }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.surfaceHighlight, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg }}>
            <Ionicons name="people" size={40} color={theme.accent} />
          </View>
          <Text style={{ color: theme.primaryText, fontSize: 24, fontWeight: '800', marginBottom: SPACING.sm, textAlign: 'center' }}>
            Study with others.
          </Text>
          <Text style={{ color: theme.secondaryText, fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: SPACING.xl }}>
            Connect, compete and grow together.
          </Text>
          <View style={{ backgroundColor: theme.surfaceHighlight, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: 20 }}>
            <Text style={{ color: theme.accent, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Coming soon</Text>
          </View>
        </GlassCard>
      </View>
    </Screen>
  );
}
