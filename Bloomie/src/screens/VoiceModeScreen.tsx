// Bloomie - Voice Mode Screen (Premium Feature)
// Realtime voice conversation with AI - like a phone call

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import useVapi from '../hooks/useVapi';

const { width, height } = Dimensions.get('window');

type ConversationState = 'idle' | 'connecting' | 'listening' | 'speaking';

interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function VoiceModeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  const { user, nurtures, recentLogs, isPremium, canUseVoiceMode } = useAppStore();
  
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [showPremiumPrompt, setShowPremiumPrompt] = useState(false);
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(0.3)).current;
  const waveAnim2 = useRef(new Animated.Value(0.5)).current;
  const waveAnim3 = useRef(new Animated.Value(0.7)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  
  // Vapi voice assistant (realtime audio, no local STT/TTS)
  const {
    state: vapiState,
    isUserSpeaking,
    isAssistantSpeaking,
    lastText,
    start: startVapi,
    stop: stopVapi,
  } = useVapi({
    assistantId: '60621ebd-1691-46e0-92e4-803ac1f9d5ce',
  });

  // Check premium access
  useEffect(() => {
    if (!canUseVoiceMode()) {
      setShowPremiumPrompt(true);
    }
  }, []);

  // Map raw Vapi state + speaking flags into UI conversation state
  useEffect(() => {
    if (vapiState === 'idle') {
      setConversationState('idle');
      return;
    }

    if (vapiState === 'connecting') {
      setConversationState('connecting');
      return;
    }

    // in-call
    if (isUserSpeaking) {
      setConversationState('listening');
    } else if (isAssistantSpeaking) {
      setConversationState('speaking');
    } else {
      // default to speaking-style visual when in-call but no speech detected
      setConversationState('speaking');
    }

    setIsSessionActive(true);
  }, [vapiState, isUserSpeaking, isAssistantSpeaking]);

  // Pulse animation for the main button
  useEffect(() => {
    if (conversationState === 'listening' || conversationState === 'speaking') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [conversationState]);

  // Wave animations for listening state
  useEffect(() => {
    if (conversationState === 'listening') {
      const createWaveAnimation = (anim: Animated.Value, duration: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.3,
              duration,
              useNativeDriver: true,
            }),
          ])
        );
      };

      Animated.parallel([
        createWaveAnimation(waveAnim1, 600),
        createWaveAnimation(waveAnim2, 800),
        createWaveAnimation(waveAnim3, 1000),
      ]).start();
    }
  }, [conversationState]);

  // Ripple animation for speaking
  useEffect(() => {
    if (conversationState === 'speaking') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(rippleAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(rippleAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [conversationState]);

  const startListening = async () => {
    if (!canUseVoiceMode()) {
      setShowPremiumPrompt(true);
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await startVapi();
    } catch (error) {
      console.error('Start listening error:', error);
      setConversationState('idle');
      Alert.alert('Error', 'Could not start voice assistant. Please check microphone permissions.');
    }
  };

  const stopListening = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      stopVapi();
      setConversationState('idle');
    } catch (error) {
      console.error('Stop listening error:', error);
      setConversationState('idle');
      Alert.alert('Error', 'Failed to stop voice assistant. Please try again.');
    }
  };

  const endSession = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    stopVapi();
    setConversationState('idle');
    setIsSessionActive(false);
    setMessages([]);
    navigation.goBack();
  };

  const getStateColor = () => {
    switch (conversationState) {
      case 'listening': return ['#4CAF50', '#81C784'];
      case 'processing': return ['#FF9800', '#FFB74D'];
      case 'speaking': return ['#2196F3', '#64B5F6'];
      default: return [Colors.terracotta[400], Colors.terracotta[600]];
    }
  };

  const getStateIcon = () => {
    switch (conversationState) {
      case 'listening': return 'microphone';
      case 'processing': return 'loading';
      case 'speaking': return 'volume-high';
      default: return 'microphone-outline';
    }
  };

  const getStateText = () => {
    switch (conversationState) {
      case 'connecting': return 'Connecting...';
      case 'listening': return 'Listening...';
      case 'speaking': return 'Speaking...';
      default: return 'Tap to speak';
    }
  };

  // Premium prompt overlay
  if (showPremiumPrompt) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#1a1a2e', '#16213e']}
          style={StyleSheet.absoluteFill}
        />
        
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="close" size={28} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.premiumPrompt}>
          <View style={styles.premiumIconContainer}>
            <LinearGradient
              colors={[Colors.terracotta[400], Colors.terracotta[600]]}
              style={styles.premiumIconGradient}
            >
              <MaterialCommunityIcons name="crown" size={48} color={Colors.white} />
            </LinearGradient>
          </View>
          
          <Text style={styles.premiumTitle}>Voice Mode</Text>
          <Text style={styles.premiumSubtitle}>Premium Feature</Text>
          
          <Text style={styles.premiumDescription}>
            Have natural voice conversations with Bloomie AI.{'\n'}
            Just like talking to a friend who knows everything about your pets, plants, and babies.
          </Text>
          
          <View style={styles.premiumFeatures}>
            <View style={styles.premiumFeatureItem}>
              <MaterialCommunityIcons name="microphone" size={24} color={Colors.terracotta[400]} />
              <Text style={styles.premiumFeatureText}>Real-time voice chat</Text>
            </View>
            <View style={styles.premiumFeatureItem}>
              <MaterialCommunityIcons name="brain" size={24} color={Colors.terracotta[400]} />
              <Text style={styles.premiumFeatureText}>AI understands context</Text>
            </View>
            <View style={styles.premiumFeatureItem}>
              <MaterialCommunityIcons name="bell-ring" size={24} color={Colors.terracotta[400]} />
              <Text style={styles.premiumFeatureText}>Set reminders by voice</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.premiumButton}
            onPress={() => {
              navigation.goBack();
              setTimeout(() => {
                navigation.navigate('Premium' as never);
              }, 100);
            }}
          >
            <LinearGradient
              colors={[Colors.terracotta[400], Colors.terracotta[600]]}
              style={styles.premiumButtonGradient}
            >
              <Text style={styles.premiumButtonText}>Upgrade to Premium</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={endSession}
        >
          <MaterialCommunityIcons name="close" size={28} color={Colors.white} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Bloomie Voice</Text>
          <Text style={styles.headerSubtitle}>AI Care Assistant</Text>
        </View>
        
        <View style={styles.headerRight} />
      </View>

      {/* Conversation display */}
      <View style={styles.conversationArea}>
        {conversationState === 'idle' && !isSessionActive && messages.length === 0 && (
          <View style={styles.welcomeSection}>
            <MaterialCommunityIcons 
              name="flower-tulip" 
              size={48} 
              color={Colors.terracotta[300]} 
            />
            <Text style={styles.welcomeTitle}>Hi, {user?.name || 'there'}!</Text>
            <Text style={styles.welcomeSubtitle}>
              Hold the button and start talking.{'\n'}
              I'll help you with your care journey.
            </Text>
            
            {/* Quick suggestions */}
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Try saying:</Text>
              <View style={styles.suggestionChips}>
                <View style={styles.suggestionChip}>
                  <Text style={styles.suggestionText}>"I just fed Luna"</Text>
                </View>
                <View style={styles.suggestionChip}>
                  <Text style={styles.suggestionText}>"Remind me to water my plants"</Text>
                </View>
                <View style={styles.suggestionChip}>
                  <Text style={styles.suggestionText}>"How often should I feed my cat?"</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Conversation history */}
        {messages.length > 0 && conversationState === 'idle' && (
          <ScrollView 
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.slice(-6).map((message, index) => (
              <View 
                key={message.id} 
                style={[
                  styles.messageBubble,
                  message.role === 'user' ? styles.userBubble : styles.assistantBubble
                ]}
              >
                <Text style={[
                  styles.messageText,
                  message.role === 'user' ? styles.userMessageText : styles.assistantMessageText
                ]}>
                  {message.content}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Current transcript while listening */}
        {conversationState === 'listening' && (
          <View style={styles.listeningFeedback}>
            <View style={styles.listeningDots}>
              <View style={[styles.listeningDot, styles.listeningDot1]} />
              <View style={[styles.listeningDot, styles.listeningDot2]} />
              <View style={[styles.listeningDot, styles.listeningDot3]} />
            </View>
            <Text style={styles.listeningText}>Listening to you...</Text>
          </View>
        )}

        {/* Processing indicator */}
        {conversationState === 'connecting' && (
          <View style={styles.processingFeedback}>
            <ActivityIndicator size="small" color={Colors.terracotta[300]} />
            <Text style={styles.processingText}>Connecting to Bloomie voice...</Text>
          </View>
        )}

        {/* Current transcript after listening */}
        {lastText && (
          <View style={styles.transcriptContainer}>
            <Text style={styles.transcriptLabel}>
              {isAssistantSpeaking ? 'Bloomie:' : 'You:'}
            </Text>
            <Text style={styles.transcriptText}>{lastText}</Text>
          </View>
        )}

        {/* AI response while speaking */}
        {/* We no longer render a separate AI response block – Vapi handles audio in realtime */}
      </View>

      {/* Main voice button */}
      <View style={styles.buttonArea}>
        {/* Ripple effect for speaking */}
        {conversationState === 'speaking' && (
          <Animated.View
            style={[
              styles.ripple,
              {
                opacity: rippleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0],
                }),
                transform: [
                  {
                    scale: rippleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 2],
                    }),
                  },
                ],
              },
            ]}
          />
        )}

        {/* Sound waves for listening */}
        {conversationState === 'listening' && (
          <View style={styles.wavesContainer}>
            <Animated.View 
              style={[
                styles.wave, 
                { transform: [{ scaleY: waveAnim1 }] }
              ]} 
            />
            <Animated.View 
              style={[
                styles.wave, 
                { transform: [{ scaleY: waveAnim2 }] }
              ]} 
            />
            <Animated.View 
              style={[
                styles.wave, 
                { transform: [{ scaleY: waveAnim3 }] }
              ]} 
            />
            <Animated.View 
              style={[
                styles.wave, 
                { transform: [{ scaleY: waveAnim2 }] }
              ]} 
            />
            <Animated.View 
              style={[
                styles.wave, 
                { transform: [{ scaleY: waveAnim1 }] }
              ]} 
            />
          </View>
        )}

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={styles.mainButton}
            onPressIn={conversationState === 'idle' ? startListening : undefined}
            onPressOut={conversationState !== 'idle' ? stopListening : undefined}
            disabled={conversationState === 'connecting'}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={getStateColor()}
              style={styles.mainButtonGradient}
            >
              {conversationState === 'connecting' ? (
                <ActivityIndicator size="large" color={Colors.white} />
              ) : (
                <MaterialCommunityIcons 
                  name={getStateIcon() as any} 
                  size={56} 
                  color={Colors.white} 
                />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.stateText}>{getStateText()}</Text>
        
        {conversationState === 'idle' && (
          <Text style={styles.hintText}>Hold to speak, release to send</Text>
        )}
      </View>

      {/* Session info */}
      {isSessionActive && messages.length > 0 && (
        <View style={[styles.sessionInfo, { paddingBottom: insets.bottom + 16 }]}>
          <MaterialCommunityIcons 
            name="message-text-outline" 
            size={16} 
            color={Colors.gray[400]} 
          />
          <Text style={styles.sessionInfoText}>
            {messages.length} messages in this session
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.gray[400],
    marginTop: 2,
  },
  headerRight: {
    width: 44,
  },
  conversationArea: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  welcomeSection: {
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
    marginTop: 16,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: Colors.gray[400],
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  // Quick suggestions
  suggestionsContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  suggestionsTitle: {
    fontSize: 12,
    color: Colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  suggestionChips: {
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.gray[300],
    fontStyle: 'italic',
  },
  // Messages history
  messagesContainer: {
    flex: 1,
    maxHeight: 300,
  },
  messagesContent: {
    paddingVertical: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(241,125,125,0.2)',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: Colors.white,
  },
  assistantMessageText: {
    color: Colors.white,
  },
  // Listening feedback
  listeningFeedback: {
    alignItems: 'center',
    gap: 16,
  },
  listeningDots: {
    flexDirection: 'row',
    gap: 8,
  },
  listeningDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  listeningDot1: {
    opacity: 0.4,
  },
  listeningDot2: {
    opacity: 0.7,
  },
  listeningDot3: {
    opacity: 1,
  },
  listeningText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
  },
  // Processing feedback
  processingFeedback: {
    alignItems: 'center',
    gap: 12,
  },
  processingText: {
    fontSize: 16,
    color: Colors.terracotta[300],
    fontWeight: '500',
  },
  // Response header
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  transcriptContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  transcriptLabel: {
    fontSize: 12,
    color: Colors.gray[400],
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  transcriptText: {
    fontSize: 18,
    color: Colors.white,
    lineHeight: 26,
  },
  responseContainer: {
    backgroundColor: 'rgba(241,125,125,0.2)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(241,125,125,0.3)',
  },
  responseLabel: {
    fontSize: 12,
    color: Colors.terracotta[300],
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  responseText: {
    fontSize: 18,
    color: Colors.white,
    lineHeight: 26,
  },
  buttonArea: {
    alignItems: 'center',
    paddingBottom: 60,
  },
  ripple: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#2196F3',
  },
  wavesContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 60,
  },
  wave: {
    width: 6,
    height: 40,
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  mainButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  mainButtonGradient: {
    flex: 1,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    marginTop: 24,
  },
  hintText: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: 8,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  sessionInfoText: {
    fontSize: 14,
    color: Colors.gray[400],
  },
  // Premium prompt styles
  premiumPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  premiumIconContainer: {
    marginBottom: 24,
  },
  premiumIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 8,
  },
  premiumSubtitle: {
    fontSize: 16,
    color: Colors.terracotta[300],
    fontWeight: '600',
    marginBottom: 24,
  },
  premiumDescription: {
    fontSize: 16,
    color: Colors.gray[300],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  premiumFeatures: {
    width: '100%',
    marginBottom: 40,
  },
  premiumFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  premiumFeatureText: {
    fontSize: 16,
    color: Colors.white,
  },
  premiumButton: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  premiumButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  premiumButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
});

