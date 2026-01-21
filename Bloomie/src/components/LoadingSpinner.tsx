// Bloomie - Beautiful Loading Spinner Component

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, BorderRadius } from '../constants/theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
  variant?: 'default' | 'dots' | 'bloom';
}

export default function LoadingSpinner({
  size = 'medium',
  color = Colors.primary,
  text,
  variant = 'default',
}: LoadingSpinnerProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const sizeValues = {
    small: { container: 24, icon: 16 },
    medium: { container: 40, icon: 24 },
    large: { container: 64, icon: 40 },
  };

  useEffect(() => {
    if (variant === 'default' || variant === 'bloom') {
      // Rotation animation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }

    if (variant === 'bloom') {
      // Pulse animation for bloom variant
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    if (variant === 'dots') {
      // Dots animation
      const animateDot = (anim: Animated.Value, delay: number) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };

      animateDot(dot1, 0);
      animateDot(dot2, 200);
      animateDot(dot3, 400);
    }
  }, [variant]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (variant === 'dots') {
    return (
      <View style={styles.dotsContainer}>
        {[dot1, dot2, dot3].map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: color,
                transform: [
                  {
                    scale: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1.2],
                    }),
                  },
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -8],
                    }),
                  },
                ],
                opacity: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 1],
                }),
              },
            ]}
          />
        ))}
        {text && <Text style={[styles.text, { color }]}>{text}</Text>}
      </View>
    );
  }

  if (variant === 'bloom') {
    return (
      <View style={styles.bloomContainer}>
        <Animated.View
          style={[
            styles.bloomOuter,
            {
              width: sizeValues[size].container * 1.5,
              height: sizeValues[size].container * 1.5,
              borderRadius: sizeValues[size].container,
              backgroundColor: `${color}20`,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bloomInner,
            {
              width: sizeValues[size].container,
              height: sizeValues[size].container,
              borderRadius: sizeValues[size].container / 2,
              backgroundColor: color,
              transform: [{ rotate: rotation }],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="spa"
            size={sizeValues[size].icon}
            color={Colors.white}
          />
        </Animated.View>
        {text && <Text style={[styles.text, { color, marginTop: 16 }]}>{text}</Text>}
      </View>
    );
  }

  // Default spinner
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: sizeValues[size].container,
            height: sizeValues[size].container,
            borderRadius: sizeValues[size].container / 2,
            borderColor: `${color}30`,
            borderTopColor: color,
            transform: [{ rotate: rotation }],
          },
        ]}
      />
      {text && <Text style={[styles.text, { color }]}>{text}</Text>}
    </View>
  );
}

// Inline loading for buttons
export function InlineLoading({ color = Colors.white }: { color?: string }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (anim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);
  }, []);

  return (
    <View style={styles.inlineContainer}>
      {[dot1, dot2, dot3].map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.inlineDot,
            {
              backgroundColor: color,
              opacity: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  spinner: {
    borderWidth: 3,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bloomContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  bloomOuter: {
    position: 'absolute',
  },
  bloomInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  inlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
