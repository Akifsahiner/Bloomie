// Bloomie - Type Definitions

export type NurtureType = 'baby' | 'pet' | 'plant';

export interface Nurture {
  id: string;
  user_id: string;
  name: string;
  type: NurtureType;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  metadata?: BabyMetadata | PetMetadata | PlantMetadata;
}

export interface BabyMetadata {
  birth_date?: string;
  gender?: 'male' | 'female' | 'other';
  weight_at_birth?: number;
  height_at_birth?: number;
}

export interface PetMetadata {
  species?: string; // dog, cat, bird, etc.
  breed?: string;
  birth_date?: string;
  weight?: number;
  gender?: 'male' | 'female';
}

export interface PlantMetadata {
  species?: string;
  location?: string; // indoor, outdoor, balcony
  light_needs?: 'low' | 'medium' | 'high';
  water_frequency?: number; // days between watering
}

export interface LogEntry {
  id: string;
  nurture_id: string;
  user_id: string;
  raw_input: string;
  parsed_action: string;
  parsed_subject: string;
  parsed_amount?: string;
  parsed_duration?: string;
  parsed_notes?: string;
  mood?: 'happy' | 'neutral' | 'sad' | 'tired' | 'energetic';
  health_score?: number; // 1-5 health rating
  photo_urls?: string[];
  created_at: string;
  ai_insights?: string;
}

export interface HealthRecord {
  id: string;
  nurture_id: string;
  user_id: string;
  date: string;
  health_score: number; // 1-5
  mood: 'happy' | 'neutral' | 'sad' | 'tired' | 'energetic';
  symptoms?: string[];
  notes?: string;
  created_at: string;
}

export interface WeeklyCareReport {
  weekStart: string;
  weekEnd: string;
  totalActivities: number;
  activitiesByType: Record<string, number>;
  nurtureSummaries: {
    nurtureId: string;
    nurtureName: string;
    nurtureType: NurtureType;
    activityCount: number;
    avgHealthScore?: number;
    topActivities: string[];
  }[];
  insights: string[];
  encouragement: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  nurture_id: string;
  title: string;
  description?: string;
  scheduled_at: string;
  repeat_pattern?: 'daily' | 'weekly' | 'monthly' | 'custom';
  repeat_interval?: number;
  is_ai_generated: boolean;
  is_completed: boolean;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  is_premium: boolean;
  premium_expires_at?: string;
  created_at: string;
}

export interface AIParseResult {
  nurture_id?: string;
  nurture_name?: string;
  action: string;
  amount?: string;
  duration?: string;
  mood?: string;
  notes?: string;
  suggested_reminder?: {
    title: string;
    scheduled_at: string;
    repeat_pattern?: string;
  };
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired';
  started_at: string;
  expires_at: string;
}

// Navigation Types
export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
  NurtureDetail: { nurtureId: string };
  AddNurture: { type?: NurtureType };
  Premium: undefined;
  Settings: undefined;
  VoiceMode: undefined;
  Chat: { initialMessage?: string };
  WeeklyReport: undefined;
  PhotoAnalysis: { nurtureId?: string };
  HealthTracking: { nurtureId?: string };
  AlertHistory: undefined;
  PhotoGallery: { nurtureId?: string };
  Export: undefined;
  Statistics: { nurtureId?: string };
};

export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Insights: undefined;
};

