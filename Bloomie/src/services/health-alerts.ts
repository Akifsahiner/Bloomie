// Bloomie - Health Alerts Service
// Proactive health monitoring and anomaly detection

import { supabase } from './supabase';
import type { Nurture, LogEntry } from '../types';

export interface HealthAlert {
  id: string;
  nurtureId: string;
  nurtureName: string;
  type: 'urgent' | 'warning' | 'info';
  category: 'watering' | 'feeding' | 'health' | 'schedule' | 'veterinary' | 'medical';
  title: string;
  message: string;
  details: string;
  suggestedActions: string[];
  urgency: 'low' | 'medium' | 'high';
  detectedAt: string;
  data?: {
    expectedInterval?: number;
    actualInterval?: number;
    lastActivity?: string;
    trend?: 'improving' | 'declining' | 'stable';
    healthScore?: number;
    healthScoreTrend?: 'improving' | 'declining' | 'stable';
    moodTrend?: 'concerning' | 'normal';
    nextDueDate?: string;
    symptom?: string;
    logDate?: string;
  };
}

export interface HealthAlertsResponse {
  success: boolean;
  alerts: HealthAlert[];
  message?: string;
}

/**
 * Get proactive health alerts for all nurtures
 */
export async function getHealthAlerts(
  nurtures: Nurture[],
  recentLogs: LogEntry[]
): Promise<HealthAlert[]> {
  if (nurtures.length === 0 || recentLogs.length < 3) {
    return [];
  }

  const allAlerts: HealthAlert[] = [];

  // Check each nurture
  for (const nurture of nurtures) {
    try {
      const nurtureLogs = recentLogs.filter(log => log.nurture_id === nurture.id);
      
      if (nurtureLogs.length < 3) continue; // Need at least 3 logs for pattern analysis

      const { data, error } = await supabase.functions.invoke('health-alerts', {
        body: {
          nurture: {
            id: nurture.id,
            name: nurture.name,
            type: nurture.type,
            metadata: nurture.metadata,
          },
          logs: nurtureLogs.map(log => ({
            created_at: log.created_at,
            parsed_action: log.parsed_action || '',
            parsed_amount: log.parsed_amount,
            parsed_notes: log.parsed_notes,
            mood: log.mood,
            health_score: log.health_score,
          })),
        },
      });

      if (error) {
        console.error('Health alerts error for', nurture.name, error);
        continue;
      }

      if (data.success && data.alerts) {
        allAlerts.push(...data.alerts);
      }
    } catch (error) {
      console.error('Failed to get health alerts for', nurture.name, error);
    }
  }

  // Sort by urgency: urgent > warning > info
  const urgencyOrder = { urgent: 0, warning: 1, info: 2 };
  allAlerts.sort((a, b) => {
    const typeDiff = urgencyOrder[a.type] - urgencyOrder[b.type];
    if (typeDiff !== 0) return typeDiff;
    
    // If same type, sort by urgency level
    const urgencyLevel = { high: 0, medium: 1, low: 2 };
    return urgencyLevel[a.urgency] - urgencyLevel[b.urgency];
  });

  return allAlerts;
}

/**
 * Mark an alert as acknowledged/resolved
 */
export async function acknowledgeAlert(alertId: string, action: 'dismissed' | 'resolved' | 'action_taken'): Promise<void> {
  // Also save to alert history
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const history = await AsyncStorage.getItem('alert_history') || '[]';
    const historyArray = JSON.parse(history);
    historyArray.push({
      alertId,
      action,
      timestamp: new Date().toISOString(),
    });
    // Keep only last 100 entries
    const recentHistory = historyArray.slice(-100);
    await AsyncStorage.setItem('alert_history', JSON.stringify(recentHistory));
  } catch (error) {
    console.error('Failed to save alert history:', error);
  }
  // Store in local storage or send to backend
  // For now, we'll use AsyncStorage
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const acknowledged = await AsyncStorage.getItem('acknowledged_alerts') || '[]';
    const alerts = JSON.parse(acknowledged);
    alerts.push({ alertId, action, timestamp: new Date().toISOString() });
    await AsyncStorage.setItem('acknowledged_alerts', JSON.stringify(alerts));
  } catch (error) {
    console.error('Failed to acknowledge alert:', error);
  }
}

/**
 * Get acknowledged alert IDs
 */
export async function getAcknowledgedAlerts(): Promise<string[]> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const acknowledged = await AsyncStorage.getItem('acknowledged_alerts') || '[]';
    const alerts = JSON.parse(acknowledged);
    // Only return alerts acknowledged in last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return alerts
      .filter((a: any) => new Date(a.timestamp) > weekAgo)
      .map((a: any) => a.alertId);
  } catch (error) {
    return [];
  }
}

/**
 * Filter out acknowledged alerts
 */
export async function filterAcknowledgedAlerts(alerts: HealthAlert[]): Promise<HealthAlert[]> {
  const acknowledged = await getAcknowledgedAlerts();
  return alerts.filter(alert => !acknowledged.includes(alert.id));
}
