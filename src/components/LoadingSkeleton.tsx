// Bloomie - Loading Skeleton Component
// Beautiful skeleton screens for loading states

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors, BorderRadius } from '../constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: Colors.gray[200],
          opacity,
        },
        style,
      ]}
    />
  );
}

// Pre-built skeleton components
export function NurtureCardSkeleton() {
  return (
    <View style={skeletonStyles.card}>
      <Skeleton width={60} height={60} borderRadius={30} />
      <View style={skeletonStyles.cardContent}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="50%" height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function LogEntrySkeleton() {
  return (
    <View style={skeletonStyles.logEntry}>
      <Skeleton width={8} height={8} borderRadius={4} />
      <View style={skeletonStyles.logContent}>
        <View style={skeletonStyles.logHeader}>
          <Skeleton width={80} height={12} />
          <Skeleton width={60} height={12} />
        </View>
        <Skeleton width="100%" height={14} style={{ marginTop: 8 }} />
        <Skeleton width="60%" height={14} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

export function ChatMessageSkeleton() {
  return (
    <View style={skeletonStyles.chatMessage}>
      <Skeleton width="80%" height={16} borderRadius={BorderRadius.lg} />
      <Skeleton width="60%" height={16} borderRadius={BorderRadius.lg} style={{ marginTop: 4 }} />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
  },
  cardContent: {
    flex: 1,
  },
  logEntry: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  logContent: {
    flex: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatMessage: {
    padding: 12,
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.lg,
    marginVertical: 4,
  },
});
