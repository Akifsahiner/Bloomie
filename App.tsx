// Bloomie - Main App Entry Point

import React, { useEffect, useCallback } from 'react';
import { StatusBar, View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';

import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/constants/theme';
import { useAppStore } from './src/stores/useAppStore';

// Keep splash screen visible while loading resources
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore error if splash screen is already hidden
});

export default function App() {
  const [appIsReady, setAppIsReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const initializeAuth = useAppStore((state) => state.initializeAuth);
  const setUser = useAppStore((state) => state.setUser);
  const setIsLoading = useAppStore((state) => state.setIsLoading);
  const syncData = useAppStore((state) => state.syncData);

  useEffect(() => {
    let subscription: any = null;
    
    async function prepare() {
      try {
        // Initialize auth state from session (with timeout)
        const authTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 10000)
        );
        
        try {
          await Promise.race([initializeAuth(), authTimeout]);
        } catch (authError) {
          console.warn('Auth initialization skipped:', authError);
          // Continue without auth - app should still work
          setIsLoading(false);
        }
        
        // Initialize notifications (don't block on this)
        try {
          const { notificationService } = await import('./src/services/notifications');
          const user = useAppStore.getState().user;
          if (user) {
            notificationService.initialize(user.id).catch(() => {});
          }
        } catch (notifError) {
          console.warn('Notifications skipped:', notifError);
        }
        
        // Simulate minimum splash for branding
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (e: any) {
        console.warn('Preparation error:', e);
        setError(e?.message || 'An error occurred');
        setIsLoading(false);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();

    // Listen for auth state changes (with error handling)
    try {
      const { authService } = require('./src/services/supabase');
      const result = authService.onAuthStateChange(
        async (event: string, session: any) => {
          console.log('Auth state changed:', event);
          
          try {
            if (event === 'SIGNED_IN' && session?.user) {
              // Get full user profile from database
              const { userService } = await import('./src/services/supabase');
              let userProfile = null;
              
              try {
                userProfile = await userService.getProfile(session.user.id);
              } catch (e) {
                // Profile doesn't exist, try to create it
                try {
                  userProfile = await userService.createProfile(
                    session.user.id,
                    session.user.email || '',
                    session.user.user_metadata?.name
                  );
                } catch (createError) {
                  console.warn('Profile creation skipped:', createError);
                }
              }
              
              const userData = {
                id: session.user.id,
                email: session.user.email || '',
                name: userProfile?.name || session.user.user_metadata?.name || 'User',
                is_premium: userProfile?.is_premium || false,
                premium_expires_at: userProfile?.premium_expires_at,
                avatar_url: userProfile?.avatar_url,
                created_at: session.user.created_at,
              };
              setUser(userData);
              
              // Initialize notifications for new user (don't await)
              import('./src/services/notifications').then(({ notificationService }) => {
                notificationService.initialize(userData.id).catch(() => {});
              }).catch(() => {});
              
              // Sync data after sign in
              setTimeout(() => syncData(), 500);
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
            } else if (event === 'TOKEN_REFRESHED') {
              // Session refreshed, sync data
              syncData();
            }
          } catch (authEventError) {
            console.warn('Auth event handler error:', authEventError);
          }
        }
      );
      subscription = result?.data?.subscription;
    } catch (subError) {
      console.warn('Auth subscription failed:', subError);
    }

    return () => {
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (e) {}
      }
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // Hide splash screen once app is ready
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        // Ignore - splash might already be hidden
      }
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return (
      <View style={[styles.container, styles.loading]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.cream} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.cream} />
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setAppIsReady(false);
            // Re-trigger useEffect by forcing re-mount
            setTimeout(() => setAppIsReady(true), 100);
          }}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <View style={styles.container} onLayout={onLayoutRootView}>
          <StatusBar 
            barStyle="dark-content" 
            backgroundColor={Colors.cream}
            translucent={false}
          />
          <AppNavigator />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSubtle || '#666',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textDark || '#333',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSubtle || '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.primary || '#E07A5F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
