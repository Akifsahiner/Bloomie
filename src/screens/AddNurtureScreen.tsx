// Bloomie - Add Nurture Screen (with Smart Species Selection)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Colors, Spacing, BorderRadius, Shadows, getNurtureColors } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import { imageService } from '../services/media';
import { PLANT_CARE_DATABASE, PET_CARE_DATABASE } from '../services/ai-assistant';
import { FREE_LIMITS } from '../constants/config';
import { generateId } from '../utils/helpers';
import type { RootStackParamList, NurtureType, Nurture, BabyMetadata, PetMetadata, PlantMetadata } from '../types';

type AddNurtureRouteProp = RouteProp<RootStackParamList, 'AddNurture'>;

interface TypeOption {
  type: NurtureType;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  examples: string[];
}

const typeOptions: TypeOption[] = [
  { type: 'baby', icon: 'baby-face-outline', title: 'Baby', examples: ['Emma', 'Oliver', 'Lily'] },
  { type: 'pet', icon: 'paw', title: 'Pet', examples: ['Max', 'Bella', 'Charlie'] },
  { type: 'plant', icon: 'flower-tulip-outline', title: 'Plant', examples: ['Fern', 'Rose', 'Ivy'] },
];

// Plant species for quick selection
const PLANT_SPECIES = [
  { key: 'monstera', name: 'Monstera', emoji: '🌿' },
  { key: 'succulent', name: 'Succulent', emoji: '🪴' },
  { key: 'pothos', name: 'Pothos', emoji: '🌱' },
  { key: 'snake-plant', name: 'Snake Plant', emoji: '🌿' },
  { key: 'peace-lily', name: 'Peace Lily', emoji: '🌸' },
  { key: 'ficus', name: 'Ficus', emoji: '🌳' },
  { key: 'orchid', name: 'Orchid', emoji: '🌺' },
  { key: 'cactus', name: 'Cactus', emoji: '🌵' },
  { key: 'other', name: 'Other', emoji: '🌿' },
];

// Pet species for quick selection
const PET_SPECIES = [
  { key: 'dog', name: 'Dog', emoji: '🐕' },
  { key: 'cat', name: 'Cat', emoji: '🐈' },
  { key: 'bird', name: 'Bird', emoji: '🐦' },
  { key: 'fish', name: 'Fish', emoji: '🐠' },
  { key: 'rabbit', name: 'Rabbit', emoji: '🐰' },
  { key: 'hamster', name: 'Hamster', emoji: '🐹' },
  { key: 'turtle', name: 'Turtle', emoji: '🐢' },
  { key: 'other', name: 'Other', emoji: '🐾' },
];

export default function AddNurtureScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<AddNurtureRouteProp>();
  
  const { user, nurtures, addNurture, isPremium } = useAppStore();
  
  const [selectedType, setSelectedType] = useState<NurtureType>(route.params?.type || 'plant');
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Metadata fields
  const [selectedSpecies, setSelectedSpecies] = useState<string>('');
  const [customSpecies, setCustomSpecies] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<string>('');
  const [breed, setBreed] = useState('');
  const [plantLocation, setPlantLocation] = useState<'indoor' | 'outdoor' | 'balcony'>('indoor');

  const currentTypeOption = typeOptions.find(t => t.type === selectedType)!;
  const colors = getNurtureColors(selectedType);

  // Get species info for display
  const getSpeciesInfo = () => {
    if (selectedType === 'plant' && selectedSpecies) {
      return PLANT_CARE_DATABASE[selectedSpecies];
    }
    return null;
  };

  const speciesInfo = getSpeciesInfo();

  const handleAvatarPress = async () => {
    const image = await imageService.showImagePicker();
    if (image) {
      setAvatarUri(image.uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter a name.');
      return;
    }

    if (!isPremium && nurtures.length >= FREE_LIMITS.maxNurtures) {
      Alert.alert(
        'Limit Reached',
        `Free accounts can have maximum ${FREE_LIMITS.maxNurtures} items. Upgrade to Premium!`,
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Premium', onPress: () => navigation.navigate('Premium' as never) },
        ]
      );
      return;
    }

    setIsLoading(true);
    try {
      let metadata: BabyMetadata | PetMetadata | PlantMetadata = {};
      
      if (selectedType === 'baby') {
        metadata = {
          birth_date: birthDate?.toISOString(),
          gender: gender as any,
        };
      } else if (selectedType === 'pet') {
        metadata = {
          species: selectedSpecies || customSpecies,
          breed,
          birth_date: birthDate?.toISOString(),
          gender: gender as any,
        };
      } else if (selectedType === 'plant') {
        const species = selectedSpecies === 'other' ? customSpecies : selectedSpecies;
        metadata = {
          species,
          location: plantLocation,
          water_frequency: speciesInfo?.wateringDays,
          light_needs: speciesInfo?.lightNeeds,
        };
      }

      let avatarUrl: string | undefined;
      if (avatarUri && user) {
        avatarUrl = await imageService.uploadImage(user.id, {
          uri: avatarUri,
          width: 0,
          height: 0,
        }) || undefined;
      }

      const newNurture: Nurture = {
        id: generateId(),
        user_id: user?.id || '',
        name: name.trim(),
        type: selectedType,
        avatar_url: avatarUrl || avatarUri || undefined,
        metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const saved = await addNurture(newNurture);
      
      if (saved) {
        // Show care tips for plants
        if (selectedType === 'plant' && speciesInfo) {
          Alert.alert(
            `🌱 ${speciesInfo.name} Added!`,
            `Care tip: Water every ${speciesInfo.wateringDays} days, needs ${
              speciesInfo.lightNeeds === 'high' ? 'bright light' : 
              speciesInfo.lightNeeds === 'medium' ? 'indirect light' : 'low light'
            }.`,
            [{ text: 'Great!', onPress: () => navigation.goBack() }]
          );
        } else {
          navigation.goBack();
        }
      } else {
        Alert.alert('Error', 'Failed to save. Please try again.');
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSpeciesSelector = () => {
    if (selectedType === 'plant') {
      return (
        <View style={styles.speciesSection}>
          <Text style={styles.sectionLabel}>🌿 Select Plant Species</Text>
          <Text style={styles.sectionHint}>You'll get automatic care suggestions based on species!</Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.speciesScroll}
          >
            {PLANT_SPECIES.map((species) => (
              <TouchableOpacity
                key={species.key}
                style={[
                  styles.speciesCard,
                  selectedSpecies === species.key && { 
                    borderColor: colors.main,
                    backgroundColor: `${colors.light}66`,
                  },
                ]}
                onPress={() => setSelectedSpecies(species.key)}
              >
                <Text style={styles.speciesEmoji}>{species.emoji}</Text>
                <Text style={[
                  styles.speciesName,
                  selectedSpecies === species.key && { color: colors.main, fontWeight: '700' },
                ]}>
                  {species.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedSpecies === 'other' && (
            <TextInput
              style={styles.customInput}
              placeholder="Enter plant species..."
              placeholderTextColor={Colors.gray[400]}
              value={customSpecies}
              onChangeText={setCustomSpecies}
            />
          )}

          {/* Show care preview */}
          {speciesInfo && (
            <View style={[styles.carePreview, { borderColor: colors.light }]}>
              <Text style={styles.carePreviewTitle}>📋 Care Summary</Text>
              <View style={styles.carePreviewStats}>
                <View style={styles.carePreviewStat}>
                  <MaterialCommunityIcons name="water" size={20} color={Colors.baby.main} />
                  <Text style={styles.carePreviewValue}>Every {speciesInfo.wateringDays} days</Text>
                </View>
                <View style={styles.carePreviewStat}>
                  <MaterialCommunityIcons name="white-balance-sunny" size={20} color={Colors.yellow} />
                  <Text style={styles.carePreviewValue}>
                    {speciesInfo.lightNeeds === 'high' ? 'Bright' : speciesInfo.lightNeeds === 'medium' ? 'Medium' : 'Low'} light
                  </Text>
                </View>
                <View style={styles.carePreviewStat}>
                  <MaterialCommunityIcons name="water-percent" size={20} color={Colors.pet.main} />
                  <Text style={styles.carePreviewValue}>
                    {speciesInfo.humidity === 'high' ? 'High' : speciesInfo.humidity === 'medium' ? 'Medium' : 'Low'} humidity
                  </Text>
                </View>
              </View>
              <Text style={styles.carePreviewTip}>💡 {speciesInfo.tips[0]}</Text>
            </View>
          )}

          {/* Location Selection */}
          <View style={styles.locationSection}>
            <Text style={styles.miniLabel}>📍 Location</Text>
            <View style={styles.locationButtons}>
              {[
                { key: 'indoor', label: '🏠 Indoor', value: 'indoor' as const },
                { key: 'outdoor', label: '🌳 Outdoor', value: 'outdoor' as const },
                { key: 'balcony', label: '🌇 Balcony', value: 'balcony' as const },
              ].map((loc) => (
                <TouchableOpacity
                  key={loc.key}
                  style={[
                    styles.locationButton,
                    plantLocation === loc.value && { backgroundColor: colors.main },
                  ]}
                  onPress={() => setPlantLocation(loc.value)}
                >
                  <Text style={[
                    styles.locationButtonText,
                    plantLocation === loc.value && { color: Colors.white },
                  ]}>
                    {loc.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      );
    }

    if (selectedType === 'pet') {
      return (
        <View style={styles.speciesSection}>
          <Text style={styles.sectionLabel}>🐾 Select Pet Type</Text>
          
          <View style={styles.petGrid}>
            {PET_SPECIES.map((species) => (
              <TouchableOpacity
                key={species.key}
                style={[
                  styles.petCard,
                  selectedSpecies === species.key && { 
                    borderColor: colors.main,
                    backgroundColor: `${colors.light}66`,
                  },
                ]}
                onPress={() => setSelectedSpecies(species.key)}
              >
                <Text style={styles.petEmoji}>{species.emoji}</Text>
                <Text style={[
                  styles.petName,
                  selectedSpecies === species.key && { color: colors.main, fontWeight: '700' },
                ]}>
                  {species.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedSpecies && selectedSpecies !== 'other' && (
            <TextInput
              style={styles.customInput}
              placeholder="Breed (optional)"
              placeholderTextColor={Colors.gray[400]}
              value={breed}
              onChangeText={setBreed}
            />
          )}
        </View>
      );
    }

    if (selectedType === 'baby') {
      return (
        <View style={styles.speciesSection}>
          <Text style={styles.sectionLabel}>👶 Baby Information</Text>
          
          {/* Birth Date */}
          <View style={styles.babyField}>
            <Text style={styles.miniLabel}>🎂 Birth Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <MaterialCommunityIcons name="calendar" size={20} color={Colors.primary} />
              <Text style={styles.dateText}>
                {birthDate ? birthDate.toLocaleDateString('en-US') : 'Select date'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Gender */}
          <View style={styles.babyField}>
            <Text style={styles.miniLabel}>👦👧 Gender</Text>
            <View style={styles.genderButtons}>
              {[
                { key: 'male', label: '👦 Boy' },
                { key: 'female', label: '👧 Girl' },
              ].map((g) => (
                <TouchableOpacity
                  key={g.key}
                  style={[
                    styles.genderButton,
                    gender === g.key && { backgroundColor: colors.main },
                  ]}
                  onPress={() => setGender(g.key)}
                >
                  <Text style={[
                    styles.genderText,
                    gender === g.key && { color: Colors.white },
                  ]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Age display if birth date selected */}
          {birthDate && (
            <View style={styles.ageDisplay}>
              <Text style={styles.ageText}>
                🎈 {Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30))} months old
              </Text>
            </View>
          )}
        </View>
      );
    }

    return null;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="close" size={24} color={Colors.charcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New</Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Selection */}
          <TouchableOpacity
            style={[styles.avatarContainer, { borderColor: colors.main }]}
            onPress={handleAvatarPress}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: `${colors.light}66` }]}>
                <MaterialCommunityIcons name={currentTypeOption.icon} size={40} color={colors.main} />
              </View>
            )}
            <View style={[styles.avatarEditBadge, { backgroundColor: colors.main }]}>
              <MaterialCommunityIcons name="camera" size={16} color={Colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Add photo</Text>

          {/* Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>What would you like to track?</Text>
            <View style={styles.typeGrid}>
              {typeOptions.map((option) => {
                const optionColors = getNurtureColors(option.type);
                const isSelected = selectedType === option.type;
                
                return (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.typeCard,
                      isSelected && { 
                        backgroundColor: `${optionColors.light}66`,
                        borderColor: optionColors.main,
                      },
                    ]}
                    onPress={() => {
                      setSelectedType(option.type);
                      setSelectedSpecies('');
                    }}
                  >
                    <View style={[
                      styles.typeIcon,
                      { backgroundColor: isSelected ? optionColors.main : Colors.gray[100] },
                    ]}>
                      <MaterialCommunityIcons
                        name={option.icon}
                        size={24}
                        color={isSelected ? Colors.white : Colors.gray[500]}
                      />
                    </View>
                    <Text style={[styles.typeTitle, isSelected && { color: optionColors.main }]}>
                      {option.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Name Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>What's the name?</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.nameInput}
                placeholder={`e.g. ${currentTypeOption.examples.join(', ')}`}
                placeholderTextColor={Colors.gray[400]}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Species/Type Specific Selector */}
          {renderSpeciesSelector()}
        </ScrollView>

        {/* Save Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isLoading || !name.trim()}
          >
            <LinearGradient
              colors={name.trim() ? [colors.main, colors.dark || colors.main] : [Colors.gray[300], Colors.gray[400]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.saveGradient}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <MaterialCommunityIcons name="plus" size={20} color={Colors.white} />
                  <Text style={styles.saveText}>Add</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={birthDate || new Date()}
            mode="date"
            display="spinner"
            maximumDate={new Date()}
            onChange={(event, date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) setBirthDate(date);
            }}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray[50] },
  content: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.gray[100] },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.charcoal },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: 24, paddingBottom: 24 },
  avatarContainer: { alignSelf: 'center', width: 100, height: 100, borderRadius: 50, borderWidth: 3, overflow: 'hidden', marginBottom: 8 },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarEditBadge: { position: 'absolute', bottom: 4, right: 4, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.white },
  avatarHint: { textAlign: 'center', fontSize: 12, color: Colors.textSubtle, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: Colors.charcoal, marginBottom: 12 },
  sectionHint: { fontSize: 13, color: Colors.gray[500], marginBottom: 12, marginTop: -8 },
  typeGrid: { flexDirection: 'row', gap: 12 },
  typeCard: { flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', ...Shadows.sm },
  typeIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  typeTitle: { fontSize: 13, fontWeight: '600', color: Colors.charcoal },
  inputContainer: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, ...Shadows.sm },
  nameInput: { fontSize: 18, fontWeight: '500', color: Colors.charcoal, paddingHorizontal: 20, paddingVertical: 18 },
  // Species Section
  speciesSection: { marginBottom: 24 },
  speciesScroll: { gap: 12, paddingVertical: 4 },
  speciesCard: { padding: 16, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', minWidth: 100, ...Shadows.sm },
  speciesEmoji: { fontSize: 28, marginBottom: 8 },
  speciesName: { fontSize: 12, color: Colors.charcoal, textAlign: 'center' },
  customInput: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, paddingHorizontal: 20, paddingVertical: 16, fontSize: 16, color: Colors.charcoal, marginTop: 12, ...Shadows.sm },
  // Care Preview
  carePreview: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 16, marginTop: 16, borderWidth: 2, ...Shadows.sm },
  carePreviewTitle: { fontSize: 14, fontWeight: '700', color: Colors.charcoal, marginBottom: 12 },
  carePreviewStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  carePreviewStat: { alignItems: 'center', gap: 4 },
  carePreviewValue: { fontSize: 12, color: Colors.gray[600], fontWeight: '500' },
  carePreviewTip: { fontSize: 13, color: Colors.gray[600], fontStyle: 'italic' },
  // Location
  locationSection: { marginTop: 16 },
  miniLabel: { fontSize: 13, fontWeight: '600', color: Colors.gray[500], marginBottom: 8 },
  locationButtons: { flexDirection: 'row', gap: 8 },
  locationButton: { flex: 1, paddingVertical: 12, backgroundColor: Colors.gray[100], borderRadius: BorderRadius.lg, alignItems: 'center' },
  locationButtonText: { fontSize: 12, fontWeight: '600', color: Colors.charcoal },
  // Pet
  petGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  petCard: { width: '22%', padding: 12, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', ...Shadows.sm },
  petEmoji: { fontSize: 24, marginBottom: 4 },
  petName: { fontSize: 10, color: Colors.charcoal, textAlign: 'center' },
  // Baby
  babyField: { marginBottom: 16 },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, ...Shadows.sm },
  dateText: { fontSize: 16, color: Colors.charcoal },
  genderButtons: { flexDirection: 'row', gap: 12 },
  genderButton: { flex: 1, paddingVertical: 14, backgroundColor: Colors.gray[100], borderRadius: BorderRadius.xl, alignItems: 'center' },
  genderText: { fontSize: 14, fontWeight: '600', color: Colors.charcoal },
  ageDisplay: { backgroundColor: Colors.baby.bg, borderRadius: BorderRadius.xl, padding: 16, alignItems: 'center' },
  ageText: { fontSize: 18, fontWeight: '700', color: Colors.baby.main },
  // Footer
  footer: { paddingHorizontal: Spacing.xl, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.gray[100], backgroundColor: Colors.gray[50] },
  saveButton: { borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadows.md },
  saveGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18 },
  saveText: { fontSize: 16, fontWeight: '600', color: Colors.white },
});
