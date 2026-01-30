// Bloomie - Weekly Care Report Screen
// Beautiful summary of weekly care activities with insights

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import type { WeeklyCareReport, LogEntry, Nurture } from '../types';

const { width } = Dimensions.get('window');

export default function WeeklyReportScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { nurtures, recentLogs, user } = useAppStore();
  
  const [report, setReport] = useState<WeeklyCareReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = () => {
    setIsLoading(true);
    
    // Calculate week range
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    
    // Filter logs from this week
    const weekLogs = recentLogs.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= weekStart && logDate <= now;
    });

    // Calculate activities by type
    const activitiesByType: Record<string, number> = {};
    weekLogs.forEach(log => {
      const action = log.parsed_action || 'other';
      activitiesByType[action] = (activitiesByType[action] || 0) + 1;
    });

    // Generate nurture summaries
    const nurtureSummaries = nurtures.map(nurture => {
      const nurtureLogs = weekLogs.filter(log => log.nurture_id === nurture.id);
      const healthScores = nurtureLogs
        .filter(log => log.health_score)
        .map(log => log.health_score as number);
      
      const avgHealth = healthScores.length > 0 
        ? healthScores.reduce((a, b) => a + b, 0) / healthScores.length 
        : undefined;

      // Get top activities
      const activityCounts: Record<string, number> = {};
      nurtureLogs.forEach(log => {
        const action = log.parsed_action || 'care';
        activityCounts[action] = (activityCounts[action] || 0) + 1;
      });
      
      const topActivities = Object.entries(activityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([action]) => action);

      return {
        nurtureId: nurture.id,
        nurtureName: nurture.name,
        nurtureType: nurture.type,
        activityCount: nurtureLogs.length,
        avgHealthScore: avgHealth,
        topActivities,
      };
    });

    // Generate insights
    const insights: string[] = [];
    
    if (weekLogs.length > 0) {
      insights.push(`You logged ${weekLogs.length} care activities this week! 🎉`);
    } else {
      insights.push("Start logging activities to see your care patterns! 📝");
    }

    // Check for consistent care
    const daysWithLogs = new Set(
      weekLogs.map(log => new Date(log.created_at).toDateString())
    ).size;
    
    if (daysWithLogs >= 5) {
      insights.push("Amazing consistency! You logged activities on 5+ days. 🌟");
    } else if (daysWithLogs >= 3) {
      insights.push("Good job! Keep logging to build better care habits. 💪");
    }

    // Check for specific nurture insights
    nurtureSummaries.forEach(summary => {
      if (summary.activityCount >= 10) {
        insights.push(`${summary.nurtureName} received great attention this week! 💚`);
      } else if (summary.activityCount === 0) {
        insights.push(`Don't forget about ${summary.nurtureName}! Log some activities. 🌱`);
      }
    });

    // Generate encouragement
    const encouragements = [
      "You're doing an amazing job as a caregiver! Keep it up! 🌟",
      "Every small act of care matters. You're making a difference! 💚",
      "Your nurtures are lucky to have you! Keep up the great work! 🎉",
      "Consistency is key, and you're showing great dedication! 💪",
      "Taking care of others shows how much love you have to give! ❤️",
    ];
    
    const encouragement = encouragements[Math.floor(Math.random() * encouragements.length)];

    setReport({
      weekStart: weekStart.toISOString(),
      weekEnd: now.toISOString(),
      totalActivities: weekLogs.length,
      activitiesByType,
      nurtureSummaries,
      insights,
      encouragement,
    });
    
    setIsLoading(false);
  };

  const getNurtureIcon = (type: string) => {
    switch (type) {
      case 'pet': return 'paw';
      case 'plant': return 'leaf';
      case 'baby': return 'baby-face-outline';
      default: return 'heart';
    }
  };

  const getActivityIcon = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('feed') || actionLower.includes('fed')) return '🍖';
    if (actionLower.includes('water')) return '💧';
    if (actionLower.includes('walk')) return '🦮';
    if (actionLower.includes('play')) return '🎾';
    if (actionLower.includes('diaper')) return '🧷';
    if (actionLower.includes('sleep') || actionLower.includes('nap')) return '😴';
    if (actionLower.includes('medicine')) return '💊';
    if (actionLower.includes('groom') || actionLower.includes('bath')) return '🛁';
    return '✨';
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.plant.main} />
        <Text style={styles.loadingText}>Generating your report...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E8F5E9', '#F1F8E9', '#FFFDE7']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weekly Report</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Week Overview Card */}
        <LinearGradient
          colors={[Colors.plant.main, Colors.terracotta[400]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.overviewCard}
        >
          <Text style={styles.overviewTitle}>This Week's Summary</Text>
          <Text style={styles.overviewDate}>
            {new Date(report?.weekStart || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(report?.weekEnd || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{report?.totalActivities || 0}</Text>
              <Text style={styles.statLabel}>Activities</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{nurtures.length}</Text>
              <Text style={styles.statLabel}>Nurtures</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {Object.keys(report?.activitiesByType || {}).length}
              </Text>
              <Text style={styles.statLabel}>Types</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Encouragement */}
        <View style={styles.encouragementCard}>
          <Text style={styles.encouragementIcon}>💚</Text>
          <Text style={styles.encouragementText}>{report?.encouragement}</Text>
        </View>

        {/* Nurture Summaries */}
        <Text style={styles.sectionTitle}>Your Nurtures</Text>
        {report?.nurtureSummaries.map((summary, index) => (
          <View key={summary.nurtureId} style={styles.nurtureCard}>
            <View style={styles.nurtureHeader}>
              <View style={[
                styles.nurtureIcon,
                { backgroundColor: summary.nurtureType === 'pet' ? Colors.terracotta[100] : 
                  summary.nurtureType === 'plant' ? Colors.plant.light : Colors.babyBlue[100] }
              ]}>
                <MaterialCommunityIcons 
                  name={getNurtureIcon(summary.nurtureType)} 
                  size={24} 
                  color={summary.nurtureType === 'pet' ? Colors.terracotta[500] : 
                    summary.nurtureType === 'plant' ? Colors.plant.main : Colors.babyBlue[500]} 
                />
              </View>
              <View style={styles.nurtureInfo}>
                <Text style={styles.nurtureName}>{summary.nurtureName}</Text>
                <Text style={styles.nurtureActivities}>
                  {summary.activityCount} activities logged
                </Text>
              </View>
              {summary.avgHealthScore && (
                <View style={styles.healthBadge}>
                  <Text style={styles.healthScore}>
                    {summary.avgHealthScore.toFixed(1)} ⭐
                  </Text>
                </View>
              )}
            </View>
            
            {summary.topActivities.length > 0 && (
              <View style={styles.topActivities}>
                <Text style={styles.topActivitiesLabel}>Top activities:</Text>
                <View style={styles.activityTags}>
                  {summary.topActivities.map((activity, idx) => (
                    <View key={idx} style={styles.activityTag}>
                      <Text style={styles.activityTagText}>
                        {getActivityIcon(activity)} {activity}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        ))}

        {/* Activity Breakdown */}
        {Object.keys(report?.activitiesByType || {}).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Activity Breakdown</Text>
            <View style={styles.activityBreakdown}>
              {Object.entries(report?.activitiesByType || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([action, count], index) => (
                  <View key={action} style={styles.activityRow}>
                    <Text style={styles.activityName}>
                      {getActivityIcon(action)} {action}
                    </Text>
                    <View style={styles.activityBarContainer}>
                      <View 
                        style={[
                          styles.activityBar,
                          { 
                            width: `${(count / (report?.totalActivities || 1)) * 100}%`,
                            backgroundColor: index === 0 ? Colors.plant.main : 
                              index === 1 ? Colors.terracotta[400] : Colors.babyBlue[400]
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.activityCount}>{count}</Text>
                  </View>
                ))
              }
            </View>
          </>
        )}

        {/* Insights */}
        <Text style={styles.sectionTitle}>Insights</Text>
        <View style={styles.insightsCard}>
          {report?.insights.map((insight, index) => (
            <View key={index} style={styles.insightRow}>
              <Text style={styles.insightBullet}>💡</Text>
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>

        {/* Share Button */}
        <TouchableOpacity style={styles.shareButton}>
          <MaterialCommunityIcons name="share-variant" size={20} color={Colors.white} />
          <Text style={styles.shareButtonText}>Share Your Progress</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.gray[500],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  overviewCard: {
    borderRadius: BorderRadius.xl,
    padding: 24,
    marginBottom: 16,
  },
  overviewTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
  },
  overviewDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.white,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  encouragementCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.sm,
  },
  encouragementIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  encouragementText: {
    flex: 1,
    fontSize: 15,
    color: Colors.charcoal,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.charcoal,
    marginBottom: 12,
    marginTop: 8,
  },
  nurtureCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    marginBottom: 12,
    ...Shadows.sm,
  },
  nurtureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nurtureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nurtureInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nurtureName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.charcoal,
  },
  nurtureActivities: {
    fontSize: 13,
    color: Colors.gray[500],
    marginTop: 2,
  },
  healthBadge: {
    backgroundColor: Colors.plant.light,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  healthScore: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.plant.main,
  },
  topActivities: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  topActivitiesLabel: {
    fontSize: 12,
    color: Colors.gray[500],
    marginBottom: 8,
  },
  activityTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityTag: {
    backgroundColor: Colors.gray[50],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  activityTagText: {
    fontSize: 12,
    color: Colors.charcoal,
  },
  activityBreakdown: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    marginBottom: 16,
    ...Shadows.sm,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityName: {
    width: 100,
    fontSize: 13,
    color: Colors.charcoal,
  },
  activityBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.gray[100],
    borderRadius: 4,
    marginHorizontal: 12,
  },
  activityBar: {
    height: '100%',
    borderRadius: 4,
  },
  activityCount: {
    width: 30,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.charcoal,
    textAlign: 'right',
  },
  insightsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    marginBottom: 20,
    ...Shadows.sm,
  },
  insightRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  insightBullet: {
    fontSize: 16,
    marginRight: 10,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: Colors.charcoal,
    lineHeight: 20,
  },
  shareButton: {
    backgroundColor: Colors.plant.main,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: BorderRadius.full,
    marginBottom: 20,
    gap: 8,
  },
  shareButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
