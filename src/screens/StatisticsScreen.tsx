// Bloomie - Statistics & Charts Screen
// Visual data representation for care activities

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';

import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import { getNurtureColors } from '../constants/theme';
import type { RootStackParamList } from '../types';

const { width } = Dimensions.get('window');

type StatisticsRouteProp = RouteProp<RootStackParamList, 'Statistics'>;

export default function StatisticsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<StatisticsRouteProp>();
  const { nurtureId } = route.params || {};

  const { recentLogs, nurtures } = useAppStore();

  // Filter logs
  const filteredLogs = useMemo(() => {
    if (nurtureId) {
      return recentLogs.filter(log => log.nurture_id === nurtureId);
    }
    return recentLogs;
  }, [recentLogs, nurtureId]);

  const selectedNurture = nurtureId ? nurtures.find(n => n.id === nurtureId) : null;
  const colors = selectedNurture ? getNurtureColors(selectedNurture.type) : Colors.terracotta;

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Activity count by day
    const activityByDay = weekDays.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      return filteredLogs.filter(log => log.created_at.startsWith(dayStr)).length;
    });

    const weekDaysArray = weekDays; // Store for later use

    // Activity types
    const activityTypes: { [key: string]: number } = {};
    filteredLogs.forEach(log => {
      const action = log.parsed_action?.toLowerCase() || 'other';
      if (action.includes('feed') || action.includes('food')) {
        activityTypes['feeding'] = (activityTypes['feeding'] || 0) + 1;
      } else if (action.includes('water')) {
        activityTypes['watering'] = (activityTypes['watering'] || 0) + 1;
      } else if (action.includes('walk') || action.includes('play')) {
        activityTypes['exercise'] = (activityTypes['exercise'] || 0) + 1;
      } else {
        activityTypes['other'] = (activityTypes['other'] || 0) + 1;
      }
    });

    // Total entries
    const totalEntries = filteredLogs.length;
    
    // This week entries
    const thisWeekEntries = filteredLogs.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= weekStart && logDate <= weekEnd;
    }).length;

    // Average per day
    const daysActive = new Set(
      filteredLogs.map(log => format(new Date(log.created_at), 'yyyy-MM-dd'))
    ).size;
    const avgPerDay = daysActive > 0 ? (totalEntries / daysActive).toFixed(1) : '0';

    return {
      totalEntries,
      thisWeekEntries,
      avgPerDay,
      activityByDay,
      activityTypes,
      maxActivity: Math.max(...activityByDay, 1),
      weekDays: weekDaysArray,
    };
  }, [filteredLogs]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={Colors.charcoal}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedNurture ? `${selectedNurture.name} Statistics` : 'Statistics'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.light }]}>
            <MaterialCommunityIcons
              name="chart-line"
              size={24}
              color={colors.main}
            />
            <Text style={[styles.summaryValue, { color: colors.main }]}>
              {stats.totalEntries}
            </Text>
            <Text style={styles.summaryLabel}>Total Entries</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.light }]}>
            <MaterialCommunityIcons
              name="calendar-week"
              size={24}
              color={colors.main}
            />
            <Text style={[styles.summaryValue, { color: colors.main }]}>
              {stats.thisWeekEntries}
            </Text>
            <Text style={styles.summaryLabel}>This Week</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.light }]}>
            <MaterialCommunityIcons
              name="chart-bar"
              size={24}
              color={colors.main}
            />
            <Text style={[styles.summaryValue, { color: colors.main }]}>
              {stats.avgPerDay}
            </Text>
            <Text style={styles.summaryLabel}>Avg/Day</Text>
          </View>
        </View>

        {/* Weekly Activity Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Weekly Activity</Text>
          <View style={styles.chartContainer}>
            {stats.activityByDay.map((count, index) => {
              const height = (count / stats.maxActivity) * 100;
              const dayName = format(stats.weekDays[index], 'EEE');
              const isToday = isSameDay(stats.weekDays[index], new Date());

              return (
                <View key={index} style={styles.chartBarContainer}>
                  <View style={styles.chartBarWrapper}>
                    <View
                      style={[
                        styles.chartBar,
                        {
                          height: `${Math.max(height, 5)}%`,
                          backgroundColor: isToday ? colors.main : colors.light,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.chartDayLabel, isToday && styles.chartDayLabelToday]}>
                    {dayName}
                  </Text>
                  <Text style={styles.chartValue}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Activity Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Breakdown</Text>
          <View style={styles.activityTypesList}>
            {Object.entries(stats.activityTypes).map(([type, count]) => {
              const percentage = stats.totalEntries > 0 
                ? ((count / stats.totalEntries) * 100).toFixed(0)
                : '0';
              
              return (
                <View key={type} style={styles.activityTypeItem}>
                  <View style={styles.activityTypeHeader}>
                    <Text style={styles.activityTypeName}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                    <Text style={styles.activityTypeCount}>
                      {count} ({percentage}%)
                    </Text>
                  </View>
                  <View style={styles.activityTypeBar}>
                    <View
                      style={[
                        styles.activityTypeBarFill,
                        {
                          width: `${percentage}%`,
                          backgroundColor: colors.main,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: BorderRadius.xl,
    ...Shadows.sm,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray[600],
  },
  chartSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.charcoal,
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 200,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 16,
    ...Shadows.sm,
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chartBarWrapper: {
    width: '80%',
    height: 120,
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  chartDayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gray[500],
    marginTop: 8,
  },
  chartDayLabelToday: {
    color: Colors.terracotta[600],
    fontWeight: '700',
  },
  chartValue: {
    fontSize: 10,
    color: Colors.gray[400],
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  activityTypesList: {
    gap: 12,
  },
  activityTypeItem: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    ...Shadows.sm,
  },
  activityTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityTypeName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.charcoal,
  },
  activityTypeCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[500],
  },
  activityTypeBar: {
    height: 8,
    backgroundColor: Colors.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  activityTypeBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
