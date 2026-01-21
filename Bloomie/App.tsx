// Bloomie - Main App Entry Point

import React, { useEffect, useCallback } from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';

import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/constants/theme';
import { useAppStore } from './src/stores/useAppStore';
import { authService } from './src/services/supabase';
import { notificationService } from './src/services/notifications';

// Keep splash screen visible while loading resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = React.useState(false);
  const initializeAuth = useAppStore((state) => state.initializeAuth);
  const setUser = useAppStore((state) => state.setUser);
  const setIsLoading = useAppStore((state) => state.setIsLoading);
  const syncData = useAppStore((state) => state.syncData);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize auth state from session
        await initializeAuth();
        
        // Initialize notifications
        const user = useAppStore.getState().user;
        if (user) {
          await notificationService.initialize(user.id);
        }
        
        // Simulate minimum splash for branding
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (e) {
        console.warn('Preparation error:', e);
        setIsLoading(false);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Get full user profile from database
          const { userService } = await import('./src/services/supabase');
          let userProfile;
          try {
            userProfile = await userService.getProfile(session.user.id);
          } catch (e) {
            // Profile doesn't exist, create it
            try {
              userProfile = await userService.createProfile(
                session.user.id,
                session.user.email || '',
                session.user.user_metadata?.name
              );
            } catch (createError) {
              console.error('Failed to create user profile:', createError);
              userProfile = null;
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
          // Initialize notifications for new user
          notificationService.initialize(userData.id);
          // Sync data after sign in
          setTimeout(() => syncData(), 500);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED') {
          // Session refreshed, sync data
          syncData();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // Hide splash screen once app is ready
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
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
});
