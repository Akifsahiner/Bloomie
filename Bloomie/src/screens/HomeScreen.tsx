// Bloomie - Home Screen (Fully Functional)

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Animated,
  RefreshControl,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';

import { Colors, Spacing, BorderRadius, Shadows, getNurtureColors } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import { parseUserInput, getSuggestedReminderTime, generateNotificationText } from '../services/openai';
import { sendChatMessage, type ChatMessage } from '../services/chat';
import { getUpcomingTasks, type UpcomingTask } from '../services/upcoming-tasks';
import { imageService } from '../services/media';
import { voiceService } from '../services/voice';
import { formatRelativeTime, generateId, getGreeting, getTimeOfDayIcon } from '../utils/helpers';
import { getHealthAlerts, filterAcknowledgedAlerts, acknowledgeAlert, type HealthAlert } from '../services/health-alerts';
import HealthAlertCard from '../components/HealthAlertCard';
import type { NurtureType, LogEntry, Nurture, Reminder } from '../types';

const { width } = Dimensions.get('window');

// AI Processing Card Component
const AIProcessingCard = ({ 
  text, 
  nurtureType,
  isProcessing 
}: { 
  text: string; 
  nurtureType?: NurtureType;
  isProcessing: boolean;
}) => {
  const colors = nurtureType ? getNurtureColors(nurtureType) : Colors.baby;
  const wobbleAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isProcessing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(wobbleAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(wobbleAnim, {
            toValue: -1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(wobbleAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isProcessing]);

  const rotate = wobbleAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-1deg', '0deg', '1deg'],
  });

  return (
    <Animated.View 
      style={[
        styles.aiCard,
        { transform: [{ rotate }] }
      ]}
    >
      {/* Sparkle decoration */}
      <View style={styles.sparkleContainer}>
        <View style={styles.sparkleGlow} />
        <View style={styles.sparkleBadge}>
          <MaterialCommunityIcons
            name="auto-fix"
            size={20}
            color={Colors.primary}
          />
        </View>
      </View>

      <View style={styles.aiCardContent}>
        {/* Magic indicator */}
        <View style={styles.magicIndicator}>
          <MaterialCommunityIcons
            name="white-balance-sunny"
            size={14}
            color={Colors.primary}
          />
          <Text style={styles.magicText}>Magic at work...</Text>
        </View>

        {/* Input text */}
        <Text style={styles.aiInputText}>{text}</Text>

        {/* Progress indicator */}
        <View style={styles.progressRow}>
          <View style={[styles.categoryIcon, { backgroundColor: colors.bg }]}>
            <MaterialCommunityIcons
              name={nurtureType === 'baby' ? 'baby-face' : nurtureType === 'plant' ? 'flower' : 'paw'}
              size={16}
              color={colors.text}
            />
          </View>
          <View style={styles.progressBarContainer}>
            <Animated.View style={[styles.progressBarFill, { width: '75%' }]} />
          </View>
          <Text style={styles.progressLabel}>Categorizing</Text>
        </View>
      </View>
    </Animated.View>
  );
};

// Nurture Card Component with Status Summary
const NurtureCard = ({ 
  nurture, 
  lastLog, 
  recentLogs 
}: { 
  nurture: Nurture; 
  lastLog?: LogEntry;
  recentLogs?: LogEntry[];
}) => {
  const navigation = useNavigation();
  const colors = getNurtureColors(nurture.type);
  const iconName = nurture.type === 'baby' ? 'baby-face' : 
                   nurture.type === 'pet' ? 'paw' : 'flower';

  // Get status summary
  const getStatusSummary = (): string => {
    if (!lastLog) return 'No activity yet';
    
    const now = new Date();
    const logTime = new Date(lastLog.created_at);
    const hoursAgo = (now.getTime() - logTime.getTime()) / (1000 * 60 * 60);
    
    const action = lastLog.parsed_action?.toLowerCase() || lastLog.raw_input?.toLowerCase() || '';
    
    if (nurture.type === 'pet') {
      if (action.includes('feed') || action.includes('food') || action.includes('meal')) {
        const timeStr = logTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return `Last fed: ${timeStr} (${hoursAgo < 2 ? 'Full' : hoursAgo < 4 ? 'Normal' : 'Might be hungry'})`;
      }
      if (action.includes('walk') || action.includes('exercise')) {
        return hoursAgo < 2 ? 'Just walked' : `${Math.floor(hoursAgo)} hours ago`;
      }
    }
    
    if (nurture.type === 'plant') {
      if (action.includes('water') || action.includes('watered')) {
        const daysAgo = Math.floor(hoursAgo / 24);
        if (daysAgo === 0) return 'Watered today';
        if (daysAgo === 1) return 'Watered yesterday';
        return `Watered ${daysAgo} days ago`;
      }
      // Check soil moisture based on last watering
      const lastWatering = recentLogs?.find(log => 
        log.nurture_id === nurture.id && 
        (log.parsed_action?.toLowerCase().includes('water') || log.raw_input?.toLowerCase().includes('water'))
      );
      if (lastWatering) {
        const daysSinceWatering = Math.floor((now.getTime() - new Date(lastWatering.created_at).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceWatering < 3) return 'Soil is moist';
        if (daysSinceWatering < 7) return 'Soil is drying';
        return 'Soil is dry';
      }
    }
    
    if (nurture.type === 'baby') {
      if (action.includes('feed') || action.includes('milk') || action.includes('bottle')) {
        const timeStr = logTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return `Last fed: ${timeStr}`;
      }
      if (action.includes('diaper') || action.includes('change')) {
        return hoursAgo < 1 ? 'Just changed' : `${Math.floor(hoursAgo)} hours ago`;
      }
    }
    
    return formatRelativeTime(lastLog.created_at);
  };

  return (
    <TouchableOpacity
      style={[styles.nurtureCard, { borderColor: colors.border }]}
      onPress={() => (navigation as any).navigate('NurtureDetail', { nurtureId: nurture.id })}
      activeOpacity={0.8}
    >
      {/* Top gradient */}
      <View style={[styles.nurtureCardGradient, { backgroundColor: `${colors.bg}33` }]} />
      
      {/* Avatar or Icon */}
      <View style={[styles.nurtureIcon, { backgroundColor: `${colors.bg}4D` }]}>
        {nurture.avatar_url ? (
          <Image 
            source={{ uri: nurture.avatar_url }} 
            style={styles.nurtureAvatar} 
          />
        ) : (
          <MaterialCommunityIcons
            name={iconName}
            size={26}
            color={colors.textDark}
          />
        )}
      </View>
      
      {/* Name */}
      <Text style={styles.nurtureName} numberOfLines={1}>{nurture.name}</Text>
      
      {/* Status Summary */}
      <Text style={styles.nurtureStatus} numberOfLines={1}>
        {getStatusSummary()}
      </Text>
    </TouchableOpacity>
  );
};

// Timeline Entry Component
const TimelineEntry = ({ 
  log, 
  nurture,
  onDelete 
}: { 
  log: LogEntry; 
  nurture?: Nurture;
  onDelete?: () => void;
}) => {
  const colors = nurture ? getNurtureColors(nurture.type) : Colors.baby;
  const time = format(new Date(log.created_at), 'h:mm a');

  const handleLongPress = () => {
    if (onDelete) {
      Alert.alert(
        'Delete Entry',
        'Are you sure you want to delete this entry?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: onDelete },
        ]
      );
    }
  };

  return (
    <TouchableOpacity 
      style={styles.timelineEntry}
      onLongPress={handleLongPress}
      delayLongPress={500}
      activeOpacity={0.8}
    >
      {/* Dot */}
      <View style={styles.timelineDotContainer}>
        <View style={[styles.timelineDot, { backgroundColor: colors.text }]} />
      </View>
      
      <View style={styles.timelineContent}>
        {/* Header */}
        <View style={styles.timelineHeader}>
          <Text style={[styles.timelineNurture, { color: colors.textDark }]}>
            {nurture?.name || 'Unknown'}
          </Text>
          <Text style={styles.timelineTime}>{time}</Text>
        </View>
        
        {/* Card */}
        <View style={[styles.timelineCard, { borderLeftColor: `${colors.text}4D` }]}>
          <Text style={styles.timelineText}>
            {log.parsed_notes || log.raw_input}
          </Text>
          
          {/* Photo if exists */}
          {log.photo_urls && log.photo_urls.length > 0 && (
            <View style={styles.timelinePhoto}>
              <Image
                source={{ uri: log.photo_urls[0] }}
                style={styles.timelinePhotoImage}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Mood indicator */}
          {log.mood && (
            <View style={styles.moodBadge}>
              <Text style={styles.moodEmoji}>
                {log.mood === 'happy' ? '😊' : 
                 log.mood === 'sad' ? '😢' : 
                 log.mood === 'tired' ? '😴' :
                 log.mood === 'energetic' ? '⚡' : '😐'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Voice Recording Overlay with Waveform
const VoiceRecordingOverlay = ({ 
  isRecording, 
  transcript,
  onStop, 
  onCancel 
}: { 
  isRecording: boolean;
  transcript?: string;
  onStop: () => void; 
  onCancel: () => void;
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(0.3)).current;
  const waveAnim2 = useRef(new Animated.Value(0.5)).current;
  const waveAnim3 = useRef(new Animated.Value(0.4)).current;
  const waveAnim4 = useRef(new Animated.Value(0.6)).current;
  const waveAnim5 = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (isRecording) {
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Waveform animations (using scaleY instead of height for native driver support)
      const createWaveAnim = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        );
      };

      createWaveAnim(waveAnim1, 0).start();
      createWaveAnim(waveAnim2, 100).start();
      createWaveAnim(waveAnim3, 200).start();
      createWaveAnim(waveAnim4, 300).start();
      createWaveAnim(waveAnim5, 400).start();
    }
  }, [isRecording]);

  if (!isRecording) return null;

  return (
    <View style={styles.voiceOverlay}>
      {/* Microphone Icon with Pulse */}
      <Animated.View style={[styles.voicePulse, { transform: [{ scale: pulseAnim }] }]}>
        <MaterialCommunityIcons name="microphone" size={48} color={Colors.white} />
      </Animated.View>

      {/* Waveform Animation */}
      <View style={styles.waveformContainer}>
        {[waveAnim1, waveAnim2, waveAnim3, waveAnim4, waveAnim5].map((anim, index) => {
          const scaleY = anim.interpolate({
            inputRange: [0.3, 1],
            outputRange: [0.33, 1], // 20/60 = 0.33, 60/60 = 1
          });
          const opacity = anim.interpolate({
            inputRange: [0.3, 1],
            outputRange: [0.6, 1],
          });
          
          return (
            <Animated.View
              key={index}
              style={[
                styles.waveBar,
                {
                  transform: [{ scaleY }],
                  opacity,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Real-time Transcript */}
      {transcript && (
        <View style={styles.transcriptCard}>
          <Text style={styles.transcriptText}>{transcript}</Text>
        </View>
      )}

      <Text style={styles.voiceText}>
        {transcript ? 'Listening...' : 'Start speaking...'}
      </Text>

      <View style={styles.voiceButtons}>
        <TouchableOpacity style={styles.voiceCancelButton} onPress={onCancel}>
          <MaterialCommunityIcons name="close" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.voiceStopButton} onPress={onStop}>
          <MaterialCommunityIcons name="check" size={28} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAICard, setShowAICard] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceConfirmation, setVoiceConfirmation] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [healthAlerts, setHealthAlerts] = useState<HealthAlert[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const { 
    user, 
    nurtures, 
    recentLogs, 
    upcomingReminders,
    addLog, 
    removeLog,
    addReminder,
    syncData,
    isSyncing 
  } = useAppStore();

  // Get today's logs (memoized)
  const todayLogs = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return recentLogs.filter(log => log.created_at.startsWith(todayStr));
  }, [recentLogs]);

  // Get last log for each nurture (memoized)
  const getLastLogForNurture = useCallback((nurtureId: string) => {
    return recentLogs.find(log => log.nurture_id === nurtureId);
  }, [recentLogs]);

  // Load upcoming tasks
  useEffect(() => {
    const loadUpcomingTasks = async () => {
      if (nurtures.length > 0) {
        try {
          const tasks = await getUpcomingTasks(nurtures, recentLogs, upcomingReminders);
          setUpcomingTasks(tasks);
        } catch (error) {
          console.error('Error loading upcoming tasks:', error);
          // Silently fail - tasks are not critical
        }
      }
    };
    loadUpcomingTasks();
  }, [nurtures, recentLogs, upcomingReminders]);

  // Load health alerts
  useEffect(() => {
    const loadHealthAlerts = async () => {
      if (nurtures.length === 0 || recentLogs.length < 3) {
        setHealthAlerts([]);
        return;
      }

      setIsLoadingAlerts(true);
      try {
        const alerts = await getHealthAlerts(nurtures, recentLogs);
        const filtered = await filterAcknowledgedAlerts(alerts);
        setHealthAlerts(filtered.slice(0, 3)); // Show max 3 alerts
      } catch (error) {
        console.error('Error loading health alerts:', error);
        setHealthAlerts([]);
      } finally {
        setIsLoadingAlerts(false);
      }
    };

    loadHealthAlerts();
    
    // Refresh alerts every 5 minutes
    const interval = setInterval(loadHealthAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [nurtures, recentLogs]);

  // Handle health alert actions
  const handleAlertAction = async (alert: HealthAlert, action: 'dismiss' | 'check' | 'advice' | 'resolved') => {
    if (action === 'dismiss') {
      await acknowledgeAlert(alert.id, 'dismissed');
      setHealthAlerts(prev => prev.filter(a => a.id !== alert.id));
    } else if (action === 'check') {
      // Navigate to nurture detail
      navigation.navigate('NurtureDetail' as never, { nurtureId: alert.nurtureId } as never);
      await acknowledgeAlert(alert.id, 'action_taken');
    } else if (action === 'resolved') {
      // Mark as resolved and log the action
      await acknowledgeAlert(alert.id, 'resolved');
      
      // Auto-log the action based on alert category
      const nurture = nurtures.find(n => n.id === alert.nurtureId);
      if (nurture) {
        let actionText = '';
        switch (alert.category) {
          case 'watering':
            actionText = `watered ${nurture.name}`;
            break;
          case 'feeding':
            actionText = `fed ${nurture.name}`;
            break;
          case 'schedule':
            actionText = `completed ${alert.title.toLowerCase()}`;
            break;
          default:
            actionText = `addressed ${alert.title.toLowerCase()}`;
        }
        
        if (actionText) {
          const logEntry: LogEntry = {
            id: generateId(),
            nurture_id: nurture.id,
            user_id: user?.id || '',
            raw_input: actionText,
            parsed_action: actionText,
            parsed_subject: nurture.name,
            created_at: new Date().toISOString(),
          };
          
          await addLog(logEntry);
        }
      }
      
      setHealthAlerts(prev => prev.filter(a => a.id !== alert.id));
    } else if (action === 'advice') {
      // Open chat with AI
      const message = `I got an alert about ${alert.nurtureName}: ${alert.title}. ${alert.details}. What should I do?`;
      navigation.navigate('Chat' as never, { initialMessage: message } as never);
      await acknowledgeAlert(alert.id, 'action_taken');
    }
  };

  // Format date (memoized)
  const { day, monthDay } = useMemo(() => {
    const date = new Date();
    return {
      day: format(date, 'EEEE'),
      monthDay: format(date, 'MMM d'),
    };
  }, []);

  // Handle image selection
  const handleImagePress = useCallback(async () => {
    try {
      const image = await imageService.showImagePicker();
      if (image) {
        setSelectedImage(image.uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      // Silently fail - user might have cancelled
    }
  }, []);

  // Handle voice input
  const handleVoiceStart = useCallback(async () => {
    if (isRecording || isTranscribing || isProcessing) return;
    
    setVoiceTranscript('');
    setVoiceConfirmation(null);
    
    try {
      const started = await voiceService.startRecording();
      if (started) {
        setIsRecording(true);
      } else {
        Alert.alert('Microphone Permission', 'Microphone permission is required. Please grant permission in settings.');
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Microphone Error', 'Failed to start microphone. Please try again.');
    }
  }, [isRecording, isTranscribing, isProcessing]);

  const handleVoiceStop = useCallback(async () => {
    if (!isRecording) return;
    
    setIsRecording(false);
    setIsTranscribing(true);
    
    try {
      const audioUri = await voiceService.stopRecording();
      if (!audioUri) {
        setIsTranscribing(false);
        Alert.alert('Recording Error', 'Failed to record audio. Please try again.');
        return;
      }
      
      // Transcribe with Whisper API
      const transcript = await voiceService.transcribeAudio(audioUri);
      
      if (transcript && transcript.trim()) {
        setVoiceTranscript(transcript);
        // Set transcript to input text (user can edit before sending)
        setInputText(transcript);
        
        // Auto-scroll to input
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
        
        // Clear transcript after a moment
        setTimeout(() => {
          setVoiceTranscript('');
        }, 2000);
      } else {
        Alert.alert('Transcription', 'Could not understand audio. Please try again.');
      }
    } catch (error: any) {
      console.error('Voice transcription error:', error);
      const errorMessage = error?.message?.includes('network') || error?.message?.includes('fetch')
        ? 'Internet connection required. Please check your connection.'
        : 'An error occurred while processing audio. Please try again.';
      
      Alert.alert('Error', errorMessage, [{ 
        text: 'OK', 
        onPress: () => {
          setVoiceTranscript('');
          setVoiceConfirmation(null);
        }
      }]);
    } finally {
      setIsTranscribing(false);
    }
  }, [isRecording]);

  const handleCancelRecording = useCallback(async () => {
    try {
      await voiceService.cancelRecording();
    } catch (error) {
      // Silently fail - recording might already be stopped
    } finally {
      setIsRecording(false);
      setVoiceTranscript('');
      setVoiceConfirmation(null);
    }
  }, []);

  // Handle Magic Input submission (Chat Interface with Function Calling)
  const handleSubmit = useCallback(async () => {
    if (!inputText.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    // Add user message to chat
    setChatMessages(prev => [...prev, userMessage]);
    const messageText = inputText.trim();
    setInputText('');
    setIsProcessing(true);
    
    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Send to AI chat service (with Function Calling)
      const aiResponse = await sendChatMessage(
        messageText,
        nurtures,
        recentLogs,
        chatMessages,
        user?.name // Pass user name for personalization
      );

      // Add AI response to chat with function info
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: aiResponse.response,
        timestamp: new Date().toISOString(),
        functionCalled: aiResponse.functionCalled || undefined,
        suggestedReminder: aiResponse.suggestedReminder,
        shouldLog: aiResponse.shouldLog,
      };

      setChatMessages(prev => [...prev, assistantMessage]);

      // If AI decided to log an activity, do it
      if (aiResponse.shouldLog) {
        // Find nurture by ID or name
        let matchedNurture = aiResponse.shouldLog.nurtureId 
          ? nurtures.find(n => n.id === aiResponse.shouldLog!.nurtureId)
          : null;
        
        // Fallback: match by name
        if (!matchedNurture && aiResponse.shouldLog.nurtureName) {
          matchedNurture = nurtures.find(n => 
            n.name.toLowerCase() === aiResponse.shouldLog!.nurtureName!.toLowerCase() ||
            n.name.toLowerCase().includes(aiResponse.shouldLog!.nurtureName!.toLowerCase())
          );
        }
        
        // If still no match and only one nurture, use that
        if (!matchedNurture && nurtures.length === 1) {
          matchedNurture = nurtures[0];
        }

        if (matchedNurture && user) {
          let photoUrls: string[] = [];
          if (selectedImage && user) {
            const uploadedUrl = await imageService.uploadImage(user.id, {
              uri: selectedImage,
              width: 0,
              height: 0,
            });
            if (uploadedUrl) {
              photoUrls = [uploadedUrl];
            }
          }

          const newLog: LogEntry = {
            id: generateId(),
            nurture_id: matchedNurture.id,
            user_id: user.id,
            raw_input: userMessage.content,
            parsed_action: aiResponse.shouldLog.action,
            parsed_subject: matchedNurture.name,
            parsed_notes: aiResponse.shouldLog.notes,
            photo_urls: photoUrls.length > 0 ? photoUrls : (selectedImage ? [selectedImage] : undefined),
            created_at: new Date().toISOString(),
          };

          await addLog(newLog);
        }
      }

      // If AI suggests a reminder, ask user for confirmation
      if (aiResponse.suggestedReminder) {
        // Find nurture for reminder
        let reminderNurtureId = aiResponse.suggestedReminder.nurtureId;
        if (!reminderNurtureId && aiResponse.suggestedReminder.nurtureName) {
          const matchedNurture = nurtures.find(n => 
            n.name.toLowerCase() === aiResponse.suggestedReminder!.nurtureName!.toLowerCase()
          );
          if (matchedNurture) {
            reminderNurtureId = matchedNurture.id;
          }
        }
        // If still no match and only one nurture, use that
        if (!reminderNurtureId && nurtures.length === 1) {
          reminderNurtureId = nurtures[0].id;
        }

        const reminder: Reminder = {
          id: generateId(),
          user_id: user?.id || '',
          nurture_id: reminderNurtureId || nurtures[0]?.id || '',
          title: aiResponse.suggestedReminder.title,
          description: aiResponse.suggestedReminder.description || aiResponse.suggestedReminder.title,
          scheduled_at: aiResponse.suggestedReminder.scheduledAt,
          is_ai_generated: true,
          is_completed: false,
          created_at: new Date().toISOString(),
        };

        // Format time for display
        const reminderTime = new Date(aiResponse.suggestedReminder.scheduledAt);
        const timeDisplay = reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        Alert.alert(
          '⏰ Add Reminder?',
          `"${aiResponse.suggestedReminder.title}" at ${timeDisplay}`,
          [
            { text: 'No', style: 'cancel' },
            { 
              text: 'Yes!', 
              onPress: async () => {
                await addReminder(reminder);
                // Add confirmation message
                const confirmMessage: ChatMessage = {
                  id: generateId(),
                  role: 'assistant',
                  content: `Great! I'll remind you at ${timeDisplay}. ⏰`,
                  timestamp: new Date().toISOString(),
                };
                setChatMessages(prev => [...prev, confirmMessage]);
              },
            },
          ]
        );
      }

      setSelectedImage(null);
      
      // Scroll to bottom after AI response
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage = error?.message?.includes('network') || error?.message?.includes('fetch')
        ? 'Internet connection required. Please check your connection. 📡'
        : 'Sorry, something went wrong. Would you like to try again? 😊';
      
      const errorChatMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, errorChatMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, [inputText, isProcessing, nurtures, recentLogs, chatMessages, selectedImage, user, addLog, addReminder]);

  const handleDeleteLog = useCallback(async (logId: string) => {
    try {
      await removeLog(logId);
    } catch (error) {
      console.error('Delete log error:', error);
      Alert.alert('Error', 'An error occurred while deleting the entry.');
    }
  }, [removeLog]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await syncData();
    } catch (error) {
      console.error('Refresh error:', error);
      // Silently fail - user can try again
    } finally {
      setRefreshing(false);
    }
  }, [syncData]);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingTop: insets.top + 16, 
            paddingBottom: chatMessages.length > 0 ? 250 : 200 
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isSyncing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerDecor} />
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>
                {getGreeting()},{'\n'}{user?.name || 'Friend'}
              </Text>
              <MaterialCommunityIcons
                name={getTimeOfDayIcon() as any}
                size={28}
                color={Colors.yellow}
                style={styles.weatherIcon}
              />
            </View>
            <Text style={styles.dateText}>
              <Text style={styles.dateDay}>{day.toUpperCase()}, {monthDay.toUpperCase()}</Text>
              <Text style={styles.dateSeparator}> • </Text>
              <Text style={styles.dateWeather}>{todayLogs.length} entries today</Text>
            </Text>
          </View>
          
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.voiceModeButton}
              onPress={() => navigation.navigate('VoiceMode' as never)}
            >
              <LinearGradient
                colors={[Colors.terracotta[400], Colors.terracotta[600]]}
                style={styles.voiceModeButtonGradient}
              >
                <MaterialCommunityIcons
                  name="microphone"
                  size={18}
                  color={Colors.white}
                />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('Settings' as never)}
            >
              <MaterialCommunityIcons
                name="cog-outline"
                size={22}
                color={Colors.textSubtle}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Magic Input - Opens Chat Screen */}
        <TouchableOpacity 
          style={styles.inputSection}
          onPress={() => navigation.navigate('Chat' as never)}
          activeOpacity={0.9}
        >
          <View style={styles.inputGlow} />
          <View style={styles.inputContainer}>
            <View style={styles.magicInputPlaceholder}>
              <Text style={styles.magicInputPlaceholderText}>
                Ask Bloomie anything... ✨
              </Text>
            </View>
            <View style={styles.inputButtons}>
              <View style={styles.inputIconButton}>
                <MaterialCommunityIcons 
                  name="message-text-outline" 
                  size={20} 
                  color={Colors.primary} 
                />
              </View>
              <TouchableOpacity
                style={styles.inputIconButton}
                onPress={(e) => {
                  e.stopPropagation();
                  navigation.navigate('VoiceMode' as never);
                }}
              >
                <MaterialCommunityIcons 
                  name="microphone-outline" 
                  size={20} 
                  color={Colors.primary} 
                />
              </TouchableOpacity>
              <View style={styles.sendButton}>
                <MaterialCommunityIcons name="arrow-right" size={20} color={Colors.white} />
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* AI Processing Card */}
        {showAICard && (
          <AIProcessingCard 
            text={inputText || "Processing..."}
            nurtureType={nurtures[0]?.type || 'pet'}
            isProcessing={isProcessing}
          />
        )}

        {/* Health Alerts - Proactive AI Monitoring */}
        {nurtures.length > 0 && recentLogs.length >= 3 && (
          <View style={styles.section}>
            <View style={styles.healthAlertsHeader}>
              <View style={styles.healthAlertsTitleContainer}>
                <MaterialCommunityIcons name="heart-pulse" size={20} color={Colors.terracotta[500]} />
                <Text style={styles.healthAlertsTitle}>Health Alerts</Text>
                {healthAlerts.length > 0 && (
                  <View style={styles.alertBadge}>
                    <Text style={styles.alertBadgeText}>{healthAlerts.length}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.viewHistoryButton}
                onPress={() => navigation.navigate('AlertHistory' as never)}
              >
                <Text style={styles.viewHistoryText}>History</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.terracotta[500]} />
              </TouchableOpacity>
            </View>
            {isLoadingAlerts ? (
              <View style={styles.alertLoading}>
                <ActivityIndicator size="small" color={Colors.plant.main} />
                <Text style={styles.alertLoadingText}>Analyzing health patterns...</Text>
              </View>
            ) : healthAlerts.length > 0 ? (
              healthAlerts.map((alert) => (
                <HealthAlertCard
                  key={alert.id}
                  alert={alert}
                  onAction={(action) => handleAlertAction(alert, action)}
                  onDismiss={() => handleAlertAction(alert, 'dismiss')}
                />
              ))
            ) : (
              <View style={styles.noAlertsCard}>
                <MaterialCommunityIcons name="check-circle" size={32} color={Colors.plant.main} />
                <Text style={styles.noAlertsTitle}>All Good! ✨</Text>
                <Text style={styles.noAlertsText}>
                  Your nurtures are healthy and on track. Keep up the great care! 💚
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Up Next - AI Suggested Tasks */}
        {upcomingTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏰ Up Next</Text>
            <View style={styles.upNextCard}>
              {upcomingTasks.map((task) => {
                const nurture = nurtures.find(n => n.id === task.nurtureId);
                const colors = nurture ? getNurtureColors(nurture.type) : Colors.baby;
                const colorMain = typeof colors === 'object' ? colors.main : Colors.primary;
                const isUrgent = task.urgency === 'high';
                const timeUntil = Math.floor((new Date(task.scheduledTime).getTime() - Date.now()) / (1000 * 60));
                
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[
                      styles.upNextItem,
                      isUrgent && styles.upNextItemUrgent,
                    ]}
                    onPress={() => {
                      if (nurture) {
                        (navigation as any).navigate('NurtureDetail', { nurtureId: nurture.id });
                      }
                    }}
                  >
                    <View style={[styles.upNextIcon, { backgroundColor: `${colorMain}20` }]}>
                      <MaterialCommunityIcons 
                        name={task.icon as any} 
                        size={20} 
                        color={colorMain} 
                      />
                    </View>
                    <View style={styles.upNextContent}>
                      <View style={styles.upNextHeader}>
                        <Text style={styles.upNextTime}>{task.timeDisplay}</Text>
                        {isUrgent && (
                          <View style={styles.upNextUrgentBadge}>
                            <Text style={styles.upNextUrgentText}>Soon</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.upNextTask}>{task.task}</Text>
                      {timeUntil > 0 && timeUntil < 120 && (
                        <Text style={styles.upNextTimeUntil}>
                          in {timeUntil} minutes
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Your Nurtures */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Nurtures</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => navigation.navigate('AddNurture' as never)}
            >
              <Text style={styles.editText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {nurtures.length > 0 ? (
            <View style={styles.nurturesGrid}>
              {nurtures.slice(0, 3).map((nurture) => (
                <NurtureCard
                  key={nurture.id}
                  nurture={nurture}
                  lastLog={getLastLogForNurture(nurture.id)}
                  recentLogs={recentLogs}
                />
              ))}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.emptyNurtures}
              onPress={() => navigation.navigate('AddNurture' as never)}
            >
              <MaterialCommunityIcons
                name="plus-circle-outline"
                size={40}
                color={Colors.primary}
              />
              <Text style={styles.emptyText}>
                Add your first baby, pet, or plant
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Premium Features Grid */}
        <View style={styles.premiumFeaturesSection}>
          <Text style={styles.premiumFeaturesTitle}>✨ Premium Tools</Text>
          <View style={styles.premiumFeaturesGrid}>
            {/* Photo Health Check */}
            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => navigation.navigate('PhotoAnalysis' as never)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#E8F5E9', '#C8E6C9']}
                style={styles.featureCardGradient}
              >
                <View style={[styles.featureCardIcon, { backgroundColor: Colors.plant.main }]}>
                  <MaterialCommunityIcons name="camera" size={22} color={Colors.white} />
                </View>
                <Text style={styles.featureCardTitle}>Health Check</Text>
                <Text style={styles.featureCardSubtitle}>AI photo analysis</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Weekly Report */}
            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => navigation.navigate('WeeklyReport' as never)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFF3E0', '#FFE0B2']}
                style={styles.featureCardGradient}
              >
                <View style={[styles.featureCardIcon, { backgroundColor: Colors.terracotta[500] }]}>
                  <MaterialCommunityIcons name="chart-bar" size={22} color={Colors.white} />
                </View>
                <Text style={styles.featureCardTitle}>Weekly Report</Text>
                <Text style={styles.featureCardSubtitle}>Care summary</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Health Tracking */}
            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => navigation.navigate('HealthTracking' as never)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#E3F2FD', '#BBDEFB']}
                style={styles.featureCardGradient}
              >
                <View style={[styles.featureCardIcon, { backgroundColor: Colors.babyBlue[500] }]}>
                  <MaterialCommunityIcons name="heart-pulse" size={22} color={Colors.white} />
                </View>
                <Text style={styles.featureCardTitle}>Health Track</Text>
                <Text style={styles.featureCardSubtitle}>Mood & wellness</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Chat Card */}
        <TouchableOpacity 
          style={styles.quickChatCard}
          onPress={() => navigation.navigate('Chat' as never)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[Colors.plant.main, Colors.plant.dark || Colors.plant.main]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickChatGradient}
          >
            <View style={styles.quickChatIcon}>
              <MaterialCommunityIcons name="robot-happy" size={28} color={Colors.white} />
            </View>
            <View style={styles.quickChatContent}>
              <Text style={styles.quickChatTitle}>Chat with Bloomie</Text>
              <Text style={styles.quickChatSubtitle}>Get care advice, tips & answers</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>


      {/* Voice Recording Overlay */}
      <VoiceRecordingOverlay 
        isRecording={isRecording}
        transcript={voiceTranscript}
        onStop={handleVoiceStop}
        onCancel={handleCancelRecording}
      />

      {/* Voice Confirmation Card */}
      {voiceConfirmation && (
        <View style={styles.voiceConfirmationCard}>
          <MaterialCommunityIcons 
            name={voiceConfirmation.type === 'success' ? 'check-circle' : 'information'} 
            size={24} 
            color={voiceConfirmation.type === 'success' ? Colors.plant.main : Colors.primary} 
          />
          <Text style={styles.voiceConfirmationText}>{voiceConfirmation.message}</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmBg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  headerLeft: {
    flex: 1,
    position: 'relative',
  },
  headerDecor: {
    position: 'absolute',
    top: -24,
    left: -16,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${Colors.yellow}33`,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textDark,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  weatherIcon: {
    marginTop: 20,
    marginLeft: 8,
  },
  dateText: {
    marginTop: 8,
  },
  dateDay: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  dateSeparator: {
    color: Colors.textSubtle,
  },
  dateWeather: {
    fontSize: 13,
    color: Colors.textSubtle,
    fontStyle: 'italic',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voiceModeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  voiceModeButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${Colors.primary}1A`,
    ...Shadows.sm,
  },
  inputSection: {
    marginBottom: 32,
    position: 'relative',
  },
  inputGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    opacity: 0.15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 32,
    paddingLeft: 24,
    paddingRight: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: `${Colors.primary}1A`,
    ...Shadows.input,
  },
  magicInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textDark,
    paddingVertical: 12,
    maxHeight: 100,
  },
  magicInputPlaceholder: {
    flex: 1,
    paddingVertical: 14,
  },
  magicInputPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSubtle,
  },
  inputButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  inputIconButtonActive: {
    backgroundColor: Colors.plant.main,
  },
  inputIconButtonRecording: {
    backgroundColor: Colors.error,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    ...Shadows.md,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  imagePreview: {
    marginTop: 12,
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
  },
  imagePreviewImg: {
    width: '100%',
    height: '100%',
  },
  imageRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCard: {
    backgroundColor: Colors.white,
    borderRadius: 40,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: `${Colors.primary}1A`,
    ...Shadows.cozy,
  },
  sparkleContainer: {
    position: 'absolute',
    top: -16,
    right: 16,
  },
  sparkleGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    backgroundColor: `${Colors.primary}4D`,
    borderRadius: 20,
  },
  sparkleBadge: {
    backgroundColor: Colors.white,
    padding: 8,
    borderRadius: 20,
    ...Shadows.sm,
  },
  aiCardContent: {},
  magicIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  magicText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.terracotta[500],
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  aiInputText: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.textDark,
    lineHeight: 26,
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.gray[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: `${Colors.textSubtle}99`,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textDark,
    letterSpacing: -0.3,
  },
  editButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.gray[100],
    ...Shadows.sm,
  },
  editText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSubtle,
    letterSpacing: 0.5,
  },
  nurturesGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  nurtureCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['3xl'],
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    ...Shadows.sm,
    overflow: 'hidden',
  },
  nurtureCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
  },
  nurtureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  nurtureAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  nurtureNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  nurtureName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  nurtureStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: `${Colors.textSubtle}CC`,
  },
  emptyNurtures: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['3xl'],
    borderWidth: 2,
    borderColor: Colors.gray[100],
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSubtle,
    marginTop: 12,
    fontWeight: '600',
  },
  timeline: {
    position: 'relative',
    paddingLeft: 16,
  },
  timelineLine: {
    position: 'absolute',
    left: 19,
    top: 16,
    bottom: 40,
    width: 2,
    borderLeftWidth: 2,
    borderLeftColor: `${Colors.textSubtle}4D`,
    borderStyle: 'dashed',
  },
  timelineEntry: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  timelineDotContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.warmBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  timelineNurture: {
    fontSize: 14,
    fontWeight: '800',
  },
  timelineTime: {
    fontSize: 12,
    color: `${Colors.textSubtle}CC`,
    fontStyle: 'italic',
  },
  timelineCard: {
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 16,
    borderTopLeftRadius: 0,
    borderLeftWidth: 3,
    ...Shadows.sm,
  },
  timelineText: {
    fontSize: 15,
    color: Colors.textDark,
    lineHeight: 24,
    fontWeight: '500',
  },
  timelinePhoto: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    height: 160,
  },
  timelinePhotoImage: {
    width: '100%',
    height: '100%',
  },
  moodBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  moodEmoji: {
    fontSize: 18,
  },
  emptyTimeline: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['3xl'],
  },
  emptyTimelineText: {
    fontSize: 15,
    color: Colors.textSubtle,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  // Up Next Card Styles
  upNextCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['3xl'],
    padding: 16,
    gap: 12,
    ...Shadows.sm,
  },
  upNextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.gray[50],
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  upNextItemUrgent: {
    backgroundColor: `${Colors.error}10`,
    borderColor: `${Colors.error}30`,
  },
  upNextIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upNextContent: {
    flex: 1,
  },
  upNextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  upNextTime: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  upNextUrgentBadge: {
    backgroundColor: Colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  upNextUrgentText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  upNextTask: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.charcoal,
    marginBottom: 2,
  },
  upNextTimeUntil: {
    fontSize: 11,
    color: Colors.textSubtle,
    fontStyle: 'italic',
  },
  // Chat Interface Styles
  chatContainer: {
    gap: 12,
    minHeight: 100,
    marginBottom: 16,
    paddingBottom: 8,
  },
  chatBubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 20,
    marginBottom: 8,
    minHeight: 40,
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  chatBubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    ...Shadows.sm,
  },
  chatBubbleText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.charcoal,
    fontWeight: '500',
  },
  chatBubbleTextUser: {
    color: Colors.white,
    fontWeight: '500',
  },
  // Voice Conversation Button Styles
  voiceConversationSection: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceConversationButton: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  voiceConversationButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  voiceButtonGradient: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  voiceButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  voiceButtonSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: `${Colors.white}CC`,
    marginTop: 4,
  },
  fixedVoiceButton: {
    position: 'absolute',
    bottom: 140,
    left: 24,
    right: 24,
    zIndex: 1000,
    alignItems: 'center',
  },
  voiceButtonSmall: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  voiceButtonSmallPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
  voiceButtonSmallDisabled: {
    opacity: 0.6,
  },
  voiceButtonSmallGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minWidth: 120,
  },
  voiceButtonSmallText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  // Fixed Input Bar Styles
  fixedInputBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
    zIndex: 1000,
    ...Shadows.md,
  },
  fixedInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    minHeight: 60,
  },
  fixedInputIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixedInputIconRecording: {
    backgroundColor: Colors.primary,
  },
  fixedInput: {
    flex: 1,
    backgroundColor: Colors.gray[50],
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  fixedInputSend: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixedInputSendDisabled: {
    backgroundColor: Colors.gray[300],
  },
  fixedImagePreview: {
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
  },
  fixedImagePreviewImg: {
    width: '100%',
    height: '100%',
  },
  fixedImageRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 10,
    backgroundColor: `${Colors.primary}15`,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  reminderSuggestionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    flex: 1,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['3xl'],
  },
  emptyChatText: {
    fontSize: 15,
    color: Colors.textSubtle,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  // Voice Recording Overlay
  voiceOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  voicePulse: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  voiceText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 48,
  },
  voiceButtons: {
    flexDirection: 'row',
    gap: 24,
  },
  voiceCancelButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceStopButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.plant.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Waveform Styles
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 24,
    height: 60,
  },
  waveBar: {
    width: 4,
    height: 60,
    backgroundColor: Colors.white,
    borderRadius: 2,
  },
  // Transcript Card
  transcriptCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginHorizontal: 32,
    marginBottom: 16,
    maxWidth: '90%',
    ...Shadows.md,
  },
  transcriptText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.charcoal,
    textAlign: 'center',
    lineHeight: 24,
  },
  // Voice Confirmation Card
  voiceConfirmationCard: {
    position: 'absolute',
    top: 100,
    left: 24,
    right: 24,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Shadows.md,
    zIndex: 1001,
  },
  voiceConfirmationText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.charcoal,
    lineHeight: 22,
  },
  // Quick Chat Card
  quickChatCard: {
    marginHorizontal: Spacing.xl,
    marginBottom: 120,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.md,
  },
  quickChatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  quickChatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChatContent: {
    flex: 1,
  },
  quickChatTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 2,
  },
  quickChatSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  // Health Alerts
  healthAlertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  healthAlertsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  healthAlertsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  alertBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.terracotta[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  alertBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  viewHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.terracotta[50],
    gap: 4,
  },
  viewHistoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.terracotta[500],
  },
  alertLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    gap: 12,
    ...Shadows.sm,
  },
  alertLoadingText: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  noAlertsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 24,
    alignItems: 'center',
    ...Shadows.sm,
  },
  noAlertsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.charcoal,
    marginTop: 12,
    marginBottom: 6,
  },
  noAlertsText: {
    fontSize: 14,
    color: Colors.gray[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  // Premium Features
  premiumFeaturesSection: {
    marginBottom: 24,
  },
  premiumFeaturesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.charcoal,
    marginBottom: 16,
  },
  premiumFeaturesGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  featureCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  featureCardGradient: {
    padding: 16,
    alignItems: 'center',
    minHeight: 120,
  },
  featureCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.charcoal,
    textAlign: 'center',
  },
  featureCardSubtitle: {
    fontSize: 11,
    color: Colors.gray[500],
    textAlign: 'center',
    marginTop: 2,
  },
});
