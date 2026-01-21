// Bloomie - Main App Store (Zustand) with Supabase Integration

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nurtureService, logService, reminderService, userService, authService } from '../services/supabase';
import type { User, Nurture, LogEntry, Reminder, NurtureType } from '../types';

interface AppState {
  // Auth State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Onboarding
  hasCompletedOnboarding: boolean;
  
  // Nurtures
  nurtures: Nurture[];
  selectedNurtureId: string | null;
  
  // Logs
  recentLogs: LogEntry[];
  
  // Reminders
  upcomingReminders: Reminder[];
  
  // Premium
  isPremium: boolean;
  
  // Usage limits (for non-premium)
  photoAnalysisCount: number;  // Free users get 3
  voiceMinutesUsed: number;    // Track voice usage
  aiQueriesCount: number;      // Daily AI query count
  lastQueryResetDate: string;  // Date when query count was last reset

  // Sync status
  isSyncing: boolean;
  lastSyncAt: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setIsLoading: (loading: boolean) => void;
  setHasCompletedOnboarding: (completed: boolean) => void;
  setHasSeenWelcome: (seen: boolean) => void;
  setNurtures: (nurtures: Nurture[]) => void;
  addNurture: (nurture: Nurture) => Promise<Nurture | null>;
  updateNurture: (id: string, updates: Partial<Nurture>) => Promise<void>;
  removeNurture: (id: string) => Promise<void>;
  setSelectedNurtureId: (id: string | null) => void;
  setRecentLogs: (logs: LogEntry[]) => void;
  addLog: (log: LogEntry) => Promise<LogEntry | null>;
  removeLog: (id: string) => Promise<void>;
  setUpcomingReminders: (reminders: Reminder[]) => void;
  addReminder: (reminder: Reminder) => Promise<Reminder | null>;
  completeReminder: (id: string) => Promise<void>;
  setIsPremium: (isPremium: boolean) => void;
  incrementPhotoAnalysis: () => boolean;  // Returns false if limit reached
  canUsePhotoAnalysis: () => boolean;
  canUseVoiceMode: () => boolean;
  canUseAiQuery: () => boolean;      // Check if AI query allowed
  incrementAiQuery: () => boolean;   // Increment and check limit
  resetUsageLimits: () => void;
  logout: () => Promise<void>;
  
  // Sync Actions
  syncData: () => Promise<void>;
  fetchNurtures: () => Promise<void>;
  fetchRecentLogs: () => Promise<void>;
  fetchReminders: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      isAuthenticated: false,
      isLoading: true,
      hasCompletedOnboarding: false,
      hasSeenWelcome: false,
      nurtures: [],
      selectedNurtureId: null,
      recentLogs: [],
      upcomingReminders: [],
      isPremium: false,
      photoAnalysisCount: 0,
      voiceMinutesUsed: 0,
      aiQueriesCount: 0,
      lastQueryResetDate: new Date().toDateString(),
      isSyncing: false,
      lastSyncAt: null,

      // ==================== Auth Actions ====================
      
      initializeAuth: async () => {
        try {
          const session = await authService.getSession();
          if (session?.user) {
            // Get full user profile from database
            let userProfile;
            try {
              userProfile = await userService.getProfile(session.user.id);
            } catch (e) {
              // User profile might not exist yet
              userProfile = null;
            }
            
            // If profile doesn't exist, create it
            if (!userProfile) {
              try {
                userProfile = await userService.createProfile(
                  session.user.id,
                  session.user.email || '',
                  session.user.user_metadata?.name
                );
              } catch (createError) {
                console.error('Failed to create user profile:', createError);
              }
            }
            
            set({ 
              user: {
                id: session.user.id,
                email: session.user.email || '',
                name: userProfile?.name || session.user.user_metadata?.name || 'User',
                avatar_url: userProfile?.avatar_url,
                is_premium: userProfile?.is_premium || false,
                premium_expires_at: userProfile?.premium_expires_at,
                created_at: session.user.created_at,
              },
              isAuthenticated: true,
              isPremium: userProfile?.is_premium || false,
            });

            // Sync data after auth
            await get().syncData();
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
        } finally {
          set({ isLoading: false });
        }
      },
      
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user,
        isPremium: user?.is_premium || false,
      }),
      
      setIsLoading: (isLoading) => set({ isLoading }),
      
      setHasCompletedOnboarding: (hasCompletedOnboarding) => set({ hasCompletedOnboarding }),
      
      setHasSeenWelcome: (hasSeenWelcome) => set({ hasSeenWelcome }),
      
      // ==================== Nurture Actions ====================
      
      setNurtures: (nurtures) => set({ nurtures }),
      
      addNurture: async (nurture) => {
        const { user, isPremium, nurtures } = get();
        
        // Optimistic update
        set({ nurtures: [nurture, ...nurtures] });
        
        // Save to Supabase if authenticated
        if (user) {
          try {
            const saved = await nurtureService.create({
              user_id: user.id,
              name: nurture.name,
              type: nurture.type,
              avatar_url: nurture.avatar_url,
              metadata: nurture.metadata,
            });
            
            // Update with real ID from Supabase
            set({ 
              nurtures: get().nurtures.map(n => 
                n.id === nurture.id ? saved : n
              ) 
            });
            
            return saved;
          } catch (error) {
            console.error('Failed to save nurture:', error);
            // Rollback on error
            set({ nurtures: nurtures });
            return null;
          }
        }
        
        return nurture;
      },
      
      updateNurture: async (id, updates) => {
        const { user, nurtures } = get();
        
        // Optimistic update
        set({
          nurtures: nurtures.map((n) => 
            n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n
          ),
        });
        
        // Save to Supabase
        if (user) {
          try {
            await nurtureService.update(id, updates);
          } catch (error) {
            console.error('Failed to update nurture:', error);
          }
        }
      },
      
      removeNurture: async (id) => {
        const { user, nurtures, recentLogs } = get();
        
        // Optimistic update
        set({
          nurtures: nurtures.filter((n) => n.id !== id),
          recentLogs: recentLogs.filter((l) => l.nurture_id !== id),
        });
        
        // Delete from Supabase
        if (user) {
          try {
            await nurtureService.delete(id);
          } catch (error) {
            console.error('Failed to delete nurture:', error);
          }
        }
      },
      
      setSelectedNurtureId: (selectedNurtureId) => set({ selectedNurtureId }),
      
      // ==================== Log Actions ====================
      
      setRecentLogs: (recentLogs) => set({ recentLogs }),
      
      addLog: async (log) => {
        const { user, recentLogs } = get();
        
        // Optimistic update
        set({ recentLogs: [log, ...recentLogs].slice(0, 100) });
        
        // Save to Supabase
        if (user) {
          try {
            const saved = await logService.create({
              nurture_id: log.nurture_id,
              user_id: user.id,
              raw_input: log.raw_input,
              parsed_action: log.parsed_action,
              parsed_subject: log.parsed_subject,
              parsed_amount: log.parsed_amount,
              parsed_duration: log.parsed_duration,
              parsed_notes: log.parsed_notes,
              mood: log.mood,
              photo_urls: log.photo_urls,
            });
            
            // Update with real ID
            set({ 
              recentLogs: get().recentLogs.map(l => 
                l.id === log.id ? saved : l
              ) 
            });
            
            return saved;
          } catch (error) {
            console.error('Failed to save log:', error);
            return null;
          }
        }
        
        return log;
      },

      removeLog: async (id) => {
        const { user, recentLogs } = get();
        
        // Optimistic update
        set({ recentLogs: recentLogs.filter(l => l.id !== id) });
        
        // Delete from Supabase
        if (user) {
          try {
            await logService.delete(id);
          } catch (error) {
            console.error('Failed to delete log:', error);
          }
        }
      },
      
      // ==================== Reminder Actions ====================
      
      setUpcomingReminders: (upcomingReminders) => set({ upcomingReminders }),
      
      addReminder: async (reminder) => {
        const { user, upcomingReminders } = get();
        
        const newReminders = [...upcomingReminders, reminder]
          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
        
        set({ upcomingReminders: newReminders });
        
        // Save to Supabase
        if (user) {
          try {
            const saved = await reminderService.create({
              user_id: user.id,
              nurture_id: reminder.nurture_id,
              title: reminder.title,
              description: reminder.description,
              scheduled_at: reminder.scheduled_at,
              repeat_pattern: reminder.repeat_pattern,
              repeat_interval: reminder.repeat_interval,
              is_ai_generated: reminder.is_ai_generated,
              is_completed: false,
            });
            
            set({ 
              upcomingReminders: get().upcomingReminders.map(r => 
                r.id === reminder.id ? saved : r
              ) 
            });
            
            return saved;
          } catch (error) {
            console.error('Failed to save reminder:', error);
            return null;
          }
        }
        
        return reminder;
      },
      
      completeReminder: async (id) => {
        const { user, upcomingReminders } = get();
        
        set({
          upcomingReminders: upcomingReminders.filter((r) => r.id !== id),
        });
        
        if (user) {
          try {
            await reminderService.markComplete(id);
          } catch (error) {
            console.error('Failed to complete reminder:', error);
          }
        }
      },
      
      // ==================== Premium Actions ====================
      
      setIsPremium: (isPremium) => set({ isPremium }),
      
      incrementPhotoAnalysis: () => {
        const { isPremium, photoAnalysisCount } = get();
        if (isPremium) return true;
        if (photoAnalysisCount >= 3) return false;
        set({ photoAnalysisCount: photoAnalysisCount + 1 });
        return true;
      },
      
      canUsePhotoAnalysis: () => {
        const { isPremium, photoAnalysisCount } = get();
        return isPremium || photoAnalysisCount < 3;
      },
      
      canUseVoiceMode: () => {
        const { isPremium } = get();
        return isPremium;
      },
      
      // AI Query limits - free users get 20/day, premium unlimited
      canUseAiQuery: () => {
        const { isPremium, aiQueriesCount, lastQueryResetDate } = get();
        if (isPremium) return true;
        
        // Check if we need to reset daily count
        const today = new Date().toDateString();
        if (lastQueryResetDate !== today) {
          set({ aiQueriesCount: 0, lastQueryResetDate: today });
          return true;
        }
        
        return aiQueriesCount < 20; // 20 free queries per day
      },
      
      incrementAiQuery: () => {
        const { isPremium, aiQueriesCount, lastQueryResetDate } = get();
        if (isPremium) return true;
        
        // Reset if new day
        const today = new Date().toDateString();
        if (lastQueryResetDate !== today) {
          set({ aiQueriesCount: 1, lastQueryResetDate: today });
          return true;
        }
        
        if (aiQueriesCount >= 20) return false;
        set({ aiQueriesCount: aiQueriesCount + 1 });
        return true;
      },
      
      resetUsageLimits: () => {
        set({ 
          photoAnalysisCount: 0, 
          voiceMinutesUsed: 0,
          aiQueriesCount: 0,
          lastQueryResetDate: new Date().toDateString(),
        });
      },
      
      // ==================== Logout ====================
      
      logout: async () => {
        try {
          await authService.signOut();
        } catch (error) {
          console.error('Logout error:', error);
        }
        
        set({
          user: null,
          isAuthenticated: false,
          nurtures: [],
          selectedNurtureId: null,
          recentLogs: [],
          upcomingReminders: [],
          isPremium: false,
          lastSyncAt: null,
        });
      },

      // ==================== Sync Actions ====================

      syncData: async () => {
        const { user, isSyncing } = get();
        if (!user || isSyncing) return;

        set({ isSyncing: true });
        
        try {
          await Promise.all([
            get().fetchNurtures(),
            get().fetchRecentLogs(),
            get().fetchReminders(),
          ]);
          
          set({ lastSyncAt: new Date().toISOString() });
        } catch (error) {
          console.error('Sync error:', error);
        } finally {
          set({ isSyncing: false });
        }
      },

      fetchNurtures: async () => {
        const { user } = get();
        if (!user) return;

        try {
          const nurtures = await nurtureService.getAll(user.id);
          set({ nurtures });
        } catch (error) {
          console.error('Failed to fetch nurtures:', error);
        }
      },

      fetchRecentLogs: async () => {
        const { user } = get();
        if (!user) return;

        try {
          const logs = await logService.getRecent(user.id, 50);
          // Map to proper type
          const mappedLogs: LogEntry[] = logs.map((log: any) => ({
            id: log.id,
            nurture_id: log.nurture_id,
            user_id: log.user_id,
            raw_input: log.raw_input,
            parsed_action: log.parsed_action,
            parsed_subject: log.parsed_subject,
            parsed_amount: log.parsed_amount,
            parsed_duration: log.parsed_duration,
            parsed_notes: log.parsed_notes,
            mood: log.mood,
            photo_urls: log.photo_urls,
            created_at: log.created_at,
            ai_insights: log.ai_insights,
          }));
          set({ recentLogs: mappedLogs });
        } catch (error) {
          console.error('Failed to fetch logs:', error);
        }
      },

      fetchReminders: async () => {
        const { user } = get();
        if (!user) return;

        try {
          const reminders = await reminderService.getUpcoming(user.id, 20);
          // Map to proper type
          const mappedReminders: Reminder[] = reminders.map((r: any) => ({
            id: r.id,
            user_id: r.user_id,
            nurture_id: r.nurture_id,
            title: r.title,
            description: r.description,
            scheduled_at: r.scheduled_at,
            repeat_pattern: r.repeat_pattern,
            repeat_interval: r.repeat_interval,
            is_ai_generated: r.is_ai_generated,
            is_completed: r.is_completed,
            created_at: r.created_at,
          }));
          set({ upcomingReminders: mappedReminders });
        } catch (error) {
          console.error('Failed to fetch reminders:', error);
        }
      },
    }),
    {
      name: 'bloomie-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        hasSeenWelcome: state.hasSeenWelcome,
        // Cache nurtures and logs for offline support
        nurtures: state.nurtures,
        recentLogs: state.recentLogs.slice(0, 20),
        lastSyncAt: state.lastSyncAt,
        // Premium usage tracking
        photoAnalysisCount: state.photoAnalysisCount,
        voiceMinutesUsed: state.voiceMinutesUsed,
      }),
    }
  )
);

// Selectors for common queries
export const useNurturesByType = (type: NurtureType) => {
  return useAppStore((state) => state.nurtures.filter((n) => n.type === type));
};

export const useSelectedNurture = () => {
  return useAppStore((state) => 
    state.nurtures.find((n) => n.id === state.selectedNurtureId) || null
  );
};

export const useTodayLogs = () => {
  const today = new Date().toISOString().split('T')[0];
  return useAppStore((state) => 
    state.recentLogs.filter((log) => log.created_at.startsWith(today))
  );
};

export const useNurtureLogs = (nurtureId: string) => {
  return useAppStore((state) => 
    state.recentLogs.filter((log) => log.nurture_id === nurtureId)
  );
};

// Get last activity for a nurture
export const useLastActivity = (nurtureId: string) => {
  return useAppStore((state) => {
    const logs = state.recentLogs.filter((log) => log.nurture_id === nurtureId);
    if (logs.length === 0) return null;
    return logs[0];
  });
};
