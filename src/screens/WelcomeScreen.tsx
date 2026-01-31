// Bloomie - Welcome Screen (Simplified)

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, BorderRadius } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const setHasSeenWelcome = useAppStore((state) => state.setHasSeenWelcome);

  const handleContinue = async () => {
    if (!name.trim()) return;

    try {
      await AsyncStorage.setItem('@bloomie_temp_name', name.trim());
    } catch (e) {
      // Ignore storage error
    }
    
    setHasSeenWelcome(true);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 40 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="flower"
            size={64}
            color={Colors.primary}
          />
        </View>
        
        <Text style={styles.title}>Welcome to Bloomie</Text>
        <Text style={styles.subtitle}>How should we call you?</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={Colors.textSubtle}
            value={name}
            onChangeText={setName}
            autoFocus={false}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            !name.trim() && styles.buttonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!name.trim()}
        >
          <Text style={styles.buttonText}>Continue</Text>
          <MaterialCommunityIcons
            name="arrow-right"
            size={20}
            color={Colors.white}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSubtle,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  input: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: BorderRadius.xl,
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
});
