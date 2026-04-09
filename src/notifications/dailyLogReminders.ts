import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const DATA_KIND = 'daily_log';

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
}

async function ensurePermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function syncDailyLogReminders(enabled: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  await ensureAndroidChannel();

  // Cancel our previous daily reminders (so we don't duplicate).
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter((n) => (n.content.data as any)?.kind === DATA_KIND);
  await Promise.all(ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));

  if (!enabled) return;

  const ok = await ensurePermissions();
  if (!ok) return;

  const times: { hour: number; minute: number }[] = [
    { hour: 9, minute: 0 },
    { hour: 15, minute: 0 },
  ];

  for (const t of times) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Finpal check-in',
        body: 'Log your expenses and income for today.',
        data: { kind: DATA_KIND, hour: t.hour, minute: t.minute },
        sound: true,
      },
      trigger: {
        hour: t.hour,
        minute: t.minute,
        repeats: true,
        ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
      } as Notifications.NotificationTriggerInput,
    });
  }
}

