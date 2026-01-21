-- Bloomie Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== USERS TABLE ====================
-- Extended user profile (Supabase Auth handles basic auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  premium_expires_at TIMESTAMPTZ,
  push_token TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ==================== NURTURES TABLE ====================
CREATE TABLE IF NOT EXISTS public.nurtures (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('baby', 'pet', 'plant')),
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.nurtures ENABLE ROW LEVEL SECURITY;

-- Users can only access their own nurtures
CREATE POLICY "Users can CRUD own nurtures" ON public.nurtures
  FOR ALL USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_nurtures_user_id ON public.nurtures(user_id);
CREATE INDEX idx_nurtures_type ON public.nurtures(type);

-- ==================== LOG ENTRIES TABLE ====================
CREATE TABLE IF NOT EXISTS public.log_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nurture_id UUID REFERENCES public.nurtures(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  raw_input TEXT NOT NULL,
  parsed_action TEXT,
  parsed_subject TEXT,
  parsed_amount TEXT,
  parsed_duration TEXT,
  parsed_notes TEXT,
  mood TEXT CHECK (mood IN ('happy', 'neutral', 'sad', 'tired', 'energetic')),
  photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  ai_insights TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.log_entries ENABLE ROW LEVEL SECURITY;

-- Users can only access their own log entries
CREATE POLICY "Users can CRUD own log entries" ON public.log_entries
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for faster queries
CREATE INDEX idx_log_entries_nurture_id ON public.log_entries(nurture_id);
CREATE INDEX idx_log_entries_user_id ON public.log_entries(user_id);
CREATE INDEX idx_log_entries_created_at ON public.log_entries(created_at DESC);

-- ==================== REMINDERS TABLE ====================
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  nurture_id UUID REFERENCES public.nurtures(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  repeat_pattern TEXT CHECK (repeat_pattern IN ('daily', 'weekly', 'monthly', 'custom')),
  repeat_interval INTEGER,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  notification_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Users can only access their own reminders
CREATE POLICY "Users can CRUD own reminders" ON public.reminders
  FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX idx_reminders_nurture_id ON public.reminders(nurture_id);
CREATE INDEX idx_reminders_scheduled_at ON public.reminders(scheduled_at);
CREATE INDEX idx_reminders_is_completed ON public.reminders(is_completed);

-- ==================== SUBSCRIPTIONS TABLE ====================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')),
  store_transaction_id TEXT,
  store_product_id TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);

-- ==================== FAMILY SHARING TABLE ====================
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  nurture_id UUID REFERENCES public.nurtures(id) ON DELETE CASCADE NOT NULL,
  permission TEXT DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(owner_id, member_id, nurture_id)
);

-- Enable Row Level Security
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Owner can manage family members
CREATE POLICY "Owner can manage family members" ON public.family_members
  FOR ALL USING (auth.uid() = owner_id);

-- Members can view their invitations
CREATE POLICY "Members can view invitations" ON public.family_members
  FOR SELECT USING (auth.uid() = member_id);

-- ==================== FUNCTIONS ====================

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_nurtures_updated_at
  BEFORE UPDATE ON public.nurtures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ==================== VIEWS ====================

-- View for recent activity across all nurtures
CREATE OR REPLACE VIEW public.recent_activity AS
SELECT 
  le.id,
  le.user_id,
  le.nurture_id,
  n.name as nurture_name,
  n.type as nurture_type,
  le.raw_input,
  le.parsed_action,
  le.parsed_notes,
  le.mood,
  le.photo_urls,
  le.created_at
FROM public.log_entries le
JOIN public.nurtures n ON le.nurture_id = n.id
ORDER BY le.created_at DESC;

-- ==================== USAGE LIMITS (API COST CONTROL) ====================

-- Tracks per-user lifetime usage for free tier limits (chat, Perplexity, voice, photos)
CREATE TABLE IF NOT EXISTS public.user_usage_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Lifetime totals
  total_ai_chat_queries INTEGER DEFAULT 0,
  total_perplexity_queries INTEGER DEFAULT 0,
  total_voice_minutes NUMERIC(10,2) DEFAULT 0,
  total_photo_analysis INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

ALTER TABLE public.user_usage_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage stats
CREATE POLICY "Users can view own usage limits" ON public.user_usage_limits
  FOR SELECT USING (auth.uid() = user_id);

-- (Optional) allow app to update usage via RLS with auth.uid()
CREATE POLICY "Users can update own usage limits" ON public.user_usage_limits
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_usage_limits_user_id 
  ON public.user_usage_limits(user_id);


-- ==================== STORAGE BUCKETS ====================

-- Create storage bucket for photos (run in Supabase Dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('nurture-photos', 'nurture-photos', true);

-- Storage policy for nurture photos
-- CREATE POLICY "Users can upload their own photos"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'nurture-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can view their own photos"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'nurture-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

