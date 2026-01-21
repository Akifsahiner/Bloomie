// Bloomie - Insights Screen (AI Analytics)

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
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { Colors, Spacing, BorderRadius, Shadows, getNurtureColors } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import { generateInsights } from '../services/openai';
import type { Nurture } from '../types';

const { width } = Dimensions.get('window');

// Insight Card Component
const InsightCard = ({ 
  icon, 
  title, 
  value, 
  subtitle, 
  color 
}: { 
  icon: string; 
  title: string; 
  value: string; 
  subtitle: string;
  color: string;
}) => (
  <View style={[styles.insightCard, { borderLeftColor: color }]}>
    <View style={[styles.insightIcon, { backgroundColor: `${color}20` }]}>
      <MaterialCommunityIcons
        name={icon as any}
        size={20}
        color={color}
      />
    </View>
    <View style={styles.insightContent}>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={styles.insightValue}>{value}</Text>
      <Text style={styles.insightSubtitle}>{subtitle}</Text>
    </View>
  </View>
);

// AI Pattern Card
const PatternCard = ({ pattern, type }: { pattern: string; type: 'pattern' | 'suggestion' | 'concern' }) => {
  const getIcon = () => {
    switch (type) {
      case 'pattern': return 'chart-line';
      case 'suggestion': return 'lightbulb-outline';
      case 'concern': return 'alert-circle-outline';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'pattern': return Colors.baby.main;
      case 'suggestion': return Colors.plant.main;
      case 'concern': return Colors.warning;
    }
  };

  return (
    <View style={styles.patternCard}>
      <View style={[styles.patternIcon, { backgroundColor: `${getColor()}20` }]}>
        <MaterialCommunityIcons
          name={getIcon()}
          size={18}
          color={getColor()}
        />
      </View>
      <Text style={styles.patternText}>{pattern}</Text>
    </View>
  );
};

// Nurture Stats Card
const NurtureStatsCard = ({ nurture }: { nurture: Nurture }) => {
  const colors = getNurtureColors(nurture.type);
  const { recentLogs } = useAppStore();
  
  const nurtureLogs = recentLogs.filter(log => log.nurture_id === nurture.id);
  const todayLogs = nurtureLogs.filter(log => 
    log.created_at.startsWith(new Date().toISOString().split('T')[0])
  );

  const iconName = nurture.type === 'baby' ? 'baby-face-outline' : 
                   nurture.type === 'pet' ? 'paw' : 'flower-tulip-outline';

  return (
    <TouchableOpacity 
      style={[styles.nurtureStatsCard, { backgroundColor: `${colors.light}66` }]}
      activeOpacity={0.8}
    >
      <View style={styles.nurtureStatsHeader}>
        <View style={[styles.nurtureStatsIcon, { backgroundColor: Colors.white }]}>
          <MaterialCommunityIcons
            name={iconName as any}
            size={20}
            color={colors.main}
          />
        </View>
        <Text style={styles.nurtureStatsName}>{nurture.name}</Text>
      </View>
      
      <View style={styles.nurtureStatsBody}>
        <View style={styles.nurtureStat}>
          <Text style={[styles.nurtureStatValue, { color: colors.main }]}>
            {todayLogs.length}
          </Text>
          <Text style={styles.nurtureStatLabel}>Today</Text>
        </View>
        <View style={styles.nurtureStat}>
          <Text style={[styles.nurtureStatValue, { color: colors.main }]}>
            {nurtureLogs.length}
          </Text>
          <Text style={styles.nurtureStatLabel}>Total</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  
  const { nurtures, recentLogs, isPremium } = useAppStore();

  // Calculate overall stats
  const totalLogs = recentLogs.length;
  const todayLogsCount = recentLogs.filter(log => 
    log.created_at.startsWith(new Date().toISOString().split('T')[0])
  ).length;
  const thisWeekLogs = recentLogs.filter(log => {
    const logDate = new Date(log.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return logDate > weekAgo;
  }).length;

  const loadAiInsights = async () => {
    if (nurtures.length === 0 || recentLogs.length < 3) return;
    
    setIsLoadingInsights(true);
    try {
      const result = await generateInsights(nurtures[0], recentLogs);
      // Transform object into formatted string array for display
      const formattedInsights: string[] = [
        ...result.patterns.map(p => `📊 ${p}`),
        ...result.suggestions.map(s => `💡 ${s}`),
        ...result.concerns.map(c => `⚠️ ${c}`),
      ];
      setAiInsights(formattedInsights);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (isPremium) {
      loadAiInsights();
    }
  }, [isPremium, nurtures.length, recentLogs.length]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
          {!isPremium && (
            <TouchableOpacity
              style={styles.premiumBadge}
              onPress={() => navigation.navigate('Premium' as never)}
            >
              <MaterialCommunityIcons
                name="star"
                size={14}
                color={Colors.white}
              />
              <Text style={styles.premiumBadgeText}>Premium</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <InsightCard
            icon="calendar-check"
            title="Today"
            value={todayLogsCount.toString()}
            subtitle="entries logged"
            color={Colors.baby.main}
          />
          <InsightCard
            icon="calendar-week"
            title="This Week"
            value={thisWeekLogs.toString()}
            subtitle="entries logged"
            color={Colors.pet.main}
          />
          <InsightCard
            icon="chart-timeline-variant"
            title="All Time"
            value={totalLogs.toString()}
            subtitle="total entries"
            color={Colors.plant.main}
          />
        </View>

        {/* AI Insights - Premium Feature */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>AI Patterns</Text>
            {isPremium && (
              <TouchableOpacity onPress={loadAiInsights}>
                <MaterialCommunityIcons
                  name="refresh"
                  size={20}
                  color={Colors.terracotta[500]}
                />
              </TouchableOpacity>
            )}
          </View>

          {!isPremium ? (
            <TouchableOpacity
              style={styles.premiumPrompt}
              onPress={() => navigation.navigate('Premium' as never)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[Colors.terracotta[400], Colors.terracotta[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.premiumPromptGradient}
              >
                <MaterialCommunityIcons
                  name="robot-outline"
                  size={32}
                  color={Colors.white}
                />
                <View style={styles.premiumPromptText}>
                  <Text style={styles.premiumPromptTitle}>
                    Unlock AI Insights
                  </Text>
                  <Text style={styles.premiumPromptSubtitle}>
                    Discover patterns like "Leo sleeps best after 8pm feeds"
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={Colors.white}
                />
              </LinearGradient>
            </TouchableOpacity>
          ) : isLoadingInsights ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={Colors.terracotta[500]} />
              <Text style={styles.loadingText}>Analyzing patterns...</Text>
            </View>
          ) : aiInsights.length > 0 ? (
            <View style={styles.patternsContainer}>
              {aiInsights.map((insight, index) => (
                <PatternCard
                  key={index}
                  pattern={insight.substring(2)} // Remove emoji prefix
                  type={
                    insight.startsWith('📊') ? 'pattern' :
                    insight.startsWith('💡') ? 'suggestion' : 'concern'
                  }
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyPatterns}>
              <MaterialCommunityIcons
                name="robot-confused-outline"
                size={48}
                color={Colors.gray[300]}
              />
              <Text style={styles.emptyPatternsText}>
                Keep logging to discover patterns!
              </Text>
            </View>
          )}
        </View>

        {/* Nurture Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Nurtures</Text>
          
          {nurtures.length > 0 ? (
            <View style={styles.nurtureStatsGrid}>
              {nurtures.map(nurture => (
                <NurtureStatsCard key={nurture.id} nurture={nurture} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyNurtures}>
              <Text style={styles.emptyNurturesText}>
                Add a nurture to see stats
              </Text>
            </View>
          )}
        </View>

        {/* Premium Features Preview */}
        {!isPremium && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Premium Features</Text>
            <View style={styles.premiumFeatures}>
              {[
                { icon: 'chart-areaspline', title: 'Growth Charts', desc: 'Track progress visually' },
                { icon: 'file-export-outline', title: 'Export Data', desc: 'PDF & CSV reports' },
                { icon: 'palette-outline', title: 'Custom Themes', desc: 'Personalize your app' },
              ].map((feature, index) => (
                <View key={index} style={styles.premiumFeatureCard}>
                  <View style={styles.premiumFeatureIcon}>
                    <MaterialCommunityIcons
                      name={feature.icon as any}
                      size={24}
                      color={Colors.terracotta[500]}
                    />
                  </View>
                  <Text style={styles.premiumFeatureTitle}>{feature.title}</Text>
                  <Text style={styles.premiumFeatureDesc}>{feature.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.charcoal,
    letterSpacing: -0.5,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.terracotta[500],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 32,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    borderLeftWidth: 4,
    ...Shadows.sm,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.charcoal,
    marginVertical: 2,
  },
  insightSubtitle: {
    fontSize: 12,
    color: Colors.gray[400],
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.charcoal,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  premiumPrompt: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.md,
  },
  premiumPromptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  premiumPromptText: {
    flex: 1,
  },
  premiumPromptTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  premiumPromptSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: 12,
  },
  patternsContainer: {
    gap: 12,
  },
  patternCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    gap: 12,
    ...Shadows.sm,
  },
  patternIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patternText: {
    flex: 1,
    fontSize: 14,
    color: Colors.charcoal,
    lineHeight: 20,
  },
  emptyPatterns: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
  },
  emptyPatternsText: {
    fontSize: 14,
    color: Colors.gray[400],
    marginTop: 12,
  },
  nurtureStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nurtureStatsCard: {
    width: (width - 48 - 12) / 2,
    padding: 16,
    borderRadius: BorderRadius.xl,
  },
  nurtureStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  nurtureStatsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  nurtureStatsName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  nurtureStatsBody: {
    flexDirection: 'row',
    gap: 20,
  },
  nurtureStat: {},
  nurtureStatValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  nurtureStatLabel: {
    fontSize: 11,
    color: Colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyNurtures: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
  },
  emptyNurturesText: {
    fontSize: 14,
    color: Colors.gray[400],
  },
  premiumFeatures: {
    flexDirection: 'row',
    gap: 12,
  },
  premiumFeatureCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    alignItems: 'center',
    ...Shadows.sm,
  },
  premiumFeatureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.terracotta[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  premiumFeatureTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.charcoal,
    textAlign: 'center',
    marginBottom: 4,
  },
  premiumFeatureDesc: {
    fontSize: 10,
    color: Colors.gray[500],
    textAlign: 'center',
  },
});

