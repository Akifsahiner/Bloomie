// Bloomie - Health & Mood Tracking Screen
// Track nurture health over time with beautiful visualizations

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import type { Nurture, RootStackParamList } from '../types';

const { width } = Dimensions.get('window');

type HealthTrackingRouteProp = RouteProp<RootStackParamList, 'HealthTracking'>;

interface HealthEntry {
  date: string;
  score: number;
  mood: string;
  notes?: string;
}

const MOODS = [
  { id: 'happy', emoji: '😊', label: 'Happy', color: Colors.plant.main },
  { id: 'neutral', emoji: '😐', label: 'Okay', color: Colors.gray[400] },
  { id: 'tired', emoji: '😴', label: 'Tired', color: Colors.babyBlue[400] },
  { id: 'sad', emoji: '😢', label: 'Sad', color: Colors.terracotta[400] },
  { id: 'energetic', emoji: '🤩', label: 'Energetic', color: '#FFD700' },
];

const HEALTH_SCORES = [
  { score: 5, label: 'Excellent', color: Colors.plant.main, emoji: '🌟' },
  { score: 4, label: 'Good', color: '#8BC34A', emoji: '✨' },
  { score: 3, label: 'Fair', color: Colors.terracotta[300], emoji: '👍' },
  { score: 2, label: 'Poor', color: Colors.terracotta[500], emoji: '⚠️' },
  { score: 1, label: 'Critical', color: '#E53935', emoji: '🚨' },
];

export default function HealthTrackingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<HealthTrackingRouteProp>();
  
  const { nurtures, recentLogs } = useAppStore();
  
  const [selectedNurture, setSelectedNurture] = useState<Nurture | null>(
    route.params?.nurtureId 
      ? nurtures.find(n => n.id === route.params.nurtureId) || null 
      : nurtures[0] || null
  );
  
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [healthHistory, setHealthHistory] = useState<HealthEntry[]>([]);

  useEffect(() => {
    // Generate mock health history from logs
    generateHealthHistory();
  }, [selectedNurture, recentLogs]);

  const generateHealthHistory = () => {
    if (!selectedNurture) return;

    const nurtureLogs = recentLogs.filter(log => log.nurture_id === selectedNurture.id);
    const last7Days: HealthEntry[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayLogs = nurtureLogs.filter(log => 
        log.created_at.startsWith(dateStr)
      );

      // Calculate average health score from logs or generate based on activity
      const healthScores = dayLogs
        .filter(log => log.health_score)
        .map(log => log.health_score as number);

      const avgScore = healthScores.length > 0
        ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
        : dayLogs.length > 0 ? 4 : 3; // Good if active, Fair if not

      const moods = dayLogs
        .filter(log => log.mood)
        .map(log => log.mood as string);
      
      const mood = moods[moods.length - 1] || (avgScore >= 4 ? 'happy' : 'neutral');

      last7Days.push({
        date: dateStr,
        score: avgScore,
        mood,
        notes: dayLogs.length > 0 ? `${dayLogs.length} activities logged` : undefined,
      });
    }

    setHealthHistory(last7Days);
  };

  const saveHealthCheck = () => {
    if (!selectedMood || !selectedScore) {
      Alert.alert('Incomplete', 'Please select both mood and health score.');
      return;
    }

    // In a real app, this would save to Supabase
    Alert.alert(
      'Health Check Saved! 💚',
      `${selectedNurture?.name}'s health has been recorded.`,
      [{ text: 'Great!', onPress: () => {
        setSelectedMood(null);
        setSelectedScore(null);
      }}]
    );
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getScoreColor = (score: number) => {
    const scoreInfo = HEALTH_SCORES.find(s => s.score === score);
    return scoreInfo?.color || Colors.gray[400];
  };

  const getMoodEmoji = (moodId: string) => {
    const mood = MOODS.find(m => m.id === moodId);
    return mood?.emoji || '😐';
  };

  // Calculate trend
  const calculateTrend = () => {
    if (healthHistory.length < 3) return 'neutral';
    const recent = healthHistory.slice(-3).map(h => h.score);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const older = healthHistory.slice(0, 3).map(h => h.score);
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    if (avg > olderAvg + 0.3) return 'up';
    if (avg < olderAvg - 0.3) return 'down';
    return 'neutral';
  };

  const trend = calculateTrend();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E3F2FD', '#E8F5E9', '#FFF8E1']}
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
        <Text style={styles.headerTitle}>Health Tracking 📊</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Nurture Selector */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.nurtureSelector}
        >
          {nurtures.map(nurture => (
            <TouchableOpacity
              key={nurture.id}
              style={[
                styles.nurtureChip,
                selectedNurture?.id === nurture.id && styles.nurtureChipActive,
              ]}
              onPress={() => setSelectedNurture(nurture)}
            >
              <MaterialCommunityIcons
                name={nurture.type === 'pet' ? 'paw' : nurture.type === 'plant' ? 'leaf' : 'baby-face-outline'}
                size={16}
                color={selectedNurture?.id === nurture.id ? Colors.white : Colors.charcoal}
              />
              <Text style={[
                styles.nurtureChipText,
                selectedNurture?.id === nurture.id && styles.nurtureChipTextActive,
              ]}>
                {nurture.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Trend Card */}
        <View style={styles.trendCard}>
          <View style={styles.trendHeader}>
            <View style={styles.trendIconContainer}>
              <MaterialCommunityIcons 
                name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'trending-neutral'}
                size={32}
                color={trend === 'up' ? Colors.plant.main : trend === 'down' ? Colors.terracotta[500] : Colors.gray[400]}
              />
            </View>
            <View style={styles.trendInfo}>
              <Text style={styles.trendTitle}>
                {trend === 'up' ? 'Improving! 🎉' : trend === 'down' ? 'Needs attention 💚' : 'Stable 👍'}
              </Text>
              <Text style={styles.trendSubtitle}>
                {selectedNurture?.name}'s health trend this week
              </Text>
            </View>
          </View>
        </View>

        {/* Health Graph */}
        <View style={styles.graphCard}>
          <Text style={styles.sectionTitle}>7-Day Health Overview</Text>
          
          <View style={styles.graphContainer}>
            {healthHistory.map((entry, index) => (
              <View key={entry.date} style={styles.graphBar}>
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.bar,
                      { 
                        height: `${(entry.score / 5) * 100}%`,
                        backgroundColor: getScoreColor(entry.score),
                      }
                    ]}
                  />
                </View>
                <Text style={styles.barMood}>{getMoodEmoji(entry.mood)}</Text>
                <Text style={styles.barLabel}>{getDateLabel(entry.date)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.legendRow}>
            {HEALTH_SCORES.slice(0, 3).map(score => (
              <View key={score.score} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: score.color }]} />
                <Text style={styles.legendText}>{score.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Log Today's Health */}
        <View style={styles.logCard}>
          <Text style={styles.sectionTitle}>How is {selectedNurture?.name} today?</Text>

          {/* Mood Selection */}
          <Text style={styles.subLabel}>Mood</Text>
          <View style={styles.moodRow}>
            {MOODS.map(mood => (
              <TouchableOpacity
                key={mood.id}
                style={[
                  styles.moodButton,
                  selectedMood === mood.id && { backgroundColor: mood.color + '20', borderColor: mood.color },
                ]}
                onPress={() => setSelectedMood(mood.id)}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text style={[
                  styles.moodLabel,
                  selectedMood === mood.id && { color: mood.color, fontWeight: '600' },
                ]}>
                  {mood.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Health Score */}
          <Text style={styles.subLabel}>Health Score</Text>
          <View style={styles.scoreRow}>
            {HEALTH_SCORES.map(score => (
              <TouchableOpacity
                key={score.score}
                style={[
                  styles.scoreButton,
                  selectedScore === score.score && { backgroundColor: score.color, borderColor: score.color },
                ]}
                onPress={() => setSelectedScore(score.score)}
              >
                <Text style={[
                  styles.scoreNumber,
                  selectedScore === score.score && { color: Colors.white },
                ]}>
                  {score.score}
                </Text>
                <Text style={[
                  styles.scoreLabel,
                  selectedScore === score.score && { color: Colors.white },
                ]}>
                  {score.emoji}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!selectedMood || !selectedScore) && styles.saveButtonDisabled,
            ]}
            onPress={saveHealthCheck}
            disabled={!selectedMood || !selectedScore}
          >
            <LinearGradient
              colors={selectedMood && selectedScore 
                ? [Colors.plant.main, Colors.terracotta[400]]
                : [Colors.gray[300], Colors.gray[400]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              <MaterialCommunityIcons name="check" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Save Health Check</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Recent History */}
        <Text style={styles.sectionTitleOutside}>Recent History</Text>
        {healthHistory.slice().reverse().slice(0, 5).map((entry, index) => (
          <View key={entry.date} style={styles.historyCard}>
            <View style={[styles.historyScore, { backgroundColor: getScoreColor(entry.score) }]}>
              <Text style={styles.historyScoreText}>{entry.score}</Text>
            </View>
            <View style={styles.historyInfo}>
              <Text style={styles.historyDate}>{getDateLabel(entry.date)}</Text>
              <Text style={styles.historyNotes}>{entry.notes || 'No activities logged'}</Text>
            </View>
            <Text style={styles.historyMood}>{getMoodEmoji(entry.mood)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF5',
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
  nurtureSelector: {
    marginBottom: 16,
  },
  nurtureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    marginRight: 10,
    gap: 6,
    ...Shadows.sm,
  },
  nurtureChipActive: {
    backgroundColor: Colors.plant.main,
  },
  nurtureChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.charcoal,
  },
  nurtureChipTextActive: {
    color: Colors.white,
  },
  trendCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 20,
    marginBottom: 16,
    ...Shadows.md,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendInfo: {
    flex: 1,
    marginLeft: 16,
  },
  trendTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  trendSubtitle: {
    fontSize: 13,
    color: Colors.gray[500],
    marginTop: 4,
  },
  graphCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 20,
    marginBottom: 16,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.charcoal,
    marginBottom: 16,
  },
  sectionTitleOutside: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.charcoal,
    marginBottom: 12,
    marginTop: 8,
  },
  graphContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 140,
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  graphBar: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    width: 20,
    height: 100,
    backgroundColor: Colors.gray[100],
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 10,
  },
  barMood: {
    fontSize: 16,
    marginTop: 6,
  },
  barLabel: {
    fontSize: 10,
    color: Colors.gray[500],
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: Colors.gray[500],
  },
  logCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 20,
    marginBottom: 16,
    ...Shadows.sm,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray[500],
    marginBottom: 10,
    marginTop: 8,
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moodButton: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.gray[50],
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 60,
  },
  moodEmoji: {
    fontSize: 24,
  },
  moodLabel: {
    fontSize: 11,
    color: Colors.gray[500],
    marginTop: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
  },
  scoreButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: Colors.gray[50],
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  scoreNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  scoreLabel: {
    fontSize: 14,
    marginTop: 2,
  },
  saveButton: {
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    gap: 8,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.sm,
  },
  historyScore: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyScoreText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  historyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.charcoal,
  },
  historyNotes: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 2,
  },
  historyMood: {
    fontSize: 24,
  },
});
