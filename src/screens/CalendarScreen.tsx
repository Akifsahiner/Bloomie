// Bloomie - Calendar Screen (Enhanced)
// Modern, visual calendar with daily routine cards

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
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
  isToday,
} from 'date-fns';

import { Colors, Spacing, BorderRadius, Shadows, getNurtureColors } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';

const { width } = Dimensions.get('window');
const DAY_SIZE = (width - 48 - 24) / 7;

// Get emoji for nurture type
const getNurtureEmoji = (type: string) => {
  switch (type) {
    case 'baby': return '👶';
    case 'pet': return '🐾';
    case 'plant': return '🌿';
    default: return '💚';
  }
};

// Get task icon based on log content
const getTaskIcon = (logText: string, type: string) => {
  const text = logText.toLowerCase();
  if (type === 'baby') {
    if (text.includes('bath') || text.includes('banyo')) return '🛁';
    if (text.includes('feed') || text.includes('milk') || text.includes('süt')) return '🍼';
    if (text.includes('sleep') || text.includes('uyku')) return '😴';
    if (text.includes('diaper') || text.includes('bez')) return '👶';
    return '👶';
  }
  if (type === 'pet') {
    if (text.includes('play') || text.includes('oyun')) return '🎾';
    if (text.includes('walk') || text.includes('yürü')) return '🚶';
    if (text.includes('feed') || text.includes('yemek')) return '🍽️';
    if (text.includes('groom') || text.includes('tımar')) return '✂️';
    return '🐾';
  }
  if (type === 'plant') {
    if (text.includes('water') || text.includes('su')) return '💧';
    if (text.includes('sun') || text.includes('güneş')) return '☀️';
    if (text.includes('fertiliz') || text.includes('gübre')) return '🌱';
    return '🌿';
  }
  return '💚';
};

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { recentLogs, nurtures, upcomingReminders } = useAppStore();

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

  // Get reminders for selected date
  const selectedReminders = upcomingReminders.filter(reminder => 
    reminder.scheduled_at.startsWith(selectedDateStr) && !reminder.is_completed
  );

  // Check if date has logs
  const hasLogs = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return recentLogs.some(log => log.created_at.startsWith(dateStr));
  };

  // Get log count for date (for visual indicator)
  const getLogCount = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return recentLogs.filter(log => log.created_at.startsWith(dateStr)).length;
  };

  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
          <View>
            <Text style={styles.title}>Daily Routine</Text>
            <Text style={styles.subtitle}>
              {format(selectedDate, 'EEEE, MMMM d')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.todayButton}
            onPress={goToToday}
          >
            <MaterialCommunityIcons
              name="calendar-today"
              size={18}
              color={Colors.terracotta[600]}
            />
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
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
            {weekDays.map((day, index) => (
              <View key={index} style={styles.weekDayCell}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Days */}
          <View style={styles.daysGrid}>
            {calendarDays.map((day, index) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              const dayHasLogs = hasLogs(day);
              const logCount = getLogCount(day);

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isTodayDate && !isSelected && styles.dayCellToday,
                  ]}
                  onPress={() => setSelectedDate(day)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !isCurrentMonth && styles.dayTextMuted,
                      isSelected && styles.dayTextSelected,
                      isTodayDate && !isSelected && styles.dayTextToday,
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                  {dayHasLogs && (
                    <View style={styles.logIndicators}>
                      {logCount > 0 && (
                        <View 
                          style={[
                            styles.logIndicator,
                            isSelected && styles.logIndicatorSelected,
                            logCount > 3 && styles.logIndicatorMany,
                          ]} 
                        />
                      )}
                      {logCount > 1 && (
                        <View 
                          style={[
                            styles.logIndicator,
                            styles.logIndicatorSecond,
                            isSelected && styles.logIndicatorSelected,
                          ]} 
                        />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Daily Tasks Section */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>Today's Activities</Text>

          {selectedLogs.length > 0 || selectedReminders.length > 0 ? (
            <View style={styles.tasksList}>
              {/* Completed Tasks (Logs) */}
              {selectedLogs.map((log) => {
                const nurture = nurtures.find(n => n.id === log.nurture_id);
                const colors = nurture ? getNurtureColors(nurture.type) : Colors.terracotta;
                const emoji = nurture ? getNurtureEmoji(nurture.type) : '💚';
                const taskIcon = getTaskIcon(log.parsed_notes || log.raw_input, nurture?.type || '');

                return (
                  <View key={log.id} style={styles.taskCard}>
                    <View style={styles.taskCardLeft}>
                      <View 
                        style={[
                          styles.taskIconContainer,
                          { backgroundColor: colors.light }
                        ]}
                      >
                        <Text style={styles.taskEmoji}>{taskIcon}</Text>
                      </View>
                      <View style={styles.taskContent}>
                        <View style={styles.taskHeader}>
                          <Text style={styles.taskNurture}>
                            {emoji} {nurture?.name || 'Unknown'}
                          </Text>
                          <View style={styles.checkmarkContainer}>
                            <MaterialCommunityIcons
                              name="check-circle"
                              size={20}
                              color={colors.main}
                            />
                          </View>
                        </View>
                        <Text style={styles.taskText} numberOfLines={2}>
                          {log.parsed_notes || log.raw_input}
                        </Text>
                        <Text style={styles.taskTime}>
                          {format(new Date(log.created_at), 'h:mm a')}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Pending Reminders */}
              {selectedReminders.map((reminder) => {
                const nurture = nurtures.find(n => n.id === reminder.nurture_id);
                const colors = nurture ? getNurtureColors(nurture.type) : Colors.terracotta;
                const emoji = nurture ? getNurtureEmoji(nurture.type) : '💚';

                return (
                  <View key={reminder.id} style={[styles.taskCard, styles.taskCardPending]}>
                    <View style={styles.taskCardLeft}>
                      <View 
                        style={[
                          styles.taskIconContainer,
                          styles.taskIconContainerPending,
                          { borderColor: colors.main }
                        ]}
                      >
                        <Text style={styles.taskEmoji}>{emoji}</Text>
                      </View>
                      <View style={styles.taskContent}>
                        <View style={styles.taskHeader}>
                          <Text style={styles.taskNurture}>
                            {emoji} {nurture?.name || 'Unknown'}
                          </Text>
                          <View style={styles.pendingIndicator}>
                            <View 
                              style={[
                                styles.pendingDot,
                                { backgroundColor: colors.main }
                              ]} 
                            />
                          </View>
                        </View>
                        <Text style={styles.taskText} numberOfLines={2}>
                          {reminder.title}
                        </Text>
                        <Text style={styles.taskTime}>
                          {format(new Date(reminder.scheduled_at), 'h:mm a')}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyTasks}>
              <MaterialCommunityIcons
                name="calendar-check-outline"
                size={64}
                color={Colors.gray[300]}
              />
              <Text style={styles.emptyTasksTitle}>No activities today</Text>
              <Text style={styles.emptyTasksText}>
                Start tracking your care routine to see activities here
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.charcoal,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.gray[500],
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.terracotta[50],
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.terracotta[200],
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.terracotta[600],
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  monthNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  calendarContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 20,
    marginBottom: 24,
    ...Shadows.soft,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  weekDayCell: {
    width: DAY_SIZE,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.gray[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dayCell: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DAY_SIZE / 2,
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: Colors.terracotta[500],
  },
  dayCellToday: {
    backgroundColor: Colors.terracotta[100],
    borderWidth: 2,
    borderColor: Colors.terracotta[300],
  },
  dayText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.charcoal,
  },
  dayTextMuted: {
    color: Colors.gray[300],
  },
  dayTextSelected: {
    color: Colors.white,
    fontWeight: '700',
  },
  dayTextToday: {
    color: Colors.terracotta[700],
    fontWeight: '700',
  },
  logIndicators: {
    position: 'absolute',
    bottom: 4,
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.terracotta[500],
  },
  logIndicatorSecond: {
    marginLeft: 2,
  },
  logIndicatorMany: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  logIndicatorSelected: {
    backgroundColor: Colors.white,
  },
  tasksSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.charcoal,
    marginBottom: 16,
  },
  tasksList: {
    gap: 12,
  },
  taskCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 16,
    ...Shadows.sm,
  },
  taskCardPending: {
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderStyle: 'dashed',
  },
  taskCardLeft: {
    flexDirection: 'row',
    gap: 12,
  },
  taskIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskIconContainerPending: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  taskEmoji: {
    fontSize: 24,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskNurture: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  checkmarkContainer: {
    // Checkmark for completed tasks
  },
  pendingIndicator: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.charcoal,
    lineHeight: 20,
    marginBottom: 4,
  },
  taskTime: {
    fontSize: 12,
    color: Colors.gray[400],
    fontWeight: '500',
  },
  emptyTasks: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    ...Shadows.sm,
  },
  emptyTasksTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.charcoal,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyTasksText: {
    fontSize: 14,
    color: Colors.gray[400],
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
