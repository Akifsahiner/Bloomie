// Bloomie - Smart Notifications Service

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { PLANT_CARE_DATABASE, PET_CARE_DATABASE, getBabyMilestones } from './ai-assistant';
import type { Nurture, Reminder, LogEntry } from '../types';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Bloomie Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F17D7D',
    });

    // Create channel for care reminders
    await Notifications.setNotificationChannelAsync('care-reminders', {
      name: 'Care Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      description: 'Watering, feeding, diaper change reminders',
    });
  }

  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push notification permissions');
    return null;
  }

  try {
    // Try to get project ID from Constants or use undefined (Expo will handle it)
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                      Constants.expoConfig?.extra?.easProjectId ||
                      undefined;
    
    // Only try to get push token if we have a valid project ID
    // Otherwise, skip push notifications (local notifications will still work)
    if (projectId && projectId !== 'your-project-id') {
      try {
        token = (await Notifications.getExpoPushTokenAsync({
          projectId,
        })).data;
      } catch (pushError: any) {
        // Silently fail - local notifications will still work
        console.log('Push token not available (local notifications will work)');
      }
    } else {
      // No valid project ID - skip push token, use local notifications only
      console.log('Using local notifications only (no EAS project ID configured)');
    }
  } catch (error: any) {
    // Silently fail - local notifications will still work
    console.log('Notification setup completed (local notifications available)');
  }

  return token;
}

/**
 * Save push token to user profile
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
  try {
    await supabase
      .from('users')
      .update({ push_token: token })
      .eq('id', userId);
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

/**
 * Schedule a local notification
 */
export async function scheduleNotification(
  title: string,
  body: string,
  triggerSeconds: number,
  data?: Record<string, any>
): Promise<string | null> {
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        badge: 1,
      },
      trigger: {
        seconds: triggerSeconds,
      },
    });
    return identifier;
  } catch (error) {
    console.error('Schedule notification error:', error);
    return null;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.error('Cancel notification error:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Schedule a reminder notification
 */
export async function scheduleReminderNotification(reminder: Reminder): Promise<string | null> {
  const scheduledTime = new Date(reminder.scheduled_at);
  const now = new Date();
  const secondsUntil = Math.max(1, Math.floor((scheduledTime.getTime() - now.getTime()) / 1000));

  return scheduleNotification(
    reminder.title,
    reminder.description || 'Reminder time!',
    secondsUntil,
    { reminderId: reminder.id, nurtureId: reminder.nurture_id }
  );
}

/**
 * Schedule smart care reminders based on nurture type
 */
export async function scheduleSmartReminders(
  nurture: Nurture,
  recentLogs: LogEntry[]
): Promise<void> {
  const now = new Date();
  const metadata = nurture.metadata as any;

  // PLANT REMINDERS
  if (nurture.type === 'plant') {
    const species = metadata?.species;
    const plantInfo = species ? PLANT_CARE_DATABASE[species] : null;
    const wateringDays = plantInfo?.wateringDays || metadata?.water_frequency || 7;
    
    // Check last watering
    const lastWatering = recentLogs.find(log => 
      log.parsed_action?.toLowerCase().includes('water') ||
      log.raw_input?.toLowerCase().includes('water')
    );

    let daysSinceWatering = wateringDays;
    if (lastWatering) {
      daysSinceWatering = Math.floor(
        (now.getTime() - new Date(lastWatering.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    const daysUntilWatering = Math.max(0, wateringDays - daysSinceWatering);
    
    if (daysUntilWatering <= 1) {
      // Schedule for tomorrow morning (9 AM)
      const reminderTime = new Date();
      reminderTime.setHours(9, 0, 0, 0);
      if (reminderTime <= now) {
        reminderTime.setDate(reminderTime.getDate() + 1);
      }
      
      const secondsUntil = Math.floor((reminderTime.getTime() - now.getTime()) / 1000);
      
      await scheduleNotification(
        `💧 Time to water ${nurture.name}!`,
        `Your plant is thirsty! Give ${nurture.name} some water today. 🌱`,
        secondsUntil,
        { nurtureId: nurture.id, action: 'water' }
      );
    }
  }

  // PET REMINDERS
  if (nurture.type === 'pet') {
    const species = metadata?.species;
    const petInfo = species ? PET_CARE_DATABASE[species] : null;

    // Feeding reminder
    const lastFeeding = recentLogs.find(log => 
      log.parsed_action?.toLowerCase().includes('fed') ||
      log.parsed_action?.toLowerCase().includes('feed') ||
      log.raw_input?.toLowerCase().includes('food')
    );

    if (lastFeeding) {
      const hoursSinceFeeding = Math.floor(
        (now.getTime() - new Date(lastFeeding.created_at).getTime()) / (1000 * 60 * 60)
      );

      // Remind if 10+ hours since last feeding
      if (hoursSinceFeeding >= 10) {
        await scheduleNotification(
          `🍖 Time to feed ${nurture.name}!`,
          `${nurture.name} might be getting hungry. Last fed ${hoursSinceFeeding} hours ago. 🐾`,
          60, // 1 minute from now
          { nurtureId: nurture.id, action: 'feed' }
        );
      }
    }

    // Walking reminder for dogs
    if (species === 'dog' || metadata?.breed) {
      const lastWalk = recentLogs.find(log => 
        log.parsed_action?.toLowerCase().includes('walk') ||
        log.raw_input?.toLowerCase().includes('walk')
      );

      if (lastWalk) {
        const hoursSinceWalk = Math.floor(
          (now.getTime() - new Date(lastWalk.created_at).getTime()) / (1000 * 60 * 60)
        );

        // Evening walk reminder if no walk today
        if (hoursSinceWalk >= 8 && now.getHours() >= 17 && now.getHours() <= 20) {
          await scheduleNotification(
            `🦮 ${nurture.name} wants to go for a walk!`,
            `It's been ${hoursSinceWalk} hours since the last walk. Time for some exercise!`,
            60,
            { nurtureId: nurture.id, action: 'walk' }
          );
        }
      }
    }

    // Parasite treatment
    if (petInfo && petInfo.parasiteTreatmentDays > 0) {
      const lastTreatment = recentLogs.find(log => 
        log.parsed_action?.toLowerCase().includes('medicine') ||
        log.raw_input?.toLowerCase().includes('medicine') ||
        log.raw_input?.toLowerCase().includes('treatment')
      );

      if (lastTreatment) {
        const daysSinceTreatment = Math.floor(
          (now.getTime() - new Date(lastTreatment.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        const daysUntilNext = petInfo.parasiteTreatmentDays - daysSinceTreatment;
        
        if (daysUntilNext <= 3 && daysUntilNext > 0) {
          await scheduleNotification(
            `💊 ${nurture.name}'s treatment coming up!`,
            `Parasite treatment due in ${daysUntilNext} days. Don't forget!`,
            daysUntilNext * 24 * 60 * 60,
            { nurtureId: nurture.id, action: 'medicine' }
          );
        }
      }
    }
  }

  // BABY REMINDERS
  if (nurture.type === 'baby') {
    const birthDate = metadata?.birth_date ? new Date(metadata.birth_date) : null;
    
    if (birthDate) {
      const ageMonths = Math.floor(
        (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );

      // Feeding reminder
      const lastFeeding = recentLogs.find(log => 
        log.parsed_action?.toLowerCase().includes('fed') ||
        log.parsed_action?.toLowerCase().includes('feed') ||
        log.parsed_action?.toLowerCase().includes('bottle') ||
        log.parsed_action?.toLowerCase().includes('breastfed')
      );

      if (lastFeeding) {
        const hoursSinceFeeding = Math.floor(
          (now.getTime() - new Date(lastFeeding.created_at).getTime()) / (1000 * 60 * 60)
        );

        const feedingInterval = ageMonths < 3 ? 3 : 4;

        if (hoursSinceFeeding >= feedingInterval) {
          await scheduleNotification(
            `🍼 Time to feed ${nurture.name}!`,
            `It's been ${hoursSinceFeeding} hours since the last feeding. 👶`,
            60,
            { nurtureId: nurture.id, action: 'feed' }
          );
        }
      }

      // Diaper reminder
      const lastDiaper = recentLogs.find(log => 
        log.parsed_action?.toLowerCase().includes('diaper') ||
        log.raw_input?.toLowerCase().includes('diaper')
      );

      if (lastDiaper) {
        const hoursSinceDiaper = Math.floor(
          (now.getTime() - new Date(lastDiaper.created_at).getTime()) / (1000 * 60 * 60)
        );

        if (hoursSinceDiaper >= 3) {
          await scheduleNotification(
            `🧷 Diaper check for ${nurture.name}?`,
            `It's been ${hoursSinceDiaper} hours since the last diaper change. Time to check!`,
            60,
            { nurtureId: nurture.id, action: 'diaper' }
          );
        }
      }
    }
  }
}

/**
 * Schedule daily care check-in notification
 */
export async function scheduleDailyCheckIn(nurtures: Nurture[]): Promise<void> {
  if (nurtures.length === 0) return;
  
  // Schedule for 9 AM tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  
  const secondsUntil = Math.floor((tomorrow.getTime() - Date.now()) / 1000);
  
  const nurtureNames = nurtures.slice(0, 2).map(n => n.name).join(' and ');
  
  await scheduleNotification(
    `🌅 Good morning! How are ${nurtureNames}?`,
    `Start your day by checking in with your loved ones. Bloomie is here to help! 💚`,
    secondsUntil,
    { type: 'daily_checkin' }
  );
}

/**
 * Schedule evening reflection notification
 */
export async function scheduleEveningReflection(nurtures: Nurture[]): Promise<void> {
  if (nurtures.length === 0) return;
  
  // Schedule for 8 PM today or tomorrow
  const evening = new Date();
  evening.setHours(20, 0, 0, 0);
  
  if (evening <= new Date()) {
    evening.setDate(evening.getDate() + 1);
  }
  
  const secondsUntil = Math.floor((evening.getTime() - Date.now()) / 1000);
  
  await scheduleNotification(
    `🌙 How was your day with your nurtures?`,
    `Take a moment to log today's activities. Your care matters! ✨`,
    secondsUntil,
    { type: 'evening_reflection' }
  );
}

/**
 * Schedule weekly report notification
 */
export async function scheduleWeeklyReport(): Promise<void> {
  // Schedule for Sunday at 10 AM
  const nextSunday = new Date();
  nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()));
  nextSunday.setHours(10, 0, 0, 0);
  
  const secondsUntil = Math.floor((nextSunday.getTime() - Date.now()) / 1000);
  
  await scheduleNotification(
    `📊 Your Weekly Care Report is Ready!`,
    `See how you cared for your loved ones this week. Great job! 🌟`,
    secondsUntil,
    { type: 'weekly_report' }
  );
}

/**
 * Setup notification listeners
 */
export function setupNotificationListeners(
  onReceived?: (notification: Notifications.Notification) => void,
  onResponse?: (response: Notifications.NotificationResponse) => void
): () => void {
  const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
    onReceived?.(notification);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response:', response);
    onResponse?.(response);
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Initialize notifications
 */
export async function initializeNotifications(userId?: string): Promise<void> {
  const token = await registerForPushNotificationsAsync();
  
  if (token && userId) {
    await savePushToken(userId, token);
  }
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}

// Export as service object
export const notificationService = {
  initialize: initializeNotifications,
  register: registerForPushNotificationsAsync,
  schedule: scheduleNotification,
  scheduleReminder: scheduleReminderNotification,
  scheduleSmartReminders,
  scheduleDailyCheckIn,
  scheduleEveningReflection,
  scheduleWeeklyReport,
  cancel: cancelNotification,
  cancelAll: cancelAllNotifications,
  setupListeners: setupNotificationListeners,
  getScheduled: getScheduledNotifications,
};

export default notificationService;
