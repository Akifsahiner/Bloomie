// Bloomie - Premium Subscription Screen

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import { userService } from '../services/supabase';
import { PREMIUM_PRICES, PREMIUM_FEATURES, FAMILY_FEATURES } from '../constants/config';

const { width } = Dimensions.get('window');

type PlanType = 'monthly' | 'yearly';

export default function PremiumScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  const { user, setIsPremium, setUser } = useAppStore();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in or create an account to purchase premium.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sign In', 
            onPress: () => navigation.navigate('Auth' as never)
          }
        ]
      );
      return;
    }

    setIsLoading(true);
    try {
      // Calculate expiry date based on plan
      const now = new Date();
      const expiresAt = selectedPlan === 'yearly' 
        ? new Date(now.setFullYear(now.getFullYear() + 1))
        : new Date(now.setMonth(now.getMonth() + 1));

      // Update user profile in database
      await userService.updateProfile(user.id, {
        is_premium: true,
        premium_expires_at: expiresAt.toISOString(),
      });

      // Update local state
      setIsPremium(true);
      setUser({
        ...user,
        is_premium: true,
        premium_expires_at: expiresAt.toISOString(),
      });

      Alert.alert(
        'Welcome to Premium! 🎉',
        'You now have access to all premium features.',
        [{ text: 'Awesome!', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Premium purchase error:', error);
      Alert.alert('Error', 'Purchase failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to restore your purchases.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sign In', 
            onPress: () => navigation.navigate('Auth' as never)
          }
        ]
      );
      return;
    }

    setIsLoading(true);
    try {
      // Check premium status from database
      const isPremiumActive = await userService.checkPremiumStatus(user.id);
      
      if (isPremiumActive) {
        setIsPremium(true);
        Alert.alert(
          'Restored! 🎉',
          'Your premium subscription has been restored.',
          [{ text: 'Great!', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          'No Active Subscription',
          'We could not find an active premium subscription for your account.'
        );
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'Could not restore purchases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[Colors.terracotta[100], Colors.cream]}
        style={styles.backgroundGradient}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons
            name="close"
            size={24}
            color={Colors.charcoal}
          />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons
              name="star"
              size={32}
              color={Colors.terracotta[600]}
            />
          </View>
          <Text style={styles.title}>Bloomie Premium</Text>
          <Text style={styles.subtitle}>
            Unlock the full potential of your care journey
          </Text>
        </View>

        {/* Plan Selection */}
        <View style={styles.planContainer}>
          {/* Yearly Plan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'yearly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('yearly')}
            activeOpacity={0.8}
          >
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>BEST VALUE</Text>
            </View>
            
            <View style={styles.planHeader}>
              <View style={styles.planRadio}>
                {selectedPlan === 'yearly' && (
                  <View style={styles.planRadioInner} />
                )}
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planTitle}>Yearly</Text>
                <Text style={styles.planSave}>
                  Save {PREMIUM_PRICES.yearly.savings}
                </Text>
              </View>
              <View style={styles.planPricing}>
                <Text style={styles.planPrice}>
                  ${PREMIUM_PRICES.yearly.price}
                </Text>
                <Text style={styles.planPeriod}>/year</Text>
              </View>
            </View>
            <Text style={styles.planNote}>
              Just ${(PREMIUM_PRICES.yearly.price / 12).toFixed(2)}/month
            </Text>
          </TouchableOpacity>

          {/* Monthly Plan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.8}
          >
            <View style={styles.planHeader}>
              <View style={styles.planRadio}>
                {selectedPlan === 'monthly' && (
                  <View style={styles.planRadioInner} />
                )}
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planTitle}>Monthly</Text>
              </View>
              <View style={styles.planPricing}>
                <Text style={styles.planPrice}>
                  ${PREMIUM_PRICES.monthly.price}
                </Text>
                <Text style={styles.planPeriod}>/month</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Premium Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresSectionTitle}>
            Everything in Premium
          </Text>
          <View style={styles.featuresList}>
            {PREMIUM_FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <MaterialCommunityIcons
                    name={feature.icon as any}
                    size={20}
                    color={Colors.terracotta[500]}
                  />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDesc}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Family Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresSectionTitle}>
            Plus Family Features
          </Text>
          <View style={styles.featuresList}>
            {FAMILY_FEATURES.slice(0, 3).map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <MaterialCommunityIcons
                    name={feature.icon as any}
                    size={20}
                    color={Colors.plant.main}
                  />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDesc}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Subscribe Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={handleSubscribe}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[Colors.terracotta[400], Colors.terracotta[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.subscribeGradient}
          >
            {isLoading ? (
              <Text style={styles.subscribeText}>Processing...</Text>
            ) : (
              <>
                <Text style={styles.subscribeText}>
                  Start Premium - $
                  {selectedPlan === 'yearly' 
                    ? PREMIUM_PRICES.yearly.price 
                    : PREMIUM_PRICES.monthly.price}
                  /{selectedPlan === 'yearly' ? 'year' : 'month'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
        >
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          Cancel anytime. Terms & Privacy Policy apply.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    ...Shadows.sm,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Shadows.soft,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.charcoal,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray[500],
    textAlign: 'center',
    lineHeight: 24,
  },
  planContainer: {
    gap: 12,
    marginBottom: 32,
  },
  planCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.gray[200],
    ...Shadows.sm,
  },
  planCardSelected: {
    borderColor: Colors.terracotta[500],
    ...Shadows.soft,
  },
  planBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: Colors.terracotta[500],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.terracotta[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  planRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.terracotta[500],
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  planSave: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.plant.main,
    marginTop: 2,
  },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.charcoal,
  },
  planPeriod: {
    fontSize: 14,
    color: Colors.gray[500],
    marginLeft: 2,
  },
  planNote: {
    fontSize: 12,
    color: Colors.gray[400],
    marginTop: 8,
    marginLeft: 40,
  },
  featuresSection: {
    marginBottom: 24,
  },
  featuresSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.terracotta[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.charcoal,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: Colors.gray[500],
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  subscribeButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: 12,
    ...Shadows.md,
  },
  subscribeGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  subscribeText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.terracotta[500],
  },
  termsText: {
    fontSize: 11,
    color: Colors.gray[400],
    textAlign: 'center',
    marginTop: 8,
  },
});

