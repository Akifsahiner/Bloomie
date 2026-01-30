// Bloomie - Supabase Service

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/config';
import type { Nurture, LogEntry, Reminder, User } from '../types';

// Validate config before creating client
const validateConfig = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase config missing!');
    return false;
  }
  if (!SUPABASE_ANON_KEY.startsWith('eyJ')) {
    console.error('Invalid Supabase anon key format!');
    return false;
  }
  return true;
};

// Create Supabase client with AsyncStorage for persistence
let supabase: any;

try {
  if (validateConfig()) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  } else {
    // Create a dummy client that won't crash
    supabase = {
      auth: {
        signUp: async () => ({ data: null, error: new Error('Config invalid') }),
        signInWithPassword: async () => ({ data: null, error: new Error('Config invalid') }),
        signOut: async () => ({ error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: new Error('Config invalid') }) }) }),
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error('Config invalid') }) }) }),
        update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error('Config invalid') }) }) }) }),
        delete: () => ({ eq: async () => ({ error: null }) }),
      }),
    };
  }
} catch (e) {
  console.error('Supabase client creation failed:', e);
  // Fallback dummy client
  supabase = {
    auth: {
      signUp: async () => ({ data: null, error: new Error('Client failed') }),
      signInWithPassword: async () => ({ data: null, error: new Error('Client failed') }),
      signOut: async () => ({ error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: new Error('Client failed') }) }) }),
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error('Client failed') }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error('Client failed') }) }) }) }),
      delete: () => ({ eq: async () => ({ error: null }) }),
    }),
  };
}

export { supabase };

// ==================== AUTH ====================

export const authService = {
  async signUp(email: string, password: string, name?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ==================== NURTURES ====================

export const nurtureService = {
  async create(nurture: Omit<Nurture, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('nurtures')
      .insert(nurture)
      .select()
      .single();
    if (error) throw error;
    return data as Nurture;
  },

  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('nurtures')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Nurture[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('nurtures')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Nurture;
  },

  async update(id: string, updates: Partial<Nurture>) {
    const { data, error } = await supabase
      .from('nurtures')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Nurture;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('nurtures')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ==================== LOG ENTRIES ====================

export const logService = {
  async create(entry: Omit<LogEntry, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('log_entries')
      .insert(entry)
      .select()
      .single();
    if (error) throw error;
    return data as LogEntry;
  },

  async getByNurture(nurtureId: string, limit = 50) {
    const { data, error } = await supabase
      .from('log_entries')
      .select('*')
      .eq('nurture_id', nurtureId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as LogEntry[];
  },

  async getRecent(userId: string, limit = 20) {
    const { data, error } = await supabase
      .from('log_entries')
      .select('*, nurtures(name, type)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  async getByDate(userId: string, date: string) {
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;
    
    const { data, error } = await supabase
      .from('log_entries')
      .select('*, nurtures(name, type)')
      .eq('user_id', userId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('log_entries')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ==================== REMINDERS ====================

export const reminderService = {
  async create(reminder: Omit<Reminder, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('reminders')
      .insert(reminder)
      .select()
      .single();
    if (error) throw error;
    return data as Reminder;
  },

  async getUpcoming(userId: string, limit = 10) {
    const { data, error } = await supabase
      .from('reminders')
      .select('*, nurtures(name, type)')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  async markComplete(id: string) {
    const { data, error } = await supabase
      .from('reminders')
      .update({ is_completed: true })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Reminder;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ==================== USER PROFILE ====================

export const userService = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data as User;
  },

  async createProfile(userId: string, email: string, name?: string) {
    // First try to get existing profile
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (existing) {
      // Profile exists, update name if it's missing and we have a name
      if (!existing.name && name) {
        const { data: updated, error: updateError } = await supabase
          .from('users')
          .update({ name })
          .eq('id', userId)
          .select()
          .single();
        if (updateError) throw updateError;
        return updated as User;
      }
      return existing as User;
    }
    
    // Profile doesn't exist, create it
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        name: name || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as User;
  },

  async updateProfile(userId: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data as User;
  },

  async checkPremiumStatus(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('is_premium, premium_expires_at')
      .eq('id', userId)
      .single();
    if (error) throw error;
    
    if (data.premium_expires_at) {
      const isExpired = new Date(data.premium_expires_at) < new Date();
      if (isExpired && data.is_premium) {
        await supabase
          .from('users')
          .update({ is_premium: false })
          .eq('id', userId);
        return false;
      }
    }
    
    return data.is_premium;
  },
};
