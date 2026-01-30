// Bloomie - Beautiful Auth Screen (with Forgot Password)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import { authService, supabase, userService } from '../services/supabase';
import { isValidEmail } from '../utils/helpers';

type AuthMode = 'signin' | 'signup';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const setUser = useAppStore((state) => state.setUser);
  const syncData = useAppStore((state) => state.syncData);

  // Load temp name from AsyncStorage if available
  React.useEffect(() => {
    const loadTempName = async () => {
      try {
        const tempName = await AsyncStorage.getItem('@bloomie_temp_name');
        if (tempName && mode === 'signup') {
          setName(tempName);
        }
      } catch (error) {
        // Silently fail
      }
    };
    loadTempName();
  }, [mode]);

  const validateInputs = async (): Promise<string | null> => {
    if (!email.trim()) {
      return 'Please enter your email address';
    }
    if (!isValidEmail(email.trim())) {
      return 'Please enter a valid email address';
    }
    if (!password) {
      return 'Please enter your password';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (mode === 'signup') {
      // Check if name is provided or available in temp storage
      const tempName = await AsyncStorage.getItem('@bloomie_temp_name');
      if (!name.trim() && !tempName) {
        return 'Please enter your name';
      }
    }
    return null;
  };

  const handleAuth = async () => {
    const error = await validateInputs();
    if (error) {
      Alert.alert('Oops!', error);
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        // Use temp name from Welcome screen if name field is empty
        const tempName = await AsyncStorage.getItem('@bloomie_temp_name');
        const finalName = name.trim() || tempName || '';
        const { user, session } = await authService.signUp(email.trim(), password, finalName);
        if (user) {
          if (session) {
            // Some providers auto-confirm, so we might have a session
            // Create or get user profile from database
            let userProfile;
            try {
              // Try to get existing profile
              userProfile = await userService.getProfile(user.id);
            } catch (e) {
              // Profile doesn't exist, create it
              try {
                userProfile = await userService.createProfile(
                  user.id,
                  user.email || email.trim(),
                  finalName
                );
              } catch (createError) {
                console.error('Failed to create user profile:', createError);
                userProfile = null;
              }
            }
            
            // Clear temp name after successful signup
            await AsyncStorage.removeItem('@bloomie_temp_name');
            
            setUser({
              id: user.id,
              email: user.email || '',
              name: userProfile?.name || finalName || user.user_metadata?.name || 'User',
              is_premium: userProfile?.is_premium || false,
              premium_expires_at: userProfile?.premium_expires_at,
              avatar_url: userProfile?.avatar_url,
              created_at: user.created_at,
            });
            setTimeout(() => syncData(), 500);
          } else {
            Alert.alert(
              'Welcome to Bloomie! 🌱',
              'Please check your email to verify your account before signing in.',
              [{ text: 'OK' }]
            );
            setMode('signin');
          }
        }
      } else {
        const { user, session } = await authService.signIn(email.trim(), password);
        if (user && session) {
          // Get full user profile from database
          let userProfile;
          try {
            userProfile = await userService.getProfile(user.id);
          } catch (e) {
            // User profile might not exist yet
            userProfile = null;
          }
          
          setUser({
            id: user.id,
            email: user.email || '',
            name: userProfile?.name || user.user_metadata?.name || 'User',
            is_premium: userProfile?.is_premium || false,
            premium_expires_at: userProfile?.premium_expires_at,
            avatar_url: userProfile?.avatar_url,
            created_at: user.created_at,
          });
          // Sync data after sign in
          setTimeout(() => syncData(), 500);
        }
      }
    } catch (error: any) {
      let message = 'Something went wrong. Please try again.';
      
      if (error.message?.includes('Invalid login credentials')) {
        message = 'Invalid email or password. Please try again.';
      } else if (error.message?.includes('Email not confirmed')) {
        message = 'Please verify your email before signing in. Check your inbox!';
      } else if (error.message?.includes('already registered')) {
        message = 'This email is already registered. Try signing in instead.';
      } else if (error.message) {
        message = error.message;
      }
      
      Alert.alert('Oops!', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      Alert.alert('Email Required', 'Please enter your email address');
      return;
    }
    
    if (!isValidEmail(forgotEmail.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: 'bloomie://reset-password',
      });
      
      if (error) throw error;
      
      Alert.alert(
        'Reset Email Sent! 📧',
        'If an account exists with this email, you will receive a password reset link.',
        [{ text: 'OK', onPress: () => setShowForgotPassword(false) }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset email');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'apple') => {
    Alert.alert(
      'Coming Soon',
      `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in will be available in the next update!`,
      [{ text: 'OK' }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background decorations */}
      <View style={styles.bgDecor1} />
      <View style={styles.bgDecor2} />
      <View style={styles.bgDecor3} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="close" size={24} color={Colors.charcoal} />
        </TouchableOpacity>

        {/* Logo & Welcome */}
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <MaterialCommunityIcons
                name="spa"
                size={40}
                color={Colors.primary}
              />
            </View>
            <View style={styles.logoSparkle}>
              <MaterialCommunityIcons
                name="star-four-points"
                size={16}
                color={Colors.yellow}
              />
            </View>
          </View>
          
          <Text style={styles.welcomeTitle}>
            {mode === 'signin' ? 'Welcome back!' : 'Join Bloomie'}
          </Text>
          <Text style={styles.welcomeSubtitle}>
            {mode === 'signin' 
              ? 'Your nurtures missed you 🌱' 
              : 'Start your care journey today'}
          </Text>
        </View>

        {/* Auth Form Card */}
        <View style={styles.formCard}>
          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Your Name</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                  name="account-outline"
                  size={20}
                  color={Colors.textSubtle}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="How should we call you?"
                  placeholderTextColor={Colors.textSubtle}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={Colors.textSubtle}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="hello@example.com"
                placeholderTextColor={Colors.textSubtle}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={20}
                color={Colors.textSubtle}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.textSubtle}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.textSubtle}
                />
              </TouchableOpacity>
            </View>
          </View>

          {mode === 'signin' && (
            <TouchableOpacity 
              style={styles.forgotButton}
              onPress={() => {
                setForgotEmail(email);
                setShowForgotPassword(true);
              }}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleAuth}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitGradient}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.submitText}>
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={20}
                    color={Colors.white}
                  />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Buttons */}
        <View style={styles.socialButtons}>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleSocialLogin('google')}
          >
            <MaterialCommunityIcons name="google" size={22} color={Colors.textDark} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleSocialLogin('apple')}
          >
            <MaterialCommunityIcons name="apple" size={22} color={Colors.textDark} />
          </TouchableOpacity>
        </View>

        {/* Toggle Auth Mode */}
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleText}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          </Text>
          <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            <Text style={styles.toggleLink}>
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPassword}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForgotPassword(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top + 16 }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForgotPassword(false)}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.charcoal} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <MaterialCommunityIcons name="lock-reset" size={48} color={Colors.primary} />
            </View>
            
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSubtitle}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>

            <View style={styles.modalInputContainer}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={Colors.textSubtle}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Enter your email"
                placeholderTextColor={Colors.textSubtle}
                value={forgotEmail}
                onChangeText={setForgotEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleForgotPassword}
              disabled={isSendingReset}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalButtonGradient}
              >
                {isSendingReset ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.modalButtonText}>Send Reset Link</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmBg,
  },
  bgDecor1: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: `${Colors.baby.bg}66`,
  },
  bgDecor2: {
    position: 'absolute',
    top: '30%',
    left: -60,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: `${Colors.plant.bg}4D`,
  },
  bgDecor3: {
    position: 'absolute',
    bottom: -50,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: `${Colors.yellow}33`,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: 8,
    ...Shadows.sm,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.cozy,
  },
  logoSparkle: {
    position: 'absolute',
    top: -4,
    right: -8,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: Colors.textSubtle,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['3xl'],
    padding: 24,
    ...Shadows.cozy,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warmBg,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.textDark,
    fontWeight: '500',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  submitButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.md,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  submitText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray[200],
  },
  dividerText: {
    fontSize: 14,
    color: Colors.textSubtle,
    paddingHorizontal: 16,
    fontWeight: '600',
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray[200],
    ...Shadows.sm,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 15,
    color: Colors.textSubtle,
    fontWeight: '500',
  },
  toggleLink: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.warmBg,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingTop: 40,
  },
  modalIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${Colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.textSubtle,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 16,
    paddingVertical: 16,
    width: '100%',
    gap: 12,
    ...Shadows.sm,
    marginBottom: 24,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textDark,
  },
  modalButton: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.md,
  },
  modalButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
  },
});
