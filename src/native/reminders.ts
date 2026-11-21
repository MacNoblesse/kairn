import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative } from './platform';
import {
  defaultReminderSettings,
  normalizeTimes,
  planReminders,
  type ReminderSettings,
} from './reminderPlan';

/**
 * Rappels de révision (notifications locales, APK uniquement).
 *
 * POLITIQUE DE PRÉCISION : INEXACTE, volontairement.
 *  - On planifie avec `allowWhileIdle: true` et SANS la permission SCHEDULE_EXACT_ALARM.
 *  - Android ≥ 12 : l'alarme est « inexacte » (le plugin utilise setAndAllowWhileIdle) : la
 *    notification peut arriver avec un retard de quelques minutes (jusqu'à ~15 min en veille profonde).
 *  - Android ≤ 11 : le plugin utilise une alarme exacte sans permission spéciale.
 *  Pour un rappel de révision, la minute près n'a aucune valeur ; en échange, aucune permission
 *  sensible à justifier et aucune page de réglages « Alarmes et rappels » à faire activer.
 */

const SETTINGS_KEY = 'kairn_reminders_v1';
const CHANNEL_ID = 'reviews';

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

let latestCards: ReadonlyArray<{ dueDate: string }> = [];
let replanTimer: ReturnType<typeof setTimeout> | null = null;
let chain: Promise<unknown> = Promise.resolve();

export function loadReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<ReminderSettings>;
      return {
        enabled: p.enabled === true,
        times: Array.isArray(p.times) ? p.times.filter((t) => typeof t === 'string').slice(0, 2) : defaultReminderSettings().times,
      };
    }
  } catch {
    // ignore
  }
  return defaultReminderSettings();
}

function saveReminderSettings(settings: ReminderSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export async function getPermissionState(): Promise<PermissionState> {
  if (!isNative) return 'unsupported';
  try {
    const { display } = await LocalNotifications.checkPermissions();
    return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';
  } catch {
    return 'unsupported';
  }
}

/** À appeler suite à un geste de l'utilisateur (Android 13+ : boîte de dialogue POST_NOTIFICATIONS). */
export async function requestPermission(): Promise<PermissionState> {
  if (!isNative) return 'unsupported';
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';
  } catch {
    return 'unsupported';
  }
}

async function applyPlan(): Promise<void> {
  if (!isNative) return;
  const settings = loadReminderSettings();

  // Tout est annulé puis recréé : le plan est toujours le reflet exact de l'état courant.
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
  }
  if (!settings.enabled) return;
  if ((await getPermissionState()) !== 'granted') return;

  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'Révisions',
    description: 'Rappels de cartes à réviser (2 par jour maximum)',
    importance: 3,
    visibility: 1,
  });

  const plan = planReminders(latestCards, new Date(), settings);
  if (plan.length === 0) return;
  await LocalNotifications.schedule({
    notifications: plan.map((p) => ({
      id: p.id,
      title: p.title,
      body: p.body,
      channelId: CHANNEL_ID,
      schedule: { at: p.at, allowWhileIdle: true },
      smallIcon: 'ic_stat_kairn',
    })),
  });
}

/** Re-planification, sérialisée (jamais deux à la fois). */
export function rescheduleNow(): Promise<void> {
  chain = chain.then(applyPlan).catch((err) => console.warn('Rappels : planification impossible', err));
  return chain as Promise<void>;
}

/** Re-planification différée : regroupe les rafales (état modifié, synchro, reprise). */
export function scheduleRescheduleSoon(delayMs = 3000) {
  if (!isNative) return;
  if (replanTimer) clearTimeout(replanTimer);
  replanTimer = setTimeout(() => {
    replanTimer = null;
    void rescheduleNow();
  }, delayMs);
}

/** Met à jour la liste des cartes connues et re-planifie. */
export function updateCards(cards: ReadonlyArray<{ dueDate: string }>) {
  latestCards = cards;
  scheduleRescheduleSoon();
}

export async function updateSettings(next: ReminderSettings): Promise<void> {
  saveReminderSettings({ enabled: next.enabled, times: normalizeTimes(next.times).map(formatMinutes) });
  await rescheduleNow();
}

function formatMinutes(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
