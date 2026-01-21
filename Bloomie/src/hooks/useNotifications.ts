// Bloomie - Notifications Hook

import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  requestNotificationPermissions,
  getExpoPushToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  clearBadge,
} from '../services/notifications';
import { useAppStore } from '../stores/useAppStore';

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  const { completeReminder } = useAppStore();

  useEffect(() => {
    // Request permissions on mount
    requestNotificationPermissions().then(granted => {
      setHasPermission(granted);
      if (granted) {
        getExpoPushToken().then(setExpoPushToken);
      }
    });

    // Listen for incoming notifications while app is foregrounded
    notificationListener.current = addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // Could update UI or show in-app notification
    });

    // Listen for user interaction with notifications
    responseListener.current = addNotificationResponseListener(response => {
      console.log('Notification response:', response);
      
      const data = response.notification.request.content.data;
      
      // Handle reminder completion
      if (data.reminderId && data.type === 'reminder') {
        // Mark reminder as complete if user taps notification
        // This could navigate to the nurture detail screen instead
        completeReminder(data.reminderId as string);
      }
      
      // Clear badge on interaction
      clearBadge();
    });

    // Clear badge when app opens
    clearBadge();

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return {
    expoPushToken,
    hasPermission,
  };
}

export default useNotifications;

