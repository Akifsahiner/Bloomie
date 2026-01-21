// Bloomie - Nurture Detail Screen (with AI Chat, Photo Analysis & Smart Recommendations)

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system/legacy';

import { Colors, Spacing, BorderRadius, Shadows, getNurtureColors } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import { generateInsights } from '../services/openai';
import { sendChatMessage, type ChatMessage as ChatMsg } from '../services/chat';
import { imageService } from '../services/media';
import { voiceService } from '../services/voice';
import { 
  analyzePhoto, 
  getSmartRecommendations, 
  getPlantCareInfo,
  getPetCareInfo,
  getBabyMilestones,
  PLANT_CARE_DATABASE,
  type CareRecommendation,
  type PhotoAnalysisResult,
} from '../services/ai-assistant';
import { formatRelativeTime, generateId } from '../utils/helpers';
import { notificationService } from '../services/notifications';
import type { RootStackParamList, Nurture, LogEntry, Reminder } from '../types';

const { width, height } = Dimensions.get('window');

type NurtureDetailRouteProp = RouteProp<RootStackParamList, 'NurtureDetail'>;

export default function NurtureDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<NurtureDetailRouteProp>();
  const scrollRef = useRef<ScrollView>(null);
  
  const { nurtureId } = route.params;
  const { 
    nurtures, 
    recentLogs, 
    removeNurture, 
    updateNurture, 
    removeLog,
    addLog,
    addReminder, 
    isPremium, 
    user,
    canUsePhotoAnalysis,
    incrementPhotoAnalysis,
    photoAnalysisCount,
  } = useAppStore();
  
  const nurture = nurtures.find(n => n.id === nurtureId);
  const nurtureLogs = recentLogs.filter(log => log.nurture_id === nurtureId);
  
  // States
  const [insights, setInsights] = useState<{
    patterns: string[];
    suggestions: string[];
    concerns: string[];
    summary: string;
  } | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarUri, setEditAvatarUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // AI Features
  const [recommendations, setRecommendations] = useState<CareRecommendation[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [smartInsights, setSmartInsights] = useState<string[]>([]);
  const [voiceResponseEnabled, setVoiceResponseEnabled] = useState<boolean>(true); // TTS enabled by default
  
  // Photo Analysis
  const [showPhotoAnalysis, setShowPhotoAnalysis] = useState(false);
  const [photoAnalysisResult, setPhotoAnalysisResult] = useState<PhotoAnalysisResult | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [analysisPhoto, setAnalysisPhoto] = useState<string | null>(null);

  const colors = nurture ? getNurtureColors(nurture.type) : Colors.terracotta;

  useEffect(() => {
    if (nurture) {
      setEditName(nurture.name);
      setEditAvatarUri(nurture.avatar_url || null);
      loadRecommendations();
      loadSmartInsights();
    }
  }, [nurture?.id, nurtureLogs.length]);

  useEffect(() => {
    if (isPremium && nurture && nurtureLogs.length >= 3) {
      loadInsights();
    }
  }, [isPremium, nurtureLogs.length]);

  const loadRecommendations = async () => {
    if (!nurture) return;
    try {
      const recs = await getSmartRecommendations(nurture, nurtureLogs);
      setRecommendations(recs);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const loadSmartInsights = async () => {
    if (!nurture || nurtureLogs.length === 0) {
      setSmartInsights([]);
      return;
    }
    
    try {
      // Generate AI insights from recent logs
      const insights: string[] = [];
      const recentLogs = nurtureLogs.slice(0, 5);
      
      // Analyze feeding patterns
      const feedings = recentLogs.filter(log => 
        log.parsed_action?.toLowerCase().includes('feed') ||
        log.parsed_action?.toLowerCase().includes('food') ||
        log.parsed_action?.toLowerCase().includes('meal') ||
        log.parsed_action?.toLowerCase().includes('milk') ||
        log.parsed_action?.toLowerCase().includes('bottle')
      );
      
      if (feedings.length > 0) {
        const lastFeeding = feedings[0];
        const lastFeedingTime = new Date(lastFeeding.created_at);
        const hoursAgo = (Date.now() - lastFeedingTime.getTime()) / (1000 * 60 * 60);
        
        if (nurture.type === 'pet') {
          insights.push(`Today's ${feedings.length} meal completed. Next meal at ${new Date(lastFeedingTime.getTime() + 10 * 60 * 60 * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`);
        } else if (nurture.type === 'baby') {
          insights.push(`Feeding completed. Next meal at ${new Date(lastFeedingTime.getTime() + 3 * 60 * 60 * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`);
        }
      }
      
      // Analyze watering for plants
      if (nurture.type === 'plant') {
        const waterings = recentLogs.filter(log => 
          log.parsed_action?.toLowerCase().includes('water') ||
          log.raw_input?.toLowerCase().includes('water')
        );
        
        if (waterings.length > 0) {
          const lastWatering = waterings[0];
          const daysAgo = Math.floor((Date.now() - new Date(lastWatering.created_at).getTime()) / (1000 * 60 * 60 * 24));
          if (daysAgo === 0) {
            insights.push('Watered today. Soil is moist.');
          } else if (daysAgo < 3) {
            insights.push(`Watered ${daysAgo} days ago. Soil is still moist.`);
          } else {
            insights.push(`Watered ${daysAgo} days ago. Watering time is approaching.`);
          }
        }
      }
      
      // Analyze walks for pets
      if (nurture.type === 'pet') {
        const walks = recentLogs.filter(log => 
          log.parsed_action?.toLowerCase().includes('walk') ||
          log.parsed_action?.toLowerCase().includes('exercise')
        );
        
        if (walks.length > 0) {
          const lastWalk = walks[0];
          const hoursAgo = Math.floor((Date.now() - new Date(lastWalk.created_at).getTime()) / (1000 * 60 * 60));
          if (hoursAgo < 2) {
            insights.push('Just walked. Energetic and happy!');
          } else {
            insights.push(`Walked ${hoursAgo} hours ago.`);
          }
        }
      }
      
      setSmartInsights(insights);
    } catch (error) {
      console.error('Failed to load smart insights:', error);
      setSmartInsights([]);
    }
  };

  const loadInsights = async () => {
    if (!nurture) return;
    setIsLoadingInsights(true);
    try {
      const result = await generateInsights(nurture, nurtureLogs);
      setInsights(result);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete',
      `Delete ${nurture?.name}? All entries will also be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeNurture(nurtureId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleDeleteLog = (logId: string) => {
    Alert.alert(
      'Delete Entry',
      'Delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeLog(logId),
        },
      ]
    );
  };

  const handleEditAvatar = async () => {
    const image = await imageService.showImagePicker();
    if (image) {
      setEditAvatarUri(image.uri);
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name is required.');
      return;
    }

    setIsSaving(true);
    try {
      let avatarUrl = editAvatarUri;
      
      if (editAvatarUri && editAvatarUri !== nurture?.avatar_url && user) {
        const uploaded = await imageService.uploadImage(user.id, {
          uri: editAvatarUri,
          width: 0,
          height: 0,
        });
        if (uploaded) {
          avatarUrl = uploaded;
        }
      }

      await updateNurture(nurtureId, {
        name: editName.trim(),
        avatar_url: avatarUrl || undefined,
      });

      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to update:', error);
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  // Photo Analysis
  const handlePhotoAnalysis = async () => {
    // Check premium/limit
    if (!canUsePhotoAnalysis()) {
      Alert.alert(
        'Photo Analysis Limit',
        'You\'ve used all 3 free photo analyses. Upgrade to Premium for unlimited analyses!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Premium' as never) }
        ]
      );
      return;
    }

    const image = await imageService.showImagePicker();
    if (!image || !nurture) return;

    setAnalysisPhoto(image.uri);
    setShowPhotoAnalysis(true);
    setIsAnalyzingPhoto(true);
    setPhotoAnalysisResult(null);

    try {
      let base64 = image.base64;
      if (!base64) {
        base64 = await FileSystem.readAsStringAsync(image.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      const result = await analyzePhoto(base64, nurture);
      setPhotoAnalysisResult(result);
      
      // Increment usage count for non-premium users
      if (!isPremium) {
        incrementPhotoAnalysis();
      }
      
      // Speak photo analysis result if voice response is enabled
      if (voiceResponseEnabled && result.summary) {
        voiceService.stopSpeaking();
        setTimeout(() => {
          voiceService.speak(result.summary);
        }, 300);
      }
    } catch (error) {
      console.error('Photo analysis error:', error);
      Alert.alert('Error', 'Failed to analyze photo.');
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  // AI Chat (Inline)
  const handleSendChat = async () => {
    if (!chatInput.trim() || !nurture) return;

    const userMessage: ChatMsg = {
      id: generateId(),
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    const messageText = chatInput.trim();
    setChatInput('');
    setIsChatLoading(true);

    // Scroll to bottom
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await sendChatMessage(
        messageText,
        [nurture],
        nurtureLogs,
        chatMessages
      );

      const assistantMessage: ChatMsg = {
        id: generateId(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
        suggestedReminder: response.suggestedReminder,
      };

      setChatMessages(prev => [...prev, assistantMessage]);

      // Speak AI response if voice response is enabled
      if (voiceResponseEnabled && response.response) {
        // Stop any ongoing speech first
        voiceService.stopSpeaking();
        // Speak the AI response
        setTimeout(() => {
          voiceService.speak(response.response);
        }, 300); // Small delay to ensure smooth transition
      }

      // If AI suggests logging, do it automatically
      if (response.shouldLog && user) {
        const newLog: LogEntry = {
          id: generateId(),
          nurture_id: nurture.id,
          user_id: user.id,
          raw_input: messageText,
          parsed_action: response.shouldLog.action,
          parsed_subject: nurture.name,
          parsed_notes: response.shouldLog.notes,
          created_at: new Date().toISOString(),
        };
        await addLog(newLog);
      }

      // If AI suggests a reminder, show alert
      if (response.suggestedReminder) {
        const reminder: Reminder = {
          id: generateId(),
          user_id: user?.id || '',
          nurture_id: response.suggestedReminder.nurtureId,
          title: response.suggestedReminder.title,
          description: response.suggestedReminder.description,
          scheduled_at: response.suggestedReminder.scheduledAt,
          is_ai_generated: true,
          is_completed: false,
          created_at: new Date().toISOString(),
        };

        Alert.alert(
          '⏰ Reminder',
          response.suggestedReminder.description,
          [
            { text: 'No', style: 'cancel' },
            { 
              text: 'Yes!', 
              onPress: async () => {
                await addReminder(reminder);
              },
            },
          ]
        );
      }

      // Scroll to bottom after response
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMsg = {
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Would you like to try again? 😊',
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Handle recommendation action
  const handleRecommendationAction = async (rec: CareRecommendation) => {
    if (!rec.action || !nurture) return;

    if (rec.action.type === 'reminder') {
      const reminder: Reminder = {
        id: generateId(),
        user_id: user?.id || '',
        nurture_id: nurture.id,
        title: rec.action.data?.title || rec.title,
        description: rec.description,
        scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        is_ai_generated: true,
        is_completed: false,
        created_at: new Date().toISOString(),
      };

      await addReminder(reminder);
      await notificationService.scheduleReminderNotification(reminder);
      Alert.alert('✅ Reminder Added', 'Reminder set for tomorrow!');
    }
  };

  if (!nurture) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.notFoundText}>Not found</Text>
      </View>
    );
  }

  const iconName = nurture.type === 'baby' ? 'baby-face-outline' : 
                   nurture.type === 'pet' ? 'paw' : 'flower-tulip-outline';

  // Calculate age/days active
  const createdDate = new Date(nurture.created_at);
  const daysActive = Math.max(1, Math.ceil((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Get type-specific info
  const metadata = nurture.metadata as any;
  const plantInfo = nurture.type === 'plant' && metadata?.species 
    ? getPlantCareInfo(metadata.species) 
    : null;
  const petInfo = nurture.type === 'pet' && metadata?.species 
    ? getPetCareInfo(metadata.species) 
    : null;
  const babyAgeMonths = nurture.type === 'baby' && metadata?.birth_date
    ? Math.floor((Date.now() - new Date(metadata.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.charcoal} />
          </TouchableOpacity>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowEditModal(true)}
            >
              <MaterialCommunityIcons name="pencil-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDelete}
            >
              <MaterialCommunityIcons name="delete-outline" size={22} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={[styles.avatarContainer, { backgroundColor: `${colors.light}66` }]}
            onPress={() => setShowEditModal(true)}
          >
            {nurture.avatar_url ? (
              <Image source={{ uri: nurture.avatar_url }} style={styles.avatar} />
            ) : (
              <MaterialCommunityIcons name={iconName as any} size={48} color={colors.main} />
            )}
          </TouchableOpacity>
          
          <Text style={styles.nurtureName}>{nurture.name}</Text>
          <View style={[styles.typeBadge, { backgroundColor: colors.light }]}>
            <Text style={[styles.typeText, { color: colors.main }]}>
              {nurture.type === 'baby' ? '👶 Baby' : 
               nurture.type === 'pet' ? '🐾 Pet' : '🌱 Plant'}
            </Text>
          </View>
          
          {/* Type-specific subtitle */}
          {plantInfo && (
            <Text style={styles.subtypeText}>{plantInfo.name}</Text>
          )}
          {petInfo && metadata?.species && (
            <Text style={styles.subtypeText}>
              {metadata.species.charAt(0).toUpperCase() + metadata.species.slice(1)}
              {metadata.breed ? ` • ${metadata.breed}` : ''}
            </Text>
          )}
          {babyAgeMonths !== null && (
            <Text style={styles.subtypeText}>{babyAgeMonths} months old</Text>
          )}
        </View>


        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.main }]}>{nurtureLogs.length}</Text>
            <Text style={styles.statLabel}>Total Entries</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.main }]}>
              {nurtureLogs.filter(log => 
                log.created_at.startsWith(new Date().toISOString().split('T')[0])
              ).length}
            </Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.main }]}>{daysActive}</Text>
            <Text style={styles.statLabel}>Days</Text>
          </View>
        </View>

        {/* Plant-specific Care Card - Dynamic */}
        {plantInfo && (() => {
          const lastWatering = nurtureLogs.find(log => 
            log.parsed_action?.toLowerCase().includes('su') ||
            log.raw_input?.toLowerCase().includes('su')
          );
          const daysSinceWatering = lastWatering 
            ? Math.floor((Date.now() - new Date(lastWatering.created_at).getTime()) / (1000 * 60 * 60 * 24))
            : 999;
          const wateringProgress = Math.min(100, (daysSinceWatering / plantInfo.wateringDays) * 100);
          const needsWatering = daysSinceWatering >= plantInfo.wateringDays;
          
          return (
            <View style={[styles.careCard, { borderColor: colors.light }]}>
              <View style={styles.careCardHeader}>
                <MaterialCommunityIcons name="leaf" size={20} color={colors.main} />
                <Text style={styles.careCardTitle}>Care Guide</Text>
              </View>
              
              {/* Live Status Bars */}
              <View style={styles.statusBars}>
                <View style={styles.statusBarItem}>
                  <View style={styles.statusBarHeader}>
                    <MaterialCommunityIcons name="water" size={18} color={Colors.baby.main} />
                    <Text style={styles.statusBarLabel}>Watering</Text>
                    <Text style={[styles.statusBarTime, needsWatering && styles.statusBarTimeUrgent]}>
                      {lastWatering 
                        ? daysSinceWatering === 0 ? 'Today' : daysSinceWatering === 1 ? 'Yesterday' : `${daysSinceWatering} days ago`
                        : 'Not watered yet'}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { 
                          width: `${wateringProgress}%`,
                          backgroundColor: needsWatering ? Colors.error : Colors.plant.main,
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.statusBarHint}>
                    {needsWatering 
                      ? '⚠️ Time to water!' 
                      : `Next watering: in ${plantInfo.wateringDays - daysSinceWatering} days`}
                  </Text>
                </View>
              </View>

              <View style={styles.careStats}>
                <View style={styles.careStat}>
                  <MaterialCommunityIcons name="white-balance-sunny" size={24} color={Colors.yellow} />
                  <Text style={styles.careStatValue}>
                    {plantInfo.lightNeeds === 'high' ? 'High' : plantInfo.lightNeeds === 'medium' ? 'Medium' : 'Low'}
                  </Text>
                  <Text style={styles.careStatLabel}>Light</Text>
                </View>
                <View style={styles.careStat}>
                  <MaterialCommunityIcons name="water-percent" size={24} color={Colors.pet.main} />
                  <Text style={styles.careStatValue}>
                    {plantInfo.humidity === 'high' ? 'High' : plantInfo.humidity === 'medium' ? 'Medium' : 'Low'}
                  </Text>
                  <Text style={styles.careStatLabel}>Humidity</Text>
                </View>
              </View>

              <View style={styles.careTips}>
                <Text style={styles.careTipsTitle}>💡 Tips</Text>
                {plantInfo.tips.slice(0, 3).map((tip, index) => (
                  <Text key={index} style={styles.careTip}>• {tip}</Text>
                ))}
              </View>
            </View>
          );
        })()}

        {/* Pet-specific Care Card - Dynamic */}
        {petInfo && (() => {
          const lastFeeding = nurtureLogs.find(log => 
            log.parsed_action?.toLowerCase().includes('feed') ||
            log.parsed_action?.toLowerCase().includes('food') ||
            log.parsed_action?.toLowerCase().includes('meal') ||
            log.parsed_action?.toLowerCase().includes('milk') ||
            log.raw_input?.toLowerCase().includes('feed')
          );
          const hoursSinceFeeding = lastFeeding 
            ? (Date.now() - new Date(lastFeeding.created_at).getTime()) / (1000 * 60 * 60)
            : 999;
          const feedingInterval = 10; // 10 hours for pets
          const feedingProgress = Math.min(100, (hoursSinceFeeding / feedingInterval) * 100);
          const needsFeeding = hoursSinceFeeding >= feedingInterval;
          
          const lastWalk = nurtureLogs.find(log => 
            log.parsed_action?.toLowerCase().includes('walk') ||
            log.parsed_action?.toLowerCase().includes('exercise')
          );
          const hoursSinceWalk = lastWalk 
            ? (Date.now() - new Date(lastWalk.created_at).getTime()) / (1000 * 60 * 60)
            : 999;
          const needsWalk = hoursSinceWalk >= 8;
          
          return (
            <View style={[styles.careCard, { borderColor: colors.light }]}>
              <View style={styles.careCardHeader}>
                <MaterialCommunityIcons name="paw" size={20} color={colors.main} />
                <Text style={styles.careCardTitle}>Care Guide</Text>
              </View>
              
              {/* Live Status Bars */}
              <View style={styles.statusBars}>
                <View style={styles.statusBarItem}>
                  <View style={styles.statusBarHeader}>
                    <MaterialCommunityIcons name="food-drumstick" size={18} color={Colors.pet.main} />
                    <Text style={styles.statusBarLabel}>Feeding</Text>
                    <Text style={[styles.statusBarTime, needsFeeding && styles.statusBarTimeUrgent]}>
                      {lastFeeding 
                        ? hoursSinceFeeding < 1 ? 'Just now' : `${Math.floor(hoursSinceFeeding)} hours ago`
                        : 'Not fed yet'}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { 
                          width: `${feedingProgress}%`,
                          backgroundColor: needsFeeding ? Colors.error : Colors.pet.main,
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.statusBarHint}>
                    {needsFeeding 
                      ? '⚠️ Feeding time!' 
                      : `Next meal: in ${Math.floor(feedingInterval - hoursSinceFeeding)} hours`}
                  </Text>
                </View>
                
                {petInfo.walkMinutes && (
                  <View style={styles.statusBarItem}>
                    <View style={styles.statusBarHeader}>
                      <MaterialCommunityIcons name="walk" size={18} color={Colors.plant.main} />
                      <Text style={styles.statusBarLabel}>Walk</Text>
                      <Text style={[styles.statusBarTime, needsWalk && styles.statusBarTimeUrgent]}>
                        {lastWalk 
                          ? hoursSinceWalk < 1 ? 'Just now' : `${Math.floor(hoursSinceWalk)} hours ago`
                          : 'Not walked yet'}
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressBarFill, 
                          { 
                            width: `${Math.min(100, (hoursSinceWalk / 8) * 100)}%`,
                            backgroundColor: needsWalk ? Colors.warning : Colors.plant.main,
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.statusBarHint}>
                      {needsWalk 
                        ? '⚠️ Walk time!' 
                        : `Last walk: ${Math.floor(hoursSinceWalk)} hours ago`}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.careStats}>
                <View style={styles.careStat}>
                  <MaterialCommunityIcons name="medical-bag" size={24} color={Colors.error} />
                  <Text style={styles.careStatValue}>{petInfo.parasiteTreatmentDays}g</Text>
                  <Text style={styles.careStatLabel}>Parasite</Text>
                </View>
              </View>

              <View style={styles.careTips}>
                <Text style={styles.careTipsTitle}>💡 Tips</Text>
                {petInfo.tips.slice(0, 3).map((tip, index) => (
                  <Text key={index} style={styles.careTip}>• {tip}</Text>
                ))}
              </View>
            </View>
          );
        })()}

        {/* Baby Development Card */}
        {babyAgeMonths !== null && (
          <View style={[styles.careCard, { borderColor: colors.light }]}>
            <View style={styles.careCardHeader}>
              <MaterialCommunityIcons name="baby-face-outline" size={20} color={colors.main} />
              <Text style={styles.careCardTitle}>Month {babyAgeMonths} Development</Text>
            </View>
            
            <View style={styles.milestonesList}>
              {getBabyMilestones(babyAgeMonths).map((milestone, index) => (
                <View key={index} style={styles.milestoneItem}>
                  <MaterialCommunityIcons name="star-outline" size={16} color={Colors.yellow} />
                  <Text style={styles.milestoneText}>{milestone}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Smart Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🤖 AI Recommendations</Text>
            
            <View style={styles.recommendationsList}>
              {recommendations.map((rec, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.recommendationCard,
                    rec.priority === 'warning' && styles.recommendationWarning,
                    rec.priority === 'urgent' && styles.recommendationUrgent,
                  ]}
                  onPress={() => rec.action && handleRecommendationAction(rec)}
                  disabled={!rec.action}
                >
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>{rec.title}</Text>
                    <Text style={styles.recommendationDesc}>{rec.description}</Text>
                    {rec.action && (
                      <View style={styles.recommendationAction}>
                        <Text style={styles.recommendationActionText}>{rec.action.label} →</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* AI Insights (Premium) */}
        {isPremium && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✨ AI Analysis</Text>
            
            {isLoadingInsights ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.main} />
                <Text style={styles.loadingText}>Analyzing...</Text>
              </View>
            ) : insights && (insights.patterns.length > 0 || insights.suggestions.length > 0) ? (
              <View style={styles.insightsList}>
                {insights.patterns.map((pattern, index) => (
                  <View key={`p-${index}`} style={styles.insightCard}>
                    <View style={[styles.insightIcon, { backgroundColor: `${Colors.baby.main}20` }]}>
                      <MaterialCommunityIcons name="chart-line" size={18} color={Colors.baby.main} />
                    </View>
                    <Text style={styles.insightText}>{pattern}</Text>
                  </View>
                ))}
                
                {insights.suggestions.map((suggestion, index) => (
                  <View key={`s-${index}`} style={styles.insightCard}>
                    <View style={[styles.insightIcon, { backgroundColor: `${Colors.plant.main}20` }]}>
                      <MaterialCommunityIcons name="lightbulb-outline" size={18} color={Colors.plant.main} />
                    </View>
                    <Text style={styles.insightText}>{suggestion}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyInsights}>
                <Text style={styles.emptyInsightsText}>
                  {nurtureLogs.length < 3 
                    ? 'Add at least 3 entries to see AI analysis!'
                    : 'Keep adding entries!'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Chat Messages (Inline) */}
        {chatMessages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💬 Chat</Text>
            <View style={styles.chatMessagesContainer}>
              {chatMessages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.chatBubbleInline,
                    msg.role === 'user' ? styles.chatBubbleInlineUser : styles.chatBubbleInlineAssistant,
                  ]}
                >
                  <Text
                    style={[
                      styles.chatBubbleTextInline,
                      msg.role === 'user' && styles.chatBubbleTextInlineUser,
                    ]}
                  >
                    {msg.content}
                  </Text>
                </View>
              ))}
              {isChatLoading && (
                <View style={[styles.chatBubbleInline, styles.chatBubbleInlineAssistant]}>
                  <ActivityIndicator size="small" color={colors.main} />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Smart Insights - AI Processed Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Bloomie's Notes</Text>
          
          {smartInsights.length > 0 ? (
            <View style={styles.insightsCarousel}>
              {smartInsights.map((insight, index) => (
                <View key={index} style={styles.insightCard}>
                  <MaterialCommunityIcons name="lightbulb-outline" size={20} color={colors.main} />
                  <Text style={styles.insightText}>{insight}</Text>
                </View>
              ))}
            </View>
          ) : nurtureLogs.length > 0 ? (
            <View style={styles.insightsCarousel}>
              {/* Generate insights from recent logs */}
              {nurtureLogs.slice(0, 3).map((log, index) => {
                const logTime = new Date(log.created_at);
                const hoursAgo = (Date.now() - logTime.getTime()) / (1000 * 60 * 60);
                const action = log.parsed_action?.toLowerCase() || '';
                
                let insight = '';
                if (nurture?.type === 'pet' && (action.includes('feed') || action.includes('food') || action.includes('meal'))) {
                  const nextFeeding = new Date(logTime.getTime() + 10 * 60 * 60 * 1000);
                  insight = `Today's ${index + 1} meal completed. Next meal at ${nextFeeding.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`;
                } else if (nurture?.type === 'plant' && action.includes('water')) {
                  const daysAgo = Math.floor(hoursAgo / 24);
                  insight = daysAgo === 0 ? 'Watered today. Soil is moist.' : `Watered ${daysAgo} days ago. ${daysAgo < 3 ? 'Soil is still moist.' : 'Watering time is approaching.'}`;
                } else if (nurture?.type === 'baby' && (action.includes('feed') || action.includes('milk') || action.includes('bottle'))) {
                  const nextFeeding = new Date(logTime.getTime() + 3 * 60 * 60 * 1000);
                  insight = `Feeding completed. Next meal at ${nextFeeding.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`;
                } else {
                  insight = `${log.parsed_action || 'Activity'} logged.`;
                }
                
                return (
                  <View key={log.id} style={styles.insightCard}>
                    <MaterialCommunityIcons name="check-circle-outline" size={20} color={colors.main} />
                    <Text style={styles.insightText}>{insight}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyActivity}>
              <MaterialCommunityIcons name="notebook-outline" size={48} color={Colors.gray[300]} />
              <Text style={styles.emptyActivityText}>No entries yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed Message Bar at Bottom */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.fixedMessageBar}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={[styles.messageBarContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.messageBarIcon}
            onPress={handlePhotoAnalysis}
          >
            <MaterialCommunityIcons name="camera-outline" size={22} color={Colors.textSubtle} />
          </TouchableOpacity>
          
          <TextInput
            style={styles.messageBarInput}
            placeholder={`Tell me about ${nurture?.name || ''} or ask something...`}
            placeholderTextColor={Colors.textSubtle}
            value={chatInput}
            onChangeText={setChatInput}
            multiline
            maxLength={500}
          />
          
          <TouchableOpacity
            style={[styles.messageBarSend, !chatInput.trim() && styles.messageBarSendDisabled]}
            onPress={handleSendChat}
            disabled={!chatInput.trim() || isChatLoading}
          >
            {isChatLoading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <MaterialCommunityIcons name="send" size={20} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top + 16 }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.modalSave}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <TouchableOpacity
              style={[styles.editAvatarContainer, { borderColor: colors.main }]}
              onPress={handleEditAvatar}
            >
              {editAvatarUri ? (
                <Image source={{ uri: editAvatarUri }} style={styles.editAvatar} />
              ) : (
                <View style={[styles.editAvatarPlaceholder, { backgroundColor: `${colors.light}66` }]}>
                  <MaterialCommunityIcons name={iconName as any} size={40} color={colors.main} />
                </View>
              )}
              <View style={[styles.editAvatarBadge, { backgroundColor: colors.main }]}>
                <MaterialCommunityIcons name="camera" size={16} color={Colors.white} />
              </View>
            </TouchableOpacity>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Name</Text>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter name"
                autoCapitalize="words"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Photo Analysis Modal */}
      <Modal
        visible={showPhotoAnalysis}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={false}
        onRequestClose={() => setShowPhotoAnalysis(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top + 16, backgroundColor: Colors.gray[50] }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPhotoAnalysis(false)}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.charcoal} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>🔍 Photo Analysis</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={[styles.analysisContent, { backgroundColor: Colors.gray[50] }]}>
            {analysisPhoto && (
              <Image source={{ uri: analysisPhoto }} style={styles.analysisPhoto} />
            )}

            {isAnalyzingPhoto ? (
              <View style={styles.analysisLoading}>
                <ActivityIndicator size="large" color={colors.main} />
                <Text style={styles.analysisLoadingText}>AI is analyzing...</Text>
              </View>
            ) : photoAnalysisResult ? (
              <View style={styles.analysisResults}>
                <Text style={styles.analysisDescription}>
                  {photoAnalysisResult.description}
                </Text>

                {photoAnalysisResult.healthScore && (
                  <View style={styles.healthScore}>
                    <Text style={styles.healthScoreLabel}>Health Score</Text>
                    <Text style={[
                      styles.healthScoreValue,
                      { color: photoAnalysisResult.healthScore >= 7 ? Colors.plant.main : 
                               photoAnalysisResult.healthScore >= 4 ? Colors.warning : Colors.error }
                    ]}>
                      {photoAnalysisResult.healthScore}/10
                    </Text>
                  </View>
                )}

                {photoAnalysisResult.issues.length > 0 && (
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>⚠️ Issues Detected</Text>
                    {photoAnalysisResult.issues.map((issue, i) => (
                      <Text key={i} style={styles.analysisIssue}>• {issue}</Text>
                    ))}
                  </View>
                )}

                <View style={styles.analysisSection}>
                  <Text style={styles.analysisSectionTitle}>💡 Recommendations</Text>
                  {photoAnalysisResult.recommendations.map((rec, i) => (
                    <Text key={i} style={styles.analysisRec}>• {rec}</Text>
                  ))}
                </View>

                {photoAnalysisResult.suggestedActions.length > 0 && (
                  <View style={styles.analysisActions}>
                    {photoAnalysisResult.suggestedActions.map((action, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.analysisActionButton,
                          action.urgency === 'high' && styles.analysisActionUrgent,
                        ]}
                        onPress={async () => {
                          // Create reminder if time is specified
                          if (action.reminderTime && user) {
                            const reminder: Reminder = {
                              id: generateId(),
                              user_id: user.id,
                              nurture_id: nurture.id,
                              title: action.action,
                              description: photoAnalysisResult.recommendations[0] || '',
                              scheduled_at: new Date(Date.now() + (parseFloat(action.reminderTime) * 60 * 60 * 1000)).toISOString(),
                              is_ai_generated: true,
                              is_completed: false,
                              created_at: new Date().toISOString(),
                            };
                            await addReminder(reminder);
                            await notificationService.scheduleReminderNotification(reminder);
                            Alert.alert('✅ Reminder Added', `Reminder set for ${action.action}!`);
                          } else {
                            // Just show info
                            Alert.alert('💡 Suggestion', action.action);
                          }
                        }}
                      >
                        <Text style={styles.analysisActionText}>{action.action}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray[50] },
  centered: { alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: Colors.gray[500] },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  headerActions: { flexDirection: 'row', gap: 12 },
  actionButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  profileSection: { alignItems: 'center', marginBottom: 24 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 16, ...Shadows.soft, overflow: 'hidden' },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  nurtureName: { fontSize: 28, fontWeight: '800', color: Colors.charcoal, marginBottom: 8 },
  typeBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: BorderRadius.full },
  typeText: { fontSize: 12, fontWeight: '600' },
  subtypeText: { fontSize: 14, color: Colors.gray[500], marginTop: 4 },
  aiActions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  aiActionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: BorderRadius.xl, ...Shadows.sm },
  aiActionText: { fontSize: 14, fontWeight: '600' },
  statsContainer: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 20, marginBottom: 24, ...Shadows.soft },
  statCard: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.gray[100] },
  statValue: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 11, color: Colors.gray[500], textTransform: 'uppercase', letterSpacing: 0.5 },
  careCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 20, marginBottom: 24, borderWidth: 2, ...Shadows.sm },
  careCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  careCardTitle: { fontSize: 16, fontWeight: '700', color: Colors.charcoal },
  careStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  careStat: { alignItems: 'center' },
  careStatValue: { fontSize: 16, fontWeight: '700', color: Colors.charcoal, marginTop: 4 },
  careStatLabel: { fontSize: 11, color: Colors.gray[500], marginTop: 2 },
  careTips: { borderTopWidth: 1, borderTopColor: Colors.gray[100], paddingTop: 16 },
  careTipsTitle: { fontSize: 14, fontWeight: '600', color: Colors.charcoal, marginBottom: 8 },
  careTip: { fontSize: 13, color: Colors.gray[600], lineHeight: 20, marginBottom: 4 },
  milestonesList: { gap: 8 },
  milestoneItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  milestoneText: { fontSize: 14, color: Colors.charcoal },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.charcoal, marginBottom: 16 },
  recommendationsList: { gap: 12 },
  recommendationCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 16, ...Shadows.sm },
  recommendationWarning: { borderLeftWidth: 4, borderLeftColor: Colors.warning },
  recommendationUrgent: { borderLeftWidth: 4, borderLeftColor: Colors.error },
  recommendationContent: {},
  recommendationTitle: { fontSize: 15, fontWeight: '600', color: Colors.charcoal, marginBottom: 4 },
  recommendationDesc: { fontSize: 13, color: Colors.gray[600], lineHeight: 20 },
  recommendationAction: { marginTop: 8 },
  recommendationActionText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  loadingContainer: { paddingVertical: 32, alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.xl },
  loadingText: { fontSize: 14, color: Colors.gray[500], marginTop: 12 },
  insightsList: { gap: 12 },
  insightCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 16, gap: 12, ...Shadows.sm },
  insightIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  insightText: { flex: 1, fontSize: 14, color: Colors.charcoal, lineHeight: 20 },
  emptyInsights: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 24, alignItems: 'center' },
  emptyInsightsText: { fontSize: 14, color: Colors.gray[400], textAlign: 'center' },
  activityList: { gap: 12 },
  activityCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 16, ...Shadows.sm },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  activityAction: { fontSize: 14, fontWeight: '600', color: Colors.charcoal },
  activityTime: { fontSize: 12, color: Colors.gray[400] },
  activityNotes: { fontSize: 14, color: Colors.gray[600], lineHeight: 20 },
  activityPhoto: { height: 120, borderRadius: BorderRadius.lg, marginTop: 12 },
  emptyActivity: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 48, alignItems: 'center' },
  emptyActivityText: { fontSize: 16, fontWeight: '600', color: Colors.gray[500], marginTop: 16 },
  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: Colors.gray[50] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.gray[100] },
  modalCancel: { fontSize: 16, color: Colors.gray[500] },
  modalTitle: { fontSize: 17, fontWeight: '600', color: Colors.charcoal },
  modalSave: { fontSize: 16, fontWeight: '600', color: Colors.primary },
  modalContent: { padding: 24, alignItems: 'center' },
  editAvatarContainer: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, overflow: 'hidden', marginBottom: 24 },
  editAvatar: { width: '100%', height: '100%' },
  editAvatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  editAvatarBadge: { position: 'absolute', bottom: 4, right: 4, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.white },
  editField: { width: '100%', marginBottom: 20 },
  editLabel: { fontSize: 14, fontWeight: '600', color: Colors.gray[500], marginBottom: 8 },
  editInput: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 16, fontSize: 17, color: Colors.charcoal, ...Shadows.sm },
  // Analysis Styles
  analysisContent: { flex: 1, padding: 20 },
  analysisPhoto: { width: '100%', height: 200, borderRadius: BorderRadius.xl, marginBottom: 20 },
  analysisLoading: { alignItems: 'center', paddingVertical: 40 },
  analysisLoadingText: { fontSize: 16, color: Colors.gray[500], marginTop: 16 },
  analysisResults: { gap: 16 },
  analysisDescription: { fontSize: 18, fontWeight: '600', color: Colors.charcoal, textAlign: 'center' },
  healthScore: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 16, backgroundColor: Colors.white, borderRadius: BorderRadius.xl },
  healthScoreLabel: { fontSize: 14, color: Colors.gray[500] },
  healthScoreValue: { fontSize: 28, fontWeight: '800' },
  analysisSection: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 16 },
  analysisSectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.charcoal, marginBottom: 8 },
  analysisIssue: { fontSize: 14, color: Colors.error, marginBottom: 4 },
  analysisRec: { fontSize: 14, color: Colors.gray[600], marginBottom: 4 },
  analysisActions: { gap: 8 },
  analysisActionButton: { backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 20, borderRadius: BorderRadius.xl, alignItems: 'center' },
  analysisActionUrgent: { backgroundColor: Colors.error },
  analysisActionText: { color: Colors.white, fontWeight: '600', fontSize: 15 },
  // Chat Styles
  chatContainer: { flex: 1, backgroundColor: Colors.warmBg },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.gray[100], backgroundColor: Colors.white },
  chatHeaderCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chatHeaderTitle: { fontSize: 17, fontWeight: '600', color: Colors.charcoal },
  chatMessages: { flex: 1, padding: 20 },
  chatBubble: { maxWidth: '80%', padding: 14, borderRadius: 20, marginBottom: 12 },
  chatBubbleUser: { alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  chatBubbleAssistant: { alignSelf: 'flex-start', backgroundColor: Colors.white, borderBottomLeftRadius: 4, ...Shadows.sm },
  chatBubbleText: { fontSize: 15, lineHeight: 22, color: Colors.charcoal },
  chatBubbleTextUser: { color: Colors.white },
  chatInputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 12, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.gray[100], gap: 12 },
  chatInput: { flex: 1, backgroundColor: Colors.gray[50], borderRadius: 24, paddingHorizontal: 20, paddingVertical: 14, fontSize: 16, maxHeight: 100 },
  chatSendButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  chatSendButtonDisabled: { backgroundColor: Colors.gray[300] },
  // New Styles for AI-Centric Design
  insightsCarousel: { gap: 12 },
  insightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 16, ...Shadows.sm },
  insightText: { flex: 1, fontSize: 14, color: Colors.charcoal, lineHeight: 20, fontWeight: '500' },
  chatMessagesContainer: { gap: 12, marginBottom: 16 },
  chatBubbleInline: { maxWidth: '85%', padding: 14, borderRadius: 20, marginBottom: 4 },
  chatBubbleInlineUser: { alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  chatBubbleInlineAssistant: { alignSelf: 'flex-start', backgroundColor: Colors.white, borderBottomLeftRadius: 4, ...Shadows.sm },
  chatBubbleTextInline: { fontSize: 15, lineHeight: 22, color: Colors.charcoal },
  chatBubbleTextInlineUser: { color: Colors.white },
  fixedMessageBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255, 255, 255, 0.98)', borderTopWidth: 1, borderTopColor: Colors.gray[100], ...Shadows.md, backdropFilter: 'blur(10px)' },
  messageBarContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  messageBarIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.gray[100], alignItems: 'center', justifyContent: 'center' },
  messageBarInput: { flex: 1, backgroundColor: Colors.gray[50], borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: Colors.gray[200] },
  messageBarSend: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  messageBarSendDisabled: { backgroundColor: Colors.gray[300] },
  // Dynamic Status Bars
  statusBars: { gap: 16, marginBottom: 16 },
  statusBarItem: { gap: 8 },
  statusBarHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBarLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.charcoal },
  statusBarTime: { fontSize: 12, color: Colors.textSubtle },
  statusBarTimeUrgent: { color: Colors.error, fontWeight: '700' },
  progressBar: { height: 6, backgroundColor: Colors.gray[100], borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  statusBarHint: { fontSize: 11, color: Colors.textSubtle, fontStyle: 'italic' },
});
