// Bloomie - Photo Health Analysis Screen
// AI-powered plant and pet health diagnosis from photos

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import { analyzePhoto } from '../services/ai-assistant';
import type { Nurture, RootStackParamList } from '../types';

const { width, height } = Dimensions.get('window');

interface AnalysisResult {
  healthScore: number;
  condition: string;
  issues: string[];
  recommendations: string[];
  urgency: 'low' | 'medium' | 'high';
}

type PhotoAnalysisRouteProp = RouteProp<RootStackParamList, 'PhotoAnalysis'>;

export default function PhotoAnalysisScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<PhotoAnalysisRouteProp>();
  
  const { nurtures, isPremium, photoAnalysisCount } = useAppStore();
  
  const [selectedNurture, setSelectedNurture] = useState<Nurture | null>(
    route.params?.nurtureId 
      ? nurtures.find(n => n.id === route.params.nurtureId) || null 
      : nurtures[0] || null
  );
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const startPulseAnimation = () => {
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
  };

  const pickImage = async (fromCamera: boolean) => {
    const permissionResult = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please grant camera/photo access to use this feature.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setResult(null);
    }
  };

  const analyzeImage = async () => {
    if (!imageUri || !selectedNurture) {
      Alert.alert('Select Photo', 'Please take or select a photo first.');
      return;
    }

    // Check limits for free users
    if (!isPremium && photoAnalysisCount >= 3) {
      Alert.alert(
        'Limit Reached',
        'Free users can analyze 3 photos per day. Upgrade to Premium for unlimited analysis!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Premium' as never) },
        ]
      );
      return;
    }

    setIsAnalyzing(true);
    startPulseAnimation();

    try {
      const analysis = await analyzePhoto(imageUri, selectedNurture.type, {
        name: selectedNurture.name,
        ...selectedNurture.metadata,
      });

      // Parse the analysis result
      const parsedResult: AnalysisResult = {
        healthScore: analysis.healthScore || 4,
        condition: analysis.condition || 'Good overall condition',
        issues: analysis.issues || [],
        recommendations: analysis.recommendations || ['Continue with regular care'],
        urgency: analysis.urgency || 'low',
      };

      setResult(parsedResult);
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Analysis Failed', 'Could not analyze the photo. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 4) return Colors.plant.main;
    if (score >= 3) return Colors.terracotta[400];
    return '#E53935';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return '#E53935';
      case 'medium': return Colors.terracotta[500];
      default: return Colors.plant.main;
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'high': return '⚠️ Needs Immediate Attention';
      case 'medium': return '⏰ Monitor Closely';
      default: return '✅ Looking Good';
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E8F5E9', '#F1F8E9', '#FAFAFA']}
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
        <Text style={styles.headerTitle}>Health Check 📸</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Nurture Selector */}
        <Text style={styles.sectionLabel}>Select who to analyze:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.nurtureSelector}
        >
          {nurtures.map(nurture => (
            <TouchableOpacity
              key={nurture.id}
              style={[
                styles.nurtureChip,
                selectedNurture?.id === nurture.id && styles.nurtureChipActive,
              ]}
              onPress={() => setSelectedNurture(nurture)}
            >
              <MaterialCommunityIcons
                name={nurture.type === 'pet' ? 'paw' : nurture.type === 'plant' ? 'leaf' : 'baby-face-outline'}
                size={16}
                color={selectedNurture?.id === nurture.id ? Colors.white : Colors.charcoal}
              />
              <Text style={[
                styles.nurtureChipText,
                selectedNurture?.id === nurture.id && styles.nurtureChipTextActive,
              ]}>
                {nurture.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Photo Area */}
        <View style={styles.photoSection}>
          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.image} />
              <TouchableOpacity
                style={styles.changePhotoButton}
                onPress={() => setImageUri(null)}
              >
                <MaterialCommunityIcons name="refresh" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <MaterialCommunityIcons 
                name="camera-plus" 
                size={64} 
                color={Colors.gray[300]} 
              />
              <Text style={styles.photoPlaceholderText}>
                Take or select a photo
              </Text>
              <Text style={styles.photoPlaceholderSubtext}>
                {selectedNurture?.type === 'plant' 
                  ? 'Capture leaves, stems, or soil for analysis'
                  : selectedNurture?.type === 'pet'
                  ? 'Capture fur, skin, eyes, or posture'
                  : 'Capture skin, behavior, or symptoms'}
              </Text>
            </View>
          )}
        </View>

        {/* Camera Buttons */}
        {!imageUri && (
          <View style={styles.cameraButtons}>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => pickImage(true)}
            >
              <LinearGradient
                colors={[Colors.plant.main, Colors.plant.dark || Colors.plant.main]}
                style={styles.cameraButtonGradient}
              >
                <MaterialCommunityIcons name="camera" size={28} color={Colors.white} />
                <Text style={styles.cameraButtonText}>Take Photo</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => pickImage(false)}
            >
              <View style={styles.galleryButton}>
                <MaterialCommunityIcons name="image" size={28} color={Colors.plant.main} />
                <Text style={styles.galleryButtonText}>Gallery</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Analyze Button */}
        {imageUri && !result && (
          <TouchableOpacity
            style={styles.analyzeButton}
            onPress={analyzeImage}
            disabled={isAnalyzing}
          >
            <LinearGradient
              colors={[Colors.plant.main, Colors.terracotta[400]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.analyzeButtonGradient}
            >
              {isAnalyzing ? (
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <ActivityIndicator color={Colors.white} size="small" />
                </Animated.View>
              ) : (
                <MaterialCommunityIcons name="magnify" size={24} color={Colors.white} />
              )}
              <Text style={styles.analyzeButtonText}>
                {isAnalyzing ? 'Analyzing...' : 'Analyze Health'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Analysis Result */}
        {result && (
          <View style={styles.resultContainer}>
            {/* Health Score */}
            <View style={styles.healthScoreCard}>
              <View style={[styles.healthScoreCircle, { borderColor: getHealthColor(result.healthScore) }]}>
                <Text style={[styles.healthScoreNumber, { color: getHealthColor(result.healthScore) }]}>
                  {result.healthScore}
                </Text>
                <Text style={styles.healthScoreMax}>/5</Text>
              </View>
              <View style={styles.healthScoreInfo}>
                <Text style={styles.conditionText}>{result.condition}</Text>
                <Text style={[styles.urgencyText, { color: getUrgencyColor(result.urgency) }]}>
                  {getUrgencyText(result.urgency)}
                </Text>
              </View>
            </View>

            {/* Issues */}
            {result.issues.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>🔍 Detected Issues</Text>
                {result.issues.map((issue, index) => (
                  <View key={index} style={styles.issueRow}>
                    <View style={styles.issueDot} />
                    <Text style={styles.issueText}>{issue}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recommendations */}
            <View style={styles.resultSection}>
              <Text style={styles.resultSectionTitle}>💡 Recommendations</Text>
              {result.recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendationRow}>
                  <Text style={styles.recommendationNumber}>{index + 1}</Text>
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setImageUri(null);
                  setResult(null);
                }}
              >
                <MaterialCommunityIcons name="camera-plus" size={20} color={Colors.plant.main} />
                <Text style={styles.actionButtonText}>New Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonPrimary]}
                onPress={() => navigation.navigate('Chat' as never, { initialMessage: `I just analyzed ${selectedNurture?.name} and found: ${result.condition}. What should I do?` } as never)}
              >
                <MaterialCommunityIcons name="chat" size={20} color={Colors.white} />
                <Text style={styles.actionButtonTextPrimary}>Ask Bloomie</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tips */}
        {!result && (
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>📷 Photo Tips</Text>
            <Text style={styles.tipItem}>• Use good lighting (natural light works best)</Text>
            <Text style={styles.tipItem}>• Get close enough to see details</Text>
            <Text style={styles.tipItem}>• Keep the camera steady</Text>
            <Text style={styles.tipItem}>• Capture the problem area clearly</Text>
          </View>
        )}
      </ScrollView>
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[600],
    marginBottom: 12,
  },
  nurtureSelector: {
    marginBottom: 20,
  },
  nurtureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    marginRight: 10,
    gap: 6,
    ...Shadows.sm,
  },
  nurtureChipActive: {
    backgroundColor: Colors.plant.main,
  },
  nurtureChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.charcoal,
  },
  nurtureChipTextActive: {
    color: Colors.white,
  },
  photoSection: {
    marginBottom: 20,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: width * 0.75,
    borderRadius: BorderRadius.xl,
  },
  changePhotoButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholder: {
    height: width * 0.6,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.gray[200],
  },
  photoPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[400],
    marginTop: 16,
  },
  photoPlaceholderSubtext: {
    fontSize: 13,
    color: Colors.gray[400],
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  cameraButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  cameraButton: {
    flex: 1,
  },
  cameraButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    gap: 8,
  },
  cameraButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    gap: 8,
    borderWidth: 2,
    borderColor: Colors.plant.main,
  },
  galleryButtonText: {
    color: Colors.plant.main,
    fontSize: 16,
    fontWeight: '600',
  },
  analyzeButton: {
    marginBottom: 20,
  },
  analyzeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: BorderRadius.lg,
    gap: 10,
  },
  analyzeButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  resultContainer: {
    marginTop: 8,
  },
  healthScoreCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    ...Shadows.md,
  },
  healthScoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  healthScoreNumber: {
    fontSize: 32,
    fontWeight: '800',
  },
  healthScoreMax: {
    fontSize: 16,
    color: Colors.gray[400],
    marginTop: 8,
  },
  healthScoreInfo: {
    flex: 1,
    marginLeft: 20,
  },
  conditionText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.charcoal,
  },
  urgencyText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  resultSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    marginBottom: 16,
    ...Shadows.sm,
  },
  resultSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.charcoal,
    marginBottom: 12,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  issueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.terracotta[500],
    marginTop: 6,
    marginRight: 10,
  },
  issueText: {
    flex: 1,
    fontSize: 14,
    color: Colors.charcoal,
    lineHeight: 20,
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  recommendationNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.plant.light,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.plant.main,
    marginRight: 10,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: Colors.charcoal,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    gap: 8,
    borderWidth: 2,
    borderColor: Colors.plant.main,
  },
  actionButtonPrimary: {
    backgroundColor: Colors.plant.main,
    borderColor: Colors.plant.main,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.plant.main,
  },
  actionButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  tipsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    ...Shadows.sm,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.charcoal,
    marginBottom: 12,
  },
  tipItem: {
    fontSize: 14,
    color: Colors.gray[600],
    lineHeight: 24,
  },
});
