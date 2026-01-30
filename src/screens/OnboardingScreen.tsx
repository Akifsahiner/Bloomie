// Bloomie - Category Selection Screen (What would you like to track first?)

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import type { NurtureType } from '../types';

const { width } = Dimensions.get('window');

interface CategoryOption {
  type: NurtureType;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  gradient: string[];
  iconColor: string;
  iconBg: string;
}

const categories: CategoryOption[] = [
  {
    type: 'baby',
    icon: 'baby-face',
    title: 'Baby',
    description: 'Tiny toes & big dreams',
    gradient: ['#FFE5D9', '#FFCAD4'],
    iconColor: '#D85C45',
    iconBg: 'rgba(255,255,255,0.4)',
  },
  {
    type: 'pet',
    icon: 'paw',
    title: 'Pet',
    description: 'Paws, claws & happy tails',
    gradient: ['#FFE8D6', '#DDBEA9'],
    iconColor: '#A47148',
    iconBg: 'rgba(255,255,255,0.4)',
  },
  {
    type: 'plant',
    icon: 'flower',
    title: 'Plant',
    description: 'Leaf by leaf, growing love',
    gradient: ['#E2ECE9', '#BFD8BD'],
    iconColor: '#558B6E',
    iconBg: 'rgba(255,255,255,0.4)',
  },
];

export default function OnboardingScreen() {
  const [selectedCategory, setSelectedCategory] = useState<NurtureType | null>(null);
  const setHasCompletedOnboarding = useAppStore((state) => state.setHasCompletedOnboarding);

  const scaleAnims = useRef(categories.map(() => new Animated.Value(1))).current;

  const handleCategoryPress = (type: NurtureType, index: number) => {
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnims[index], {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    setSelectedCategory(type);
    
    // Auto-continue after selection
    setTimeout(() => {
      setHasCompletedOnboarding(true);
    }, 300);
  };

  const handleSkip = () => {
    setHasCompletedOnboarding(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.warmBg} />
      
      {/* Background Gradients */}
      <View style={styles.bgGradients}>
        <View style={styles.bgGradient1} />
        <View style={styles.bgGradient2} />
      </View>

      <View style={styles.content}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, styles.progressActive]} />
          <View style={[styles.progressBar, styles.progressInactive]} />
          <View style={[styles.progressBar, styles.progressInactive]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            What would you{'\n'}like to track first?
          </Text>
          <Text style={styles.subtitle}>
            Pick a journal to start your journey.
          </Text>
        </View>

        {/* Category Cards */}
        <View style={styles.categoriesContainer}>
          {categories.map((category, index) => (
            <Animated.View
              key={category.type}
              style={[
                { transform: [{ scale: scaleAnims[index] }] },
              ]}
            >
              <TouchableOpacity
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(category.type, index)}
                activeOpacity={0.95}
              >
                <LinearGradient
                  colors={category.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.categoryGradient}
                >
                  {/* Decorative blur circle */}
                  <View style={styles.decorCircle} />
                  
                  <View style={styles.categoryContent}>
                    {/* Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: category.iconBg }]}>
                      <MaterialCommunityIcons
                        name={category.icon}
                        size={32}
                        color={category.iconColor}
                      />
                    </View>

                    {/* Text */}
                    <View style={styles.categoryText}>
                      <Text style={styles.categoryTitle}>{category.title}</Text>
                      <Text style={styles.categoryDescription}>
                        {category.description}
                      </Text>
                    </View>

                    {/* Arrow */}
                    <View style={styles.arrowContainer}>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={20}
                        color={`${Colors.textDark}80`}
                      />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Skip Button */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmBg,
  },
  bgGradients: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    opacity: 0.6,
  },
  bgGradient1: {
    position: 'absolute',
    top: '-10%',
    right: '-10%',
    width: '90%',
    height: '60%',
    borderRadius: 9999,
    backgroundColor: `${Colors.baby.bg}66`,
  },
  bgGradient2: {
    position: 'absolute',
    bottom: '-10%',
    left: '-20%',
    width: '80%',
    height: '50%',
    borderRadius: 9999,
    backgroundColor: `${Colors.pet.bg}4D`,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
    paddingHorizontal: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  progressActive: {
    backgroundColor: Colors.primary,
  },
  progressInactive: {
    backgroundColor: `${Colors.primary}4D`,
  },
  header: {
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.textDark,
    letterSpacing: -0.5,
    marginBottom: 12,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSubtle,
    fontWeight: '500',
  },
  categoriesContainer: {
    gap: 20,
  },
  categoryCard: {
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
    ...Shadows.cozy,
  },
  categoryGradient: {
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    right: -24,
    bottom: -24,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
    ...Shadows.sm,
  },
  categoryText: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: `${Colors.textDark}CC`,
    fontWeight: '600',
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActions: {
    marginTop: 'auto',
    paddingTop: 32,
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.full,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textSubtle,
  },
});
