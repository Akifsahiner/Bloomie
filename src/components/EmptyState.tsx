// Bloomie - Beautiful Empty State Component

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, BorderRadius, Shadows } from '../constants/theme';

const { width } = Dimensions.get('window');

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'nurtures' | 'chat' | 'logs';
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default',
}: EmptyStateProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating animation for icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const getGradientColors = () => {
    switch (variant) {
      case 'nurtures':
        return [Colors.terracotta[100], Colors.terracotta[50]];
      case 'chat':
        return [Colors.plant.light, Colors.plant.bg];
      case 'logs':
        return [Colors.baby.light, Colors.baby.bg];
      default:
        return [Colors.gray[100], Colors.gray[50]];
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'nurtures':
        return Colors.terracotta[400];
      case 'chat':
        return Colors.plant.main;
      case 'logs':
        return Colors.baby.main;
      default:
        return Colors.gray[400];
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={getGradientColors()}
        style={styles.gradientBg}
      />
      
      {/* Decorative circles */}
      <View style={[styles.decorCircle, styles.decorCircle1]} />
      <View style={[styles.decorCircle, styles.decorCircle2]} />
      
      <Animated.View
        style={[
          styles.iconContainer,
          { transform: [{ translateY: floatAnim }] },
        ]}
      >
        <LinearGradient
          colors={[getIconColor(), `${getIconColor()}CC`]}
          style={styles.iconGradient}
        >
          <MaterialCommunityIcons
            name={icon as any}
            size={40}
            color={Colors.white}
          />
        </LinearGradient>
      </Animated.View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.actionGradient}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
            <MaterialCommunityIcons
              name="arrow-right"
              size={18}
              color={Colors.white}
            />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
    position: 'relative',
  },
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  decorCircle1: {
    width: 120,
    height: 120,
    top: -30,
    right: -30,
  },
  decorCircle2: {
    width: 80,
    height: 80,
    bottom: -20,
    left: -20,
  },
  iconContainer: {
    marginBottom: 20,
    ...Shadows.md,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: Colors.textSubtle,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: width * 0.7,
  },
  actionButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
});
