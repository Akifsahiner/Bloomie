// Bloomie - Health Alert Card Component
// Beautiful, actionable health alert display

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, BorderRadius, Shadows } from '../constants/theme';
import type { HealthAlert } from '../services/health-alerts';

interface HealthAlertCardProps {
  alert: HealthAlert;
  onAction: (action: 'dismiss' | 'check' | 'advice' | 'resolved') => void;
  onDismiss: () => void;
}

export default function HealthAlertCard({ alert, onAction, onDismiss }: HealthAlertCardProps) {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (alert.type === 'urgent') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [alert.type]);

  const getAlertColors = () => {
    switch (alert.type) {
      case 'urgent':
        return {
          gradient: ['#FF6B6B', '#EE5A6F'],
          icon: 'alert-circle',
          iconColor: Colors.white,
        };
      case 'warning':
        return {
          gradient: ['#FFA726', '#FF9800'],
          icon: 'alert',
          iconColor: Colors.white,
        };
      default:
        return {
          gradient: [Colors.plant.main, Colors.plant.dark || Colors.plant.main],
          icon: 'information',
          iconColor: Colors.white,
        };
    }
  };

  const getCategoryIcon = () => {
    switch (alert.category) {
      case 'watering':
        return 'water';
      case 'feeding':
        return 'food';
      case 'health':
        return 'heart-pulse';
      case 'schedule':
        return 'calendar-clock';
      case 'veterinary':
        return 'medical-bag';
      case 'medical':
        return 'hospital';
      default:
        return 'information';
    }
  };

  const colors = getAlertColors();

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: pulseAnim }] },
      ]}
    >
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={colors.icon}
              size={24}
              color={colors.iconColor}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{alert.title}</Text>
            <Text style={styles.nurtureName}>{alert.nurtureName}</Text>
          </View>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="close" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Message */}
        <Text style={styles.message}>{alert.message}</Text>

        {/* Details */}
        {alert.details && (
          <View style={styles.detailsContainer}>
            <Text style={styles.details}>{alert.details}</Text>
            
            {/* Additional Data */}
            {alert.data && (
              <View style={styles.dataContainer}>
                {alert.data.healthScore !== undefined && (
                  <View style={styles.dataRow}>
                    <MaterialCommunityIcons name="heart-pulse" size={14} color={Colors.white} />
                    <Text style={styles.dataText}>
                      Health Score: {alert.data.healthScore.toFixed(1)}/5
                      {alert.data.healthScoreTrend === 'declining' && ' ⬇️'}
                      {alert.data.healthScoreTrend === 'improving' && ' ⬆️'}
                    </Text>
                  </View>
                )}
                
                {alert.data.expectedInterval && alert.data.actualInterval && (
                  <View style={styles.dataRow}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={Colors.white} />
                    <Text style={styles.dataText}>
                      Expected: {Math.round(alert.data.expectedInterval)} {alert.category === 'feeding' ? 'hours' : 'days'} • 
                      Actual: {Math.round(alert.data.actualInterval)} {alert.category === 'feeding' ? 'hours' : 'days'}
                    </Text>
                  </View>
                )}
                
                {alert.data.nextDueDate && (
                  <View style={styles.dataRow}>
                    <MaterialCommunityIcons name="calendar-clock" size={14} color={Colors.white} />
                    <Text style={styles.dataText}>
                      Next due: {new Date(alert.data.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                )}
                
                {alert.data.moodTrend === 'concerning' && (
                  <View style={styles.dataRow}>
                    <MaterialCommunityIcons name="emoticon-sad" size={14} color={Colors.white} />
                    <Text style={styles.dataText}>Mood pattern needs attention</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Suggested Actions */}
        {alert.suggestedActions.length > 0 && (
          <View style={styles.actionsContainer}>
            <Text style={styles.actionsTitle}>Suggested actions:</Text>
            {alert.suggestedActions.slice(0, 2).map((action, index) => (
              <View key={index} style={styles.actionItem}>
                <MaterialCommunityIcons
                  name={getCategoryIcon()}
                  size={14}
                  color={Colors.white}
                />
                <Text style={styles.actionText}>{action}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onAction('check')}
          >
            <MaterialCommunityIcons name="eye" size={16} color={Colors.white} />
            <Text style={styles.actionButtonText}>Check Now</Text>
          </TouchableOpacity>

          {alert.category !== 'medical' && alert.category !== 'veterinary' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onAction('resolved')}
            >
              <MaterialCommunityIcons name="check-circle" size={16} color={Colors.white} />
              <Text style={styles.actionButtonText}>I Did It</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => onAction('advice')}
          >
            <MaterialCommunityIcons name="robot" size={16} color={Colors.white} />
            <Text style={styles.actionButtonText}>Ask Bloomie</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.md,
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 2,
  },
  nurtureName: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 15,
    color: Colors.white,
    lineHeight: 22,
    marginBottom: 12,
    fontWeight: '500',
  },
  detailsContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    padding: 12,
    marginBottom: 12,
  },
  details: {
    fontSize: 13,
    color: Colors.white,
    lineHeight: 18,
  },
  actionsContainer: {
    marginBottom: 16,
  },
  actionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionText: {
    fontSize: 13,
    color: Colors.white,
    marginLeft: 8,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    gap: 6,
  },
  primaryButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  dataContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dataText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 6,
    flex: 1,
  },
});
