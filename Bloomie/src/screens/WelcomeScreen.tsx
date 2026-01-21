// Bloomie - Welcome Screen (Name Collection)

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const setHasSeenWelcome = useAppStore((state) => state.setHasSeenWelcome);

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleContinue = async () => {
    if (!name.trim()) {
      return;
    }

    // Save name temporarily (will be saved to database during signup)
    await AsyncStorage.setItem('@bloomie_temp_name', name.trim());
    
    // Mark welcome as seen
    setHasSeenWelcome(true);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[Colors.warmBg, Colors.cream]}
        style={styles.gradient}
      >
        <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="flower"
                size={64}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.title}>Welcome to Bloomie</Text>
            <Text style={styles.subtitle}>
              How should we address you?
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.inputSection,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={Colors.textSubtle}
                value={name}
                onChangeText={setName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
              <MaterialCommunityIcons
                name="account-outline"
                size={24}
                color={Colors.textSubtle}
                style={styles.inputIcon}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.continueButton,
                !name.trim() && styles.continueButtonDisabled,
              ]}
              onPress={handleContinue}
              disabled={!name.trim()}
            >
              <LinearGradient
                colors={
                  name.trim()
                    ? [Colors.primary, Colors.terracotta[500]]
                    : [Colors.gray[300], Colors.gray[300]]
                }
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={20}
                  color={Colors.white}
                />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              We'll use this to personalize your experience
            </Text>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...Shadows.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.textDark,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSubtle,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: Colors.gray[100],
    ...Shadows.md,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
  },
  inputIcon: {
    marginLeft: 12,
  },
  continueButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSubtle,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

