// Bloomie - Media Service (Image Picker, Upload)

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Platform } from 'react-native';
import { supabase } from './supabase';

export interface ImageResult {
  uri: string;
  width: number;
  height: number;
  base64?: string;
  mimeType?: string;
}

/**
 * Request camera permissions
 */
export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Camera Permission Required',
      'Camera permission is needed to take photos.',
      [{ text: 'Tamam' }]
    );
    return false;
  }
  return true;
}

/**
 * Request media library permissions
 */
export async function requestMediaLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Gallery Permission Required',
      'Gallery permission is needed to select photos.',
      [{ text: 'Tamam' }]
    );
    return false;
  }
  return true;
}

/**
 * Pick image from camera
 */
export async function pickFromCamera(): Promise<ImageResult | null> {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return null;

  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      base64: asset.base64,
      mimeType: asset.mimeType || 'image/jpeg',
    };
  } catch (error) {
    console.error('Camera error:', error);
    return null;
  }
}

/**
 * Pick image from gallery
 */
export async function pickFromGallery(): Promise<ImageResult | null> {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) return null;

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      base64: asset.base64,
      mimeType: asset.mimeType || 'image/jpeg',
    };
  } catch (error) {
    console.error('Gallery error:', error);
    return null;
  }
}

/**
 * Show image picker with camera/gallery options
 */
export async function showImagePicker(): Promise<ImageResult | null> {
  return new Promise((resolve) => {
    Alert.alert(
      'Select Photo',
      'Where would you like to get the photo from?',
      [
        {
          text: '📷 Camera',
          onPress: async () => {
            const result = await pickFromCamera();
            resolve(result);
          },
        },
        {
          text: '🖼️ Gallery',
          onPress: async () => {
            const result = await pickFromGallery();
            resolve(result);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ]
    );
  });
}

/**
 * Upload image to Supabase Storage
 */
export async function uploadImage(
  userId: string,
  image: ImageResult,
  bucket: string = 'nurture-photos'
): Promise<string | null> {
  try {
    const fileName = `${userId}/${Date.now()}.jpg`;
    
    // Get file as blob
    let fileData: ArrayBuffer;
    
    if (image.base64) {
      // Convert base64 to ArrayBuffer
      const binaryString = atob(image.base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileData = bytes.buffer;
    } else {
      // Read file and convert to ArrayBuffer
      const base64 = await FileSystem.readAsStringAsync(image.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileData = bytes.buffer;
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileData, {
        contentType: image.mimeType || 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Upload image error:', error);
    return null;
  }
}

/**
 * Upload multiple images
 */
export async function uploadMultipleImages(
  userId: string,
  images: ImageResult[],
  bucket: string = 'nurture-photos'
): Promise<string[]> {
  const urls: string[] = [];
  
  for (const image of images) {
    const url = await uploadImage(userId, image, bucket);
    if (url) {
      urls.push(url);
    }
  }
  
  return urls;
}

/**
 * Delete image from storage
 */
export async function deleteImage(
  path: string,
  bucket: string = 'nurture-photos'
): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    return !error;
  } catch (error) {
    console.error('Delete image error:', error);
    return false;
  }
}

/**
 * Get image as base64 for AI analysis
 */
export async function getImageBase64(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64;
}

// Export as service object
export const imageService = {
  pickFromCamera,
  pickFromGallery,
  showImagePicker,
  uploadImage,
  uploadMultiple: uploadMultipleImages,
  deleteImage,
  getBase64: getImageBase64,
  requestCameraPermission,
  requestMediaLibraryPermission,
};

export default imageService;
