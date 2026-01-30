// Bloomie - Alert History Screen
// View past health alerts and their resolutions

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import type { HealthAlert } from '../services/health-alerts';

const { width } = Dimensions.get('window');

interface AlertHistoryEntry {
  alertId: string;
  action: 'dismissed' | 'resolved' | 'action_taken';
  timestamp: string;
  alert?: HealthAlert; // Stored alert data if available
}

export default function AlertHistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { nurtures } = useAppStore();
  
  const [history, setHistory] = useState<AlertHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const historyData = await AsyncStorage.getItem('alert_history') || '[]';
      const historyArray = JSON.parse(historyData);
      
      // Sort by timestamp (newest first)
      historyArray.sort((a: AlertHistoryEntry, b: AlertHistoryEntry) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setHistory(historyArray);
    } catch (error) {
      console.error('Failed to load alert history:', error);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'resolved':
        return 'check-circle';
      case 'action_taken':
        return 'eye-check';
      case 'dismissed':
        return 'close-circle';
      default:
        return 'information';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'resolved':
        return Colors.plant.main;
      case 'action_taken':
        return Colors.babyBlue[500];
      case 'dismissed':
        return Colors.gray[400];
      default:
        return Colors.gray[400];
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'resolved':
        return 'Resolved';
      case 'action_taken':
        return 'Checked';
      case 'dismissed':
        return 'Dismissed';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F8FAF5', '#EDF5E6', '#F5F9F2']}
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
        <Text style={styles.headerTitle}>Alert History</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="bell-off-outline" size={64} color={Colors.gray[300]} />
            <Text style={styles.emptyStateTitle}>No Alert History</Text>
            <Text style={styles.emptyStateText}>
              Resolved alerts will appear here
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            {history.map((entry, index) => {
              const actionColor = getActionColor(entry.action);
              const actionIcon = getActionIcon(entry.action);
              
              return (
                <View key={entry.alertId || index} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <View style={[styles.historyIcon, { backgroundColor: `${actionColor}20` }]}>
                      <MaterialCommunityIcons
                        name={actionIcon}
                        size={20}
                        color={actionColor}
                      />
                    </View>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyAction}>{getActionLabel(entry.action)}</Text>
                      {entry.alert && (
                        <Text style={styles.historyTitle}>{entry.alert.title}</Text>
                      )}
                      <Text style={styles.historyDate}>{formatDate(entry.timestamp)}</Text>
                    </View>
                  </View>
                  
                  {entry.alert && (
                    <View style={styles.historyDetails}>
                      <Text style={styles.historyMessage}>{entry.alert.message}</Text>
                      {entry.alert.nurtureName && (
                        <View style={styles.nurtureBadge}>
                          <MaterialCommunityIcons
                            name={entry.alert.category === 'watering' ? 'water' : 
                                  entry.alert.category === 'feeding' ? 'food' : 'heart-pulse'}
                            size={12}
                            color={Colors.plant.main}
                          />
                          <Text style={styles.nurtureBadgeText}>{entry.alert.nurtureName}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.charcoal,
    marginBottom: 16,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.charcoal,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.gray[500],
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    marginBottom: 12,
    ...Shadows.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyAction: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray[500],
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.charcoal,
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: Colors.gray[400],
  },
  historyDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  historyMessage: {
    fontSize: 14,
    color: Colors.gray[600],
    lineHeight: 20,
    marginBottom: 8,
  },
  nurtureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.plant.light,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  nurtureBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.plant.main,
  },
});
