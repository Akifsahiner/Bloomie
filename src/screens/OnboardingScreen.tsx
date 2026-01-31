// Bloomie - Category Selection Screen (Simplified)

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, BorderRadius } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import type { NurtureType } from '../types';

interface CategoryOption {
  type: NurtureType;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  bgColor: string;
  iconColor: string;
}

const categories: CategoryOption[] = [
  {
    type: 'baby',
    icon: 'baby-face',
    title: 'Baby',
    description: 'Tiny toes & big dreams',
    bgColor: '#FFE5D9',
    iconColor: '#D85C45',
  },
  {
    type: 'pet',
    icon: 'paw',
    title: 'Pet',
    description: 'Paws, claws & happy tails',
    bgColor: '#FFE8D6',
    iconColor: '#A47148',
  },
  {
    type: 'plant',
    icon: 'flower',
    title: 'Plant',
    description: 'Leaf by leaf, growing love',
    bgColor: '#E2ECE9',
    iconColor: '#558B6E',
  },
];

export default function OnboardingScreen() {
  const setHasCompletedOnboarding = useAppStore((state) => state.setHasCompletedOnboarding);

  const handleCategoryPress = (type: NurtureType) => {
    setHasCompletedOnboarding(true);
  };

  const handleSkip = () => {
    setHasCompletedOnboarding(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.cream} />

      <View style={styles.content}>
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
          {categories.map((category) => (
            <TouchableOpacity
              key={category.type}
              style={[styles.categoryCard, { backgroundColor: category.bgColor }]}
              onPress={() => handleCategoryPress(category.type)}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name={category.icon}
                  size={32}
                  color={category.iconColor}
                />
              </View>

              <View style={styles.categoryText}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryDescription}>
                  {category.description}
                </Text>
              </View>

              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={Colors.textSubtle}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Skip Button */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 12,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSubtle,
  },
  categoriesContainer: {
    gap: 16,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: BorderRadius.xl,
    gap: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: Colors.textSubtle,
  },
  skipButton: {
    marginTop: 'auto',
    alignSelf: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSubtle,
  },
});
