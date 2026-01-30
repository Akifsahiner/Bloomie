// Bloomie - Premium Splash Screen with Beautiful Animations

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, BorderRadius, Shadows } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import { authService, userService } from '../services/supabase';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'spa',
    title: 'Life is made of\nsmall moments\nof care.',
    subtitle: 'Track and nurture what matters most',
    gradient: ['#FFF8F0', '#FFE8D6'],
    iconColor: Colors.terracotta[500],
    accentColor: Colors.terracotta[400],
  },
  {
    icon: 'robot-happy',
    title: 'Your AI-powered\ncare companion',
    subtitle: 'Smart reminders, insights, and personalized tips',
    gradient: ['#F0FFF4', '#E8F5E9'],
    iconColor: Colors.plant.main,
    accentColor: Colors.plant.main,
  },
  {
    icon: 'heart-multiple',
    title: 'Babies, pets,\nplants — all loved',
    subtitle: 'One beautiful app for all your nurtures',
    gradient: ['#FFF0F5', '#FFE4EC'],
    iconColor: Colors.baby.main,
    accentColor: Colors.baby.main,
  },
];

export default function SplashScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const setIsLoading = useAppStore((state) => state.setIsLoading);
  const setUser = useAppStore((state) => state.setUser);
  const hasCompletedOnboarding = useAppStore((state) => state.hasCompletedOnboarding);
  const setHasCompletedOnboarding = useAppStore((state) => state.setHasCompletedOnboarding);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;
  const particle3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
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

    // Pulse animation for icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Particle animations
    const animateParticle = (anim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateParticle(particle1, 0);
    animateParticle(particle2, 1000);
    animateParticle(particle3, 2000);

    // Check if already onboarded
    if (hasCompletedOnboarding) {
      checkAuthAndFinish();
    }
  }, []);

  const checkAuthAndFinish = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const session = await authService.getSession();
      if (session?.user) {
        // Try to get full profile from database
        let userProfile;
        try {
          userProfile = await userService.getProfile(session.user.id);
        } catch (e) {
          userProfile = null;
        }
        
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: userProfile?.name || session.user.user_metadata?.name || 'Friend',
          is_premium: userProfile?.is_premium || false,
          premium_expires_at: userProfile?.premium_expires_at,
          avatar_url: userProfile?.avatar_url,
          created_at: session.user.created_at,
        });
      }
    } catch (error) {
      console.log('No existing session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      // Animate slide transition
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: currentSlide + 1,
          duration: 0,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentSlide(currentSlide + 1);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    } else {
      // Finish onboarding with fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setHasCompletedOnboarding(true);
        setIsLoading(false);
      });
    }
  };

  const handleSkip = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setHasCompletedOnboarding(true);
      setIsLoading(false);
    });
  };

  const currentSlideData = SLIDES[currentSlide];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Animated Background */}
      <LinearGradient
        colors={currentSlideData.gradient}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating Particles */}
      <Animated.View
        style={[
          styles.particle,
          styles.particle1,
          {
            opacity: particle1.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0.6, 0],
            }),
            transform: [
              {
                translateY: particle1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -200],
                }),
              },
              {
                scale: particle1.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.5, 1.2, 0.5],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.particle,
          styles.particle2,
          {
            opacity: particle2.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0.5, 0],
            }),
            transform: [
              {
                translateY: particle2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -250],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.particle,
          styles.particle3,
          {
            opacity: particle3.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0.4, 0],
            }),
            transform: [
              {
                translateY: particle3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -180],
                }),
              },
            ],
          },
        ]}
      />

      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Icon Section */}
        <Animated.View
          style={[
            styles.iconSection,
            {
              transform: [
                { translateY: floatAnim },
                { scale: pulseAnim },
              ],
            },
          ]}
        >
          <View style={[styles.iconContainer, { shadowColor: currentSlideData.accentColor }]}>
            <LinearGradient
              colors={[currentSlideData.iconColor, currentSlideData.accentColor]}
              style={styles.iconGradient}
            >
              <MaterialCommunityIcons
                name={currentSlideData.icon as any}
                size={64}
                color={Colors.white}
              />
            </LinearGradient>
          </View>
          
          {/* Decorative rings */}
          <View style={[styles.ring, styles.ring1, { borderColor: `${currentSlideData.accentColor}20` }]} />
          <View style={[styles.ring, styles.ring2, { borderColor: `${currentSlideData.accentColor}10` }]} />
        </Animated.View>

        {/* Text Section */}
        <View style={styles.textSection}>
          <Text style={[styles.title, { color: Colors.textDark }]}>
            {currentSlideData.title}
          </Text>
          <Text style={styles.subtitle}>{currentSlideData.subtitle}</Text>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Progress Dots */}
          <View style={styles.dotsContainer}>
            {SLIDES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentSlide
                    ? [styles.dotActive, { backgroundColor: currentSlideData.accentColor }]
                    : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          {/* Next Button */}
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[currentSlideData.iconColor, currentSlideData.accentColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>
                {currentSlide === SLIDES.length - 1 ? 'Get Started' : 'Next'}
              </Text>
              <MaterialCommunityIcons
                name={currentSlide === SLIDES.length - 1 ? 'check' : 'arrow-right'}
                size={20}
                color={Colors.white}
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  particle: {
    position: 'absolute',
    borderRadius: 100,
  },
  particle1: {
    width: 20,
    height: 20,
    backgroundColor: Colors.terracotta[200],
    bottom: 200,
    left: 50,
  },
  particle2: {
    width: 16,
    height: 16,
    backgroundColor: Colors.plant.light,
    bottom: 150,
    right: 80,
  },
  particle3: {
    width: 24,
    height: 24,
    backgroundColor: Colors.baby.light,
    bottom: 180,
    left: width / 2 - 12,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 30,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.8)',
    ...Shadows.sm,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSubtle,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: height * 0.15,
    paddingBottom: 40,
  },
  iconSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 1000,
    borderWidth: 2,
  },
  ring1: {
    width: 200,
    height: 200,
  },
  ring2: {
    width: 260,
    height: 260,
  },
  textSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 46,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 17,
    color: Colors.textSubtle,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 16,
  },
  bottomSection: {
    alignItems: 'center',
    gap: 32,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dot: {
    height: 10,
    borderRadius: 5,
    transition: 'all 0.3s',
  },
  dotActive: {
    width: 32,
  },
  dotInactive: {
    width: 10,
    backgroundColor: Colors.gray[300],
  },
  nextButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.md,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    paddingHorizontal: 40,
    minWidth: 200,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
  },
});
