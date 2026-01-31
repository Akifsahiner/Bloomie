// Bloomie - Simple Splash Screen

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';

export default function SplashScreen() {
  const setIsLoading = useAppStore((state) => state.setIsLoading);

  useEffect(() => {
    // Auto-advance after 1 second
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🌸</Text>
      <Text style={styles.title}>Bloomie</Text>
      <Text style={styles.subtitle}>Care for what matters</Text>
      <ActivityIndicator 
        size="large" 
        color={Colors.primary} 
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSubtle,
    marginBottom: 32,
  },
  loader: {
    marginTop: 24,
  },
});
