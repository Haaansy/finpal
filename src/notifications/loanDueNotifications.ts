import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { LoanRow } from '@/db/types';
import { projectedLoanRepaymentIsos } from '@/utils/loanSchedule';
import { parseIsoToDate } from '@/utils/dates';

const DATA_KIND = 'loan_due';

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
  await Notifications.setNotificationChannelAsync('due-dates', {
    name: 'Due dates',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
}

export function initNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function parseTimeHHMM(input: string): { hour: number; minute: number } | null {
  const m = input.trim().match(/^(\d{1,2}):(\d{2})$/);
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

function buildScheduleTargets(
  loans: LoanRow[],
  cfg: { daysBefore: number; time: string }
): { when: Date; content: Notifications.NotificationContentInput }[] {
  const todayIso = isoNowDateOnly();
  const out: { when: Date; content: Notifications.NotificationContentInput }[] = [];
  const daysBefore = Math.max(0, Math.floor(cfg.daysBefore));
  const parsed = parseTimeHHMM(cfg.time) ?? { hour: 9, minute: 0 };

  for (const loan of loans) {
    if (loan.months_left <= 0) continue;
    const dates = projectedLoanRepaymentIsos(loan);
    for (const dueIso of dates) {
      // only schedule for future-ish due dates; if due date is already behind today, skip
      if (dueIso < todayIso) continue;
      const dueDate = parseIsoToDate(dueIso);
      if (!dueDate) continue;
      const notifyOn = dateAtLocalTime(minusDays(dueDate, daysBefore), parsed.hour, parsed.minute);
      if (notifyOn.getTime() <= Date.now() + 60_000) continue; // skip anything in the past / next minute
      out.push({
        when: notifyOn,
        content: {
          title: 'Loan due soon',
          body:
            daysBefore === 0
              ? `${loan.name} is due today (${dueIso}).`
              : `${loan.name} is due on ${dueIso} (in ${daysBefore} day${daysBefore === 1 ? '' : 's'}).`,
          data: { kind: DATA_KIND, loanId: loan.id, dueIso, daysBefore },
          sound: true,
        },
      });
    }
  }

  // de-dup by (loanId,dueIso) – last one wins (same schedule time)
  const map = new Map<string, { when: Date; content: Notifications.NotificationContentInput }>();
  for (const t of out) {
    const d = t.content.data as any;
    map.set(`${d.loanId}|${d.dueIso}`, t);
  }
  return [...map.values()].sort((a, b) => a.when.getTime() - b.when.getTime());
}

/** Rebuild scheduled loan notifications (3 days before due). */
export async function syncLoanDueNotifications(
  loans: LoanRow[],
  cfg: { enabled: boolean; daysBefore: number; time: string }
): Promise<void> {
  if (Platform.OS === 'web') return;
  await ensureAndroidChannel();

  // Cancel previously scheduled loan reminders from this app
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter((n) => (n.content.data as any)?.kind === DATA_KIND);
  await Promise.all(ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));

  if (!cfg.enabled) return;

  const ok = await ensurePermissions();
  if (!ok) return;

  // Schedule next reminders
  const targets = buildScheduleTargets(loans, cfg);
  for (const t of targets) {
    await Notifications.scheduleNotificationAsync({
      content: t.content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: t.when,
        channelId: 'due-dates',
      },
    });
  }
}

