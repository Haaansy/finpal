import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { SavingsBubbleRow } from '@/db/types';
import { parseIsoToDate } from '@/utils/dates';

const DATA_KIND = 'bubble_target';

function isoNowDateOnly(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateAtLocalTime(d: Date, hour: number, minute: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute, 0);
}

function minusDays(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() - days);
  return x;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('savings', {
    name: 'Savings',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
}

function parseTimeHHMM(input: string | null | undefined): { hour: number; minute: number } | null {
  const s = (input ?? '').trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23) return null;
  if (min < 0 || min > 59) return null;
  return { hour: h, minute: min };
}

async function ensurePermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

function buildTargets(bubbles: SavingsBubbleRow[]): { when: Date; content: Notifications.NotificationContentInput }[] {
  const todayIso = isoNowDateOnly();
  const out: { when: Date; content: Notifications.NotificationContentInput }[] = [];
  const daysList = [30, 15];

  for (const b of bubbles) {
    if (!b.target_date) continue;
    if ((b.remind_enabled ?? 1) === 0) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.target_date)) continue;
    if (b.target_date < todayIso) continue;
    const target = parseIsoToDate(b.target_date);
    if (!target) continue;
    const t = parseTimeHHMM(b.remind_time) ?? { hour: 9, minute: 0 };
    for (const daysBefore of daysList) {
      const when = dateAtLocalTime(minusDays(target, daysBefore), t.hour, t.minute);
      if (when.getTime() <= Date.now() + 60_000) continue;
      out.push({
        when,
        content: {
          title: 'Savings goal deadline',
          body: `${b.name} target date is ${b.target_date} (in ${daysBefore} days).`,
          data: { kind: DATA_KIND, bubbleId: b.id, targetDate: b.target_date, daysBefore },
          sound: true,
        },
      });
    }
  }
  return out.sort((a, b) => a.when.getTime() - b.when.getTime());
}

export async function syncBubbleTargetReminders(bubbles: SavingsBubbleRow[], enabled: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  await ensureAndroidChannel();

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter((n) => (n.content.data as any)?.kind === DATA_KIND);
  await Promise.all(ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));

  if (!enabled) return;

  const ok = await ensurePermissions();
  if (!ok) return;

  const targets = buildTargets(bubbles);
  for (const t of targets) {
    await Notifications.scheduleNotificationAsync({
      content: t.content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: t.when,
        channelId: 'savings',
      },
    });
  }
}

