// Bloomie - Usage Limits Card Component
// Shows free tier usage limits with progress bars

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { FREE_LIMITS } from '../constants/config';

interface UsageLimit {
  label: string;
  used: number;
  total: number;
  icon: string;
  color: string;
}

interface UsageLimitsCardProps {
  usage: {
    aiChatQueries: number;
    perplexityQueries: number;
    voiceMinutes: number;
    photoAnalysis: number;
  };
  onUpgrade?: () => void;
  compact?: boolean;
}

export default function UsageLimitsCard({
  usage,
  onUpgrade,
  compact = false,
}: UsageLimitsCardProps) {
  const limits: UsageLimit[] = [
    {
      label: 'AI Chat',
      used: usage.aiChatQueries,
      total: FREE_LIMITS.totalAiChatQueries,
      icon: 'robot',
      color: Colors.terracotta[500],
    },
    {
      label: 'Premium Answers',
      used: usage.perplexityQueries,
      total: FREE_LIMITS.totalPerplexityQueries,
      icon: 'star',
      color: Colors.plant.main,
    },
    {
      label: 'Voice Minutes',
      used: Math.round(usage.voiceMinutes),
      total: FREE_LIMITS.totalVoiceMinutes,
      icon: 'microphone',
      color: Colors.baby.main,
    },
    {
      label: 'Photo Analysis',
      used: usage.photoAnalysis,
      total: FREE_LIMITS.totalPhotoAnalysis,
      icon: 'camera',
      color: Colors.pet.main,
    },
  ];

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return Colors.terracotta[500];
    if (percentage >= 70) return Colors.terracotta[400];
    return Colors.plant.main;
  };

  const getProgressWidth = (used: number, total: number) => {
    return Math.min((used / total) * 100, 100);
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {limits.map((limit, index) => {
          const percentage = (limit.used / limit.total) * 100;
          const progressWidth = getProgressWidth(limit.used, limit.total);
          
          return (
            <View key={index} style={styles.compactLimit}>
              <View style={styles.compactLimitHeader}>
                <MaterialCommunityIcons
                  name={limit.icon as any}
                  size={14}
                  color={limit.color}
                />
                <Text style={styles.compactLabel}>{limit.label}</Text>
                <Text style={styles.compactCount}>
                  {limit.used}/{limit.total}
                </Text>
              </View>
              <View style={styles.compactProgressBar}>
                <View
                  style={[
                    styles.compactProgressFill,
                    {
                      width: `${progressWidth}%`,
                      backgroundColor: getProgressColor(percentage),
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
        {onUpgrade && (
          <TouchableOpacity
            style={styles.compactUpgradeButton}
            onPress={onUpgrade}
          >
            <Text style={styles.compactUpgradeText}>Upgrade to Premium</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Usage Limits</Text>
        {onUpgrade && (
          <TouchableOpacity onPress={onUpgrade}>
            <Text style={styles.upgradeLink}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.limitsList}>
        {limits.map((limit, index) => {
          const percentage = (limit.used / limit.total) * 100;
          const progressWidth = getProgressWidth(limit.used, limit.total);
          const isNearLimit = percentage >= 70;

          return (
            <View key={index} style={styles.limitItem}>
              <View style={styles.limitHeader}>
                <View style={styles.limitIconContainer}>
                  <MaterialCommunityIcons
                    name={limit.icon as any}
                    size={20}
                    color={limit.color}
                  />
                </View>
                <View style={styles.limitInfo}>
                  <Text style={styles.limitLabel}>{limit.label}</Text>
                  <Text style={styles.limitCount}>
                    {limit.used} / {limit.total}
                  </Text>
                </View>
                {isNearLimit && (
                  <MaterialCommunityIcons
                    name="alert-circle"
                    size={18}
                    color={Colors.terracotta[500]}
                  />
                )}
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressWidth}%`,
                      backgroundColor: getProgressColor(percentage),
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 20,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  upgradeLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.terracotta[600],
  },
  limitsList: {
    gap: 16,
  },
  limitItem: {
    gap: 8,
  },
  limitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  limitIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitInfo: {
    flex: 1,
  },
  limitLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.charcoal,
  },
  limitCount: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 2,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.gray[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Compact styles
  compactContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    gap: 12,
    ...Shadows.sm,
  },
  compactLimit: {
    gap: 6,
  },
  compactLimitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.charcoal,
  },
  compactCount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray[500],
  },
  compactProgressBar: {
    height: 4,
    backgroundColor: Colors.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  compactProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  compactUpgradeButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.terracotta[500],
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  compactUpgradeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
  },
});
