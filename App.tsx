// Bloomie - Main App Entry Point (Simplified for stability)

import React, { useEffect, useState } from 'react';
import { StatusBar, View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Delayed imports to prevent crash
let AppNavigator: any = null;
let Colors: any = { cream: '#FFF8F0', primary: '#E07A5F', textDark: '#4A3B32', textSubtle: '#8C7E72' };

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        // Step 1: Load theme
        const theme = await import('./src/constants/theme');
        Colors = theme.Colors;

        // Step 2: Initialize store (without auth)
        const { useAppStore } = await import('./src/stores/useAppStore');
        
        // Step 3: Set loading to false so app can render
        useAppStore.getState().setIsLoading(false);

        // Step 4: Load navigator
        const nav = await import('./src/navigation/AppNavigator');
        AppNavigator = nav.default;

        // Step 5: Try to initialize auth in background (don't wait)
        setTimeout(async () => {
          try {
            await useAppStore.getState().initializeAuth();
          } catch (e) {
            console.log('Auth init skipped');
          }
        }, 100);

        setIsReady(true);
      } catch (e: any) {
        console.error('Init error:', e);
        setError(e?.message || 'Failed to load app');
        setIsReady(true);
      }
    }

    init();
  }, []);

  // Loading state
  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFF8F0" />
        <ActivityIndicator size="large" color="#E07A5F" />
        <Text style={styles.loadingText}>Loading Bloomie...</Text>
      </View>
    );
  }

  // Error state
  if (error || !AppNavigator) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFF8F0" />
        <Text style={styles.errorEmoji}>🌸</Text>
        <Text style={styles.errorTitle}>Bloomie</Text>
        <Text style={styles.errorText}>
          {error || 'Something went wrong. Please restart the app.'}
        </Text>
      </View>
    );
  }

  // Main app
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor={Colors.cream}
          translucent={false}
        />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFF8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8C7E72',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#FFF8F0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A3B32',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#8C7E72',
    textAlign: 'center',
    lineHeight: 24,
  },
});
