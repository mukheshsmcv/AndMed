import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ProgressBar, SPACING, RADIUS } from './DesignSystem';
import { Ionicons } from '@expo/vector-icons';

export interface SubjectProgressCardProps {
  id: string;
  name: string;
  slug?: string;
  completedTopics: number;
  totalTopics: number;
  mcqAttempted: number;
  mcqCorrect?: number;
  mcqAccuracy: number | null;
  hasMcqData: boolean;
  onPress?: () => void;
  style?: any;
}

export const SubjectProgressCard: React.FC<SubjectProgressCardProps> = ({
  name,
  completedTopics = 0,
  totalTopics = 0,
  mcqAttempted = 0,
  mcqAccuracy = null,
  hasMcqData = false,
  onPress,
  style
}) => {
  const { theme, themeType } = useTheme();

  const topicPercentage = totalTopics > 0 ? Math.min(100, Math.round((completedTopics / totalTopics) * 100)) : 0;
  const isAllTopicsCompleted = totalTopics > 0 && completedTopics >= totalTopics;

  const cardContent = (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: RADIUS.lg,
          padding: SPACING.md,
          borderWidth: 1,
          borderColor: isAllTopicsCompleted ? theme.success : theme.border,
          gap: SPACING.sm,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 1,
        },
        style
      ]}
    >
      {/* Header: Subject Name & Status Badge */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text
          style={{
            color: theme.primaryText,
            fontSize: 16,
            fontWeight: '700',
            flex: 1,
            marginRight: SPACING.xs
          }}
          numberOfLines={1}
        >
          {name}
        </Text>
        {isAllTopicsCompleted && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: RADIUS.full
            }}
          >
            <Ionicons name="checkmark-circle" size={12} color={theme.success} style={{ marginRight: 3 }} />
            <Text style={{ color: theme.success, fontSize: 11, fontWeight: '700' }}>DONE</Text>
          </View>
        )}
      </View>

      {/* Metric A: Topics Completed */}
      <View style={{ marginTop: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="book-outline" size={13} color={theme.learning || '#3B82F6'} style={{ marginRight: 4 }} />
            <Text style={{ color: theme.secondaryText, fontSize: 12, fontWeight: '600' }}>Topics</Text>
          </View>
          <Text style={{ color: theme.primaryText, fontSize: 12, fontWeight: '700' }}>
            {completedTopics} / {totalTopics} <Text style={{ color: theme.tertiaryText, fontWeight: '500' }}>({topicPercentage}%)</Text>
          </Text>
        </View>
        <ProgressBar
          progress={topicPercentage}
          height={5}
          color={theme.learning || '#3B82F6'}
        />
      </View>

      {/* Metric B: MCQ Accuracy */}
      <View style={{ marginTop: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="stats-chart-outline" size={13} color={theme.accent} style={{ marginRight: 4 }} />
            <Text style={{ color: theme.secondaryText, fontSize: 12, fontWeight: '600' }}>MCQ Accuracy</Text>
          </View>
          {hasMcqData && mcqAccuracy !== null ? (
            <Text style={{ color: theme.primaryText, fontSize: 12, fontWeight: '700' }}>
              {mcqAccuracy}% <Text style={{ color: theme.tertiaryText, fontWeight: '500' }}>({mcqAttempted} tried)</Text>
            </Text>
          ) : (
            <Text style={{ color: theme.tertiaryText, fontSize: 11, fontWeight: '500', fontStyle: 'italic' }}>
              — No MCQs attempted
            </Text>
          )}
        </View>
        {hasMcqData && mcqAccuracy !== null ? (
          <ProgressBar
            progress={mcqAccuracy}
            height={5}
            color={mcqAccuracy >= 70 ? theme.success : mcqAccuracy >= 50 ? theme.warning : theme.critical}
          />
        ) : (
          <View style={{ height: 5, backgroundColor: theme.surfaceHighlight, borderRadius: RADIUS.full, opacity: 0.5 }} />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={{ width: '100%' }}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};
