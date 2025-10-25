// lib/PushNotificationService.ts
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './Supabase';

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register device for push notifications and store token in database
 */
export async function registerForPushNotifications(userId: number): Promise<string | null> {
  // Check if device is physical (push notifications don't work on simulators)
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-expo-project-id', // REPLACE THIS - See step 3
    });
    const token = tokenData.data;

    console.log('✅ Expo Push Token:', token);

    // Store token in database
    const { error } = await supabase
      .from('users')
      .update({ 
        push_token: token,
        push_token_updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error storing push token:', error);
    }

    // Configure Android channel (required for Android)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00A78F',
      });
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Remove push token from database when user logs out
 */
export async function unregisterPushNotifications(userId: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        push_token: null,
        push_token_updated_at: null
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing push token:', error);
    }
  } catch (error) {
    console.error('Error in unregisterPushNotifications:', error);
  }
}

/**
 * Set up listeners for notification interactions
 */
export function setupNotificationListeners(router: any): void {
  // Handle notification tapped/clicked
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification tapped:', response);
    const data = response.notification.request.content.data;
    
    // Navigate based on notification type
    if (data.type === 'like' && data.product_id) {
      router.push(`/product_detail?id=${data.product_id}`);
    } else if (data.type === 'follow' && data.sender_id) {
      router.push(`/someonesProfile?userId=${data.sender_id}`);
    }
  });

  return subscription;
}