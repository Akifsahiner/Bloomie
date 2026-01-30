// Bloomie - Reusable Card Component

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors, BorderRadius, Shadows } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Card({
  children,
  onPress,
  style,
  variant = 'default',
  padding = 'md',
}: CardProps) {
  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return 12;
      case 'lg':
        return 24;
      default:
        return 16;
    }
  };

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          ...Shadows.md,
          backgroundColor: Colors.white,
        };
      case 'outlined':
        return {
          borderWidth: 1,
          borderColor: Colors.gray[200],
          backgroundColor: Colors.white,
        };
      default:
        return {
          ...Shadows.sm,
          backgroundColor: Colors.white,
        };
    }
  };

  const cardStyle: ViewStyle = {
    ...styles.card,
    ...getVariantStyles(),
    padding: getPadding(),
    ...style,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
});

