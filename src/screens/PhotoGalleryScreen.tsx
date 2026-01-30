// Bloomie - Photo Gallery Screen
// Displays all photos from logs in a beautiful gallery view

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import type { RootStackParamList } from '../types';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - Spacing.xl * 2 - Spacing.md * 2) / 3;

type PhotoGalleryRouteProp = RouteProp<RootStackParamList, 'PhotoGallery'>;

interface PhotoItem {
  id: string;
  uri: string;
  logId: string;
  nurtureId: string;
  nurtureName: string;
  date: string;
  notes?: string;
}

export default function PhotoGalleryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<PhotoGalleryRouteProp>();
  const { nurtureId } = route.params || {};

  const { recentLogs, nurtures } = useAppStore();
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  // Extract all photos from logs
  const photos = useMemo(() => {
    const allPhotos: PhotoItem[] = [];
    
    recentLogs.forEach(log => {
      if (nurtureId && log.nurture_id !== nurtureId) return;
      
      if (log.photo_urls && log.photo_urls.length > 0) {
        const nurture = nurtures.find(n => n.id === log.nurture_id);
        log.photo_urls.forEach((photoUri, index) => {
          allPhotos.push({
            id: `${log.id}-${index}`,
            uri: photoUri,
            logId: log.id,
            nurtureId: log.nurture_id,
            nurtureName: nurture?.name || 'Unknown',
            date: log.created_at,
            notes: log.parsed_notes || log.raw_input,
          });
        });
      }
    });

    // Sort by date (newest first)
    return allPhotos.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [recentLogs, nurtures, nurtureId]);

  // Group photos by date
  const photosByDate = useMemo(() => {
    const grouped: { [key: string]: PhotoItem[] } = {};
    
    photos.forEach(photo => {
      const dateKey = format(new Date(photo.date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(photo);
    });

    return Object.entries(grouped).sort((a, b) => 
      new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  }, [photos]);

  if (photos.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={Colors.charcoal}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Photo Gallery</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="image-outline"
            size={64}
            color={Colors.gray[300]}
          />
          <Text style={styles.emptyTitle}>No Photos Yet</Text>
          <Text style={styles.emptyText}>
            Add photos to your care entries to see them here
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={Colors.charcoal}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Photo Gallery</Text>
        <Text style={styles.headerCount}>{photos.length}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {photosByDate.map(([dateKey, datePhotos]) => (
          <View key={dateKey} style={styles.dateSection}>
            <Text style={styles.dateTitle}>
              {format(new Date(dateKey), 'EEEE, MMMM d, yyyy')}
            </Text>
            <View style={styles.photosGrid}>
              {datePhotos.map(photo => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoItem}
                  onPress={() => setSelectedPhoto(photo)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                  <View style={styles.photoOverlay}>
                    <MaterialCommunityIcons
                      name="image"
                      size={16}
                      color={Colors.white}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Photo Detail Modal */}
      <Modal
        visible={selectedPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        {selectedPhoto && (
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSelectedPhoto(null)}
            >
              <MaterialCommunityIcons
                name="close"
                size={28}
                color={Colors.white}
              />
            </TouchableOpacity>
            
            <Image
              source={{ uri: selectedPhoto.uri }}
              style={styles.modalPhoto}
              resizeMode="contain"
            />
            
            <View style={styles.modalInfo}>
              <Text style={styles.modalNurture}>{selectedPhoto.nurtureName}</Text>
              <Text style={styles.modalDate}>
                {format(new Date(selectedPhoto.date), 'MMM d, yyyy • h:mm a')}
              </Text>
              {selectedPhoto.notes && (
                <Text style={styles.modalNotes}>{selectedPhoto.notes}</Text>
              )}
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  headerCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[500],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
  },
  dateSection: {
    marginBottom: 32,
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.charcoal,
    marginBottom: 12,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  photoItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.charcoal,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.gray[500],
    textAlign: 'center',
    lineHeight: 22,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPhoto: {
    width: width * 0.9,
    height: width * 0.9,
  },
  modalInfo: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: BorderRadius.xl,
    padding: 16,
  },
  modalNurture: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  modalDate: {
    fontSize: 14,
    color: Colors.gray[300],
    marginBottom: 8,
  },
  modalNotes: {
    fontSize: 15,
    color: Colors.white,
    lineHeight: 22,
  },
});
