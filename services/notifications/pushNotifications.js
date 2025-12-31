import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { savePushToken } from './pushTokens';

// Show alerts by default; silent for sound/badge to avoid surprise behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // iOS foreground presentation; replaces deprecated shouldShowAlert
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const getProjectId = () => Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId || null;

async function ensurePermissionsAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return 'granted';
  const { status } = await Notifications.requestPermissionsAsync();
  return status;
}

export async function registerForPushNotificationsAsync(userId) {
  if (!Device.isDevice) {
    console.warn('[notifications] Push notifications require a physical device.');
    return { token: null, permission: false };
  }

  const status = await ensurePermissionsAsync();
  if (status !== 'granted') {
    console.warn('[notifications] Permission not granted');
    return { token: null, permission: false };
  }

  const projectId = getProjectId();
  const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const token = tokenResponse?.data || null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2774AE',
    });
  }

  if (userId && token) {
    try {
      await savePushToken(userId, token, {
        platform: Platform.OS,
        osVersion: Device.osVersion || 'unknown',
        deviceName: Device.deviceName || 'unknown',
        appId: Application.applicationId || 'unknown',
        appVersion: Application.nativeApplicationVersion || 'unknown',
      });
    } catch (err) {
      console.warn('[notifications] Failed to persist push token', err?.message || err);
    }
  }

  return { token, permission: true };
}

export async function sendPushNotificationAsync(tokens = [], { title, body, data = {} }) {
  const validTokens = tokens.filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken'));
  if (!validTokens.length) return { sent: 0 };

  const messages = validTokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn('[notifications] Push send failed', response.status, text);
      return { sent: 0, error: text };
    }

    return { sent: validTokens.length };
  } catch (err) {
    console.warn('[notifications] Push send error', err?.message || err);
    return { sent: 0, error: err?.message || err };
  }
}
