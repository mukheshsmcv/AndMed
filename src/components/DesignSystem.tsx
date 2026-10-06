import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { useTheme, THEMES } from '../theme/ThemeProvider';

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Reusable Components

export const Screen = ({ children, style, noPadding = false }: any) => {
  const { theme } = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: theme.background, paddingHorizontal: noPadding ? 0 : SPACING.md, paddingTop: noPadding ? 0 : SPACING.xl }, style]}>
      {children}
    </View>
  );
};

export const SectionHeader = ({ title, actionTitle, onAction, subtitle }: any) => {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: SPACING.md, marginTop: SPACING.lg, paddingHorizontal: SPACING.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: theme.primaryText, fontSize: 20, fontWeight: '700', letterSpacing: 0.5 }}>{title}</Text>
        {actionTitle && (
          <TouchableOpacity onPress={onAction}>
            <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '500' }}>{actionTitle}</Text>
          </TouchableOpacity>
        )}
      </View>
      {subtitle && <Text style={{ color: theme.secondaryText, fontSize: 14, marginTop: SPACING.xs }}>{subtitle}</Text>}
    </View>
  );
};

export const GlassCard = ({ children, style, onPress }: any) => {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  const content = (
    <Animated.View style={[{ 
      backgroundColor: theme.surface, 
      borderRadius: RADIUS.lg, 
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      transform: [{ scale }]
    }, style]}>
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={1} onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};

export const PrimaryButton = ({ title, onPress, disabled, style, icon }: any) => {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} disabled={disabled} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[{
        backgroundColor: disabled ? theme.surfaceHighlight : theme.primaryText,
        borderRadius: RADIUS.full,
        paddingVertical: 16,
        paddingHorizontal: SPACING.lg,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        transform: [{ scale }]
      }, style]}>
        {icon}
        <Text style={{ 
          color: disabled ? theme.tertiaryText : theme.background, 
          fontSize: 16, 
          fontWeight: '700',
          marginLeft: icon ? SPACING.sm : 0
        }}>{title}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const SecondaryButton = ({ title, onPress, disabled, style, icon }: any) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} disabled={disabled}>
      <View style={[{
        backgroundColor: theme.surfaceHighlight,
        borderRadius: RADIUS.full,
        paddingVertical: 12,
        paddingHorizontal: SPACING.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
      }, style]}>
        {icon}
        <Text style={{ 
          color: disabled ? theme.tertiaryText : theme.primaryText, 
          fontSize: 15, 
          fontWeight: '600',
          marginLeft: icon ? SPACING.sm : 0
        }}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

export const ProgressBar = ({ progress, color, height = 6 }: any) => {
  const { theme } = useTheme();
  const widthAnim = useRef(new Animated.Value(0)).current;
  const barColor = color || theme.accent;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start();
  }, [progress]);

  return (
    <View style={{ height, backgroundColor: theme.surfaceHighlight, borderRadius: RADIUS.full, overflow: 'hidden', width: '100%' }}>
      <Animated.View style={{ 
        height: '100%', 
        backgroundColor: barColor,
        width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] })
      }} />
    </View>
  );
};

export const ProgressRing = ({ progress, size = 120, strokeWidth = 10, color, children }: any) => {
  const { theme } = useTheme();
  const ringColor = color || theme.accent;
  
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: theme.surfaceHighlight,
      }} />
      <View style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: progress > 0 ? ringColor : 'transparent',
        borderTopColor: progress > 25 ? ringColor : 'transparent',
        borderRightColor: progress > 50 ? ringColor : 'transparent',
        borderBottomColor: progress > 75 ? ringColor : 'transparent',
        opacity: 0.8,
        transform: [{ rotate: '-45deg' }] 
      }} />
      {children}
    </View>
  );
};

export const ExamCountdown = ({ target, countdown }: any) => {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: SPACING.xl, paddingHorizontal: SPACING.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={{ color: theme.primaryText, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 }}>{target.displayName}</Text>
          <Text style={{ color: theme.accent, fontSize: 16, fontWeight: '600', marginTop: 2 }}>{target.targetMonth.toUpperCase()}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: countdown.type === 'exact' ? theme.primaryText : theme.secondaryText, fontSize: countdown.type === 'exact' ? 32 : 16, fontWeight: '800', letterSpacing: -0.5 }}>
            {countdown.label}
          </Text>
          <Text style={{ color: theme.tertiaryText, fontSize: 13, marginTop: 2, fontWeight: '500' }}>
            {target.exactDate ? new Date(target.exactDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Exam date TBA'}
          </Text>
        </View>
      </View>
    </View>
  );
};

export const StatPill = ({ label, value, color }: any) => {
  const { theme } = useTheme();
  const bgColor = color || theme.surfaceHighlight;
  return (
    <View style={{ backgroundColor: bgColor, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.sm, flexDirection: 'row', alignItems: 'center' }}>
      {label && <Text style={{ color: theme.secondaryText, fontSize: 11, fontWeight: '600', marginRight: 4, textTransform: 'uppercase' }}>{label}</Text>}
      <Text style={{ color: theme.primaryText, fontSize: 12, fontWeight: '700' }}>{value}</Text>
    </View>
  );
};

export const TimelineItem = ({ title, subtitle, isPast, isToday, isFuture }: any) => {
  const { theme } = useTheme();
  const color = isToday ? theme.accent : isPast ? theme.success : theme.tertiaryText;
  
  return (
    <View style={{ flexDirection: 'row', marginBottom: SPACING.md }}>
      <View style={{ alignItems: 'center', width: 24, marginRight: SPACING.sm }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: isToday ? color : 'transparent', borderWidth: 2, borderColor: color, zIndex: 1 }} />
        <View style={{ width: 2, flex: 1, backgroundColor: theme.border, marginTop: -6, marginBottom: -16 }} />
      </View>
      <View style={{ flex: 1, paddingBottom: SPACING.md }}>
        <Text style={{ color: isToday ? theme.primaryText : theme.secondaryText, fontSize: 16, fontWeight: '600' }}>{title}</Text>
        {subtitle && <Text style={{ color: theme.tertiaryText, fontSize: 14, marginTop: 2 }}>{subtitle}</Text>}
      </View>
    </View>
  );
};

export const COLORS = THEMES.dark; // Legacy fallback for untransformed files
