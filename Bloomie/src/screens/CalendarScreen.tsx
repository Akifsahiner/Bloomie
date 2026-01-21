// Bloomie - Calendar Screen

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';

import { Colors, Spacing, BorderRadius, Shadows, getNurtureColors } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';

const { width } = Dimensions.get('window');
const DAY_SIZE = (width - 48 - 24) / 7; // Account for padding and gaps

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { recentLogs, nurtures } = useAppStore();

  // Get calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get logs for selected date
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedLogs = recentLogs.filter(log => 
    log.created_at.startsWith(selectedDateStr)
  );

  // Check if date has logs
  const hasLogs = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return recentLogs.some(log => log.created_at.startsWith(dateStr));
  };

  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
          <Text style={styles.title}>Calendar</Text>
        </View>

        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            style={styles.monthNavButton}
            onPress={goToPrevMonth}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={24}
              color={Colors.charcoal}
            />
          </TouchableOpacity>
          
          <Text style={styles.monthTitle}>
            {format(currentMonth, 'MMMM yyyy')}
          </Text>
          
          <TouchableOpacity
            style={styles.monthNavButton}
            onPress={goToNextMonth}
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={Colors.charcoal}
            />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarContainer}>
          {/* Week Day Headers */}
          <View style={styles.weekDaysRow}>
            {weekDays.map(day => (
              <View key={day} style={styles.weekDayCell}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Days */}
          <View style={styles.daysGrid}>
            {calendarDays.map((day, index) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const dayHasLogs = hasLogs(day);

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                  onPress={() => setSelectedDate(day)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !isCurrentMonth && styles.dayTextMuted,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                  {dayHasLogs && (
                    <View 
                      style={[
                        styles.logIndicator,
                        isSelected && styles.logIndicatorSelected,
                      ]} 
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Date Logs */}
        <View style={styles.logsSection}>
          <Text style={styles.logsSectionTitle}>
            {format(selectedDate, 'EEEE, MMMM d')}
          </Text>

          {selectedLogs.length > 0 ? (
            <View style={styles.logsList}>
              {selectedLogs.map((log) => {
                const nurture = nurtures.find(n => n.id === log.nurture_id);
                const colors = nurture ? getNurtureColors(nurture.type) : Colors.terracotta;

                return (
                  <View key={log.id} style={styles.logCard}>
                    <View 
                      style={[
                        styles.logIndicatorBar,
                        { backgroundColor: colors.main }
                      ]} 
                    />
                    <View style={styles.logContent}>
                      <View style={styles.logHeader}>
                        <Text style={[styles.logNurture, { color: colors.main }]}>
                          {nurture?.name || 'Unknown'}
                        </Text>
                        <Text style={styles.logTime}>
                          {format(new Date(log.created_at), 'h:mm a')}
                        </Text>
                      </View>
                      <Text style={styles.logText}>
                        {log.parsed_notes || log.raw_input}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyLogs}>
              <MaterialCommunityIcons
                name="calendar-blank-outline"
                size={48}
                color={Colors.gray[300]}
              />
              <Text style={styles.emptyLogsText}>
                No entries on this day
              </Text>
            </View>
          )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.charcoal,
    letterSpacing: -0.5,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  monthNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  calendarContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginBottom: 24,
    ...Shadows.soft,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekDayCell: {
    width: DAY_SIZE,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gray[400],
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DAY_SIZE / 2,
  },
  dayCellSelected: {
    backgroundColor: Colors.terracotta[500],
  },
  dayCellToday: {
    backgroundColor: Colors.terracotta[100],
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.charcoal,
  },
  dayTextMuted: {
    color: Colors.gray[300],
  },
  dayTextSelected: {
    color: Colors.white,
    fontWeight: '700',
  },
  logIndicator: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.terracotta[500],
  },
  logIndicatorSelected: {
    backgroundColor: Colors.white,
  },
  logsSection: {
    flex: 1,
  },
  logsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.charcoal,
    marginBottom: 16,
  },
  logsList: {
    gap: 12,
  },
  logCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  logIndicatorBar: {
    width: 4,
  },
  logContent: {
    flex: 1,
    padding: 16,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logNurture: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logTime: {
    fontSize: 12,
    color: Colors.gray[400],
    fontWeight: '500',
  },
  logText: {
    fontSize: 14,
    color: Colors.charcoal,
    lineHeight: 20,
  },
  emptyLogs: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
  },
  emptyLogsText: {
    fontSize: 14,
    color: Colors.gray[400],
    marginTop: 12,
  },
});

