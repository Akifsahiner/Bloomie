// Bloomie - Dedicated AI Chat Screen
// Beautiful, immersive chat experience with Perplexity integration

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Dimensions,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import { sendChatMessage, type ChatMessage } from '../services/chat';

const { width, height } = Dimensions.get('window');

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[]; // Perplexity sources
  isLoading?: boolean;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const { user, nurtures, recentLogs, canUseAiQuery, incrementAiQuery } = useAppStore();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Add welcome message
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: getWelcomeMessage(),
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const userName = user?.name?.split(' ')[0] || '';
    
    if (nurtures.length > 0) {
      const nurtureNames = nurtures.slice(0, 2).map(n => n.name).join(' and ');
      const nurtureType = nurtures[0]?.type;
      
      // Personalized greetings based on nurture type
      const personalQuestions = {
        pet: `How is ${nurtures[0]?.name} doing today? 🐾`,
        plant: `How is ${nurtures[0]?.name} looking today? 🌿`,
        baby: `How is ${nurtures[0]?.name} doing today? 👶`,
      };
      
      const question = personalQuestions[nurtureType as keyof typeof personalQuestions] || `How are ${nurtureNames} doing?`;
      
      return `${greeting}${userName ? `, ${userName}` : ''}! 💚\n\n${question}\n\nI'm here whenever you need advice, want to log something, or just chat about ${nurtureNames}!`;
    }
    
    return `${greeting}${userName ? `, ${userName}` : ''}! 💚\n\nI'm Bloomie, your caring companion! I'm here to help you with your plants, pets, or little ones.\n\nHow are you doing today? ✨`;
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;
    
    // Check rate limit
    if (!canUseAiQuery()) {
      const limitMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "You've reached today's free query limit (20/day). Upgrade to Premium for unlimited AI conversations! 🌟",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, limitMessage]);
      return;
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    try {
      // Increment usage counter
      incrementAiQuery();
      
      // Get the primary nurture for context
      const primaryNurture = nurtures[0];
      
      // Build chat history for context
      const chatHistory: ChatMessage[] = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content,
      }));
      
      const response = await sendChatMessage(
        userMessage.content,
        nurtures.length > 0 ? nurtures : [{ id: '', name: 'General', type: 'plant' as const, user_id: '', created_at: '', updated_at: '' }],
        recentLogs.slice(0, 5),
        chatHistory,
        user?.name
      );
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        timestamp: new Date(),
        sources: response.sources, // Perplexity sources if available
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I couldn't process that. Please try again! 🙏",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === 'user';
    
    return (
      <Animated.View
        key={message.id}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {!isUser && (
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[Colors.plant.main, Colors.plant.dark || Colors.plant.main]}
              style={styles.avatar}
            >
              <MaterialCommunityIcons name="leaf" size={16} color={Colors.white} />
            </LinearGradient>
          </View>
        )}
        
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {message.content}
          </Text>
          
          {/* Show Perplexity sources if available */}
          {message.sources && message.sources.length > 0 && (
            <View style={styles.sourcesContainer}>
              <Text style={styles.sourcesTitle}>📚 Sources:</Text>
              {message.sources.slice(0, 3).map((source, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => Linking.openURL(source)}
                  style={styles.sourceLink}
                >
                  <MaterialCommunityIcons name="link" size={12} color={Colors.primary} />
                  <Text style={styles.sourceText} numberOfLines={1}>
                    {source.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        {isUser && (
          <View style={styles.userAvatarContainer}>
            <View style={styles.userAvatar}>
              <MaterialCommunityIcons name="account" size={16} color={Colors.white} />
            </View>
          </View>
        )}
      </Animated.View>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {[
          { icon: '💧', text: 'Watering tips' },
          { icon: '🌿', text: 'Yellow leaves?' },
          { icon: '🐾', text: 'Feeding schedule' },
          { icon: '👶', text: 'Sleep advice' },
        ].map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.quickActionButton}
            onPress={() => setInputText(action.text)}
          >
            <Text style={styles.quickActionIcon}>{action.icon}</Text>
            <Text style={styles.quickActionText}>{action.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#F8FAF5', '#EDF5E6', '#F5F9F2']}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.charcoal} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <LinearGradient
              colors={[Colors.plant.main, Colors.terracotta[500]]}
              style={styles.headerAvatarGradient}
            >
              <MaterialCommunityIcons name="leaf" size={20} color={Colors.white} />
            </LinearGradient>
          </View>
          <View>
            <Text style={styles.headerTitle}>Bloomie</Text>
            <Text style={styles.headerSubtitle}>Your care companion</Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <View style={styles.onlineIndicator} />
        </View>
      </View>

      {/* Chat Content with Keyboard Avoiding */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(renderMessage)}
          
          {isLoading && (
            <View style={[styles.messageContainer, styles.assistantMessageContainer]}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={[Colors.plant.main, Colors.plant.dark || Colors.plant.main]}
                  style={styles.avatar}
                >
                  <MaterialCommunityIcons name="leaf" size={16} color={Colors.white} />
                </LinearGradient>
              </View>
              <View style={[styles.messageBubble, styles.assistantBubble, styles.loadingBubble]}>
                <View style={styles.typingIndicator}>
                  <ActivityIndicator size="small" color={Colors.plant.main} />
                  <Text style={styles.typingText}>Bloomie is thinking...</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Actions (show only when no messages or few messages) */}
        {messages.length <= 1 && !isLoading && renderQuickActions()}

        {/* Input Area - Always visible at bottom */}
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask me anything..."
              placeholderTextColor={Colors.gray[400]}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              blurOnSubmit={false}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={
                  inputText.trim() && !isLoading
                    ? [Colors.plant.main, Colors.plant.dark || Colors.plant.main]
                    : [Colors.gray[300], Colors.gray[400]]
                }
                style={styles.sendButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <MaterialCommunityIcons name="send" size={20} color={Colors.white} />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerAvatarGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.plant.main,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  assistantMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarContainer: {
    marginLeft: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.terracotta[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: width * 0.7,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: Colors.terracotta[500],
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    ...Shadows.sm,
  },
  loadingBubble: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.charcoal,
  },
  userMessageText: {
    color: Colors.white,
  },
  sourcesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  sourcesTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gray[500],
    marginBottom: 6,
  },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  sourceText: {
    fontSize: 12,
    color: Colors.primary,
    flex: 1,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    fontSize: 14,
    color: Colors.gray[500],
    fontStyle: 'italic',
  },
  quickActions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    marginRight: 8,
    ...Shadows.sm,
  },
  quickActionIcon: {
    fontSize: 16,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.charcoal,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.gray[50],
    borderRadius: 22,
    fontSize: 15,
    color: Colors.charcoal,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
