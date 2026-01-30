// Bloomie - Error Boundary Component
// Displays user-friendly error messages with retry functionality

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';

const { width } = Dimensions.get('window');

interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  variant?: 'default' | 'network' | 'api' | 'permission';
}

export default function ErrorDisplay({
  title,
  message,
  onRetry,
  retryLabel = 'Try Again',
  variant = 'default',
}: ErrorDisplayProps) {
  const getIcon = () => {
    switch (variant) {
      case 'network':
        return 'wifi-off';
      case 'api':
        return 'alert-circle';
      case 'permission':
        return 'lock-alert';
      default:
        return 'alert-circle-outline';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'network':
        return Colors.gray[500];
      case 'api':
        return Colors.terracotta[500];
      case 'permission':
        return Colors.terracotta[600];
      default:
        return Colors.gray[400];
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MaterialCommunityIcons
          name={getIcon()}
          size={48}
          color={getIconColor()}
        />
        {title && (
          <Text style={styles.title}>{title}</Text>
        )}
        <Text style={styles.message}>{message}</Text>
        {onRetry && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={18}
              color={Colors.white}
            />
            <Text style={styles.retryButtonText}>{retryLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  content: {
    alignItems: 'center',
    maxWidth: width * 0.8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.charcoal,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: Colors.gray[600],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.terracotta[500],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.xl,
    ...Shadows.sm,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
});
