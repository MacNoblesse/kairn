/**
 * Planification PURE des rappels de révision (aucune dépendance Capacitor : testable avec node:test).
 *
 * Règles garanties par ce module :
 *  - au plus MAX_PER_DAY (2) rappels par jour calendaire local ;
 *  - jamais pendant les heures calmes 23:00 → 05:00 ;
 *  - jamais dans le passé ;
 *  - un rappel seulement si au moins une carte est due ce jour-là ;
 *  - horizon limité à HORIZON_DAYS jours (re-planifié à chaque ouverture / synchro / révision).
 */

export const MAX_PER_DAY = 2;
export const HORIZON_DAYS = 7;
export const QUIET_START_MIN = 23 * 60; // 23:00
export const QUIET_END_MIN = 5 * 60; // 05:00
export const DEFAULT_TIMES = ['09:00', '19:00'];

export interface ReminderSettings {
  enabled: boolean;
  /** Heures locales « HH:MM », 2 maximum. */
  times: string[];
}

export interface PlannedReminder {
  id: number;
  at: Date;
  title: string;
  body: string;
}

export function defaultReminderSettings(): ReminderSettings {
  return { enabled: false, times: [...DEFAULT_TIMES] };
}

export function isQuietMinute(minuteOfDay: number): boolean {
  return minuteOfDay >= QUIET_START_MIN || minuteOfDay < QUIET_END_MIN;
}

function parseTime(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Heures valides, hors heures calmes (ramenées à 05:00 si besoin), sans doublon, 2 maximum. */
export function normalizeTimes(times: string[]): number[] {
  const out = new Set<number>();
  for (const t of times) {
    const minutes = parseTime(t);
    if (minutes === null) continue;
    out.add(isQuietMinute(minutes) ? QUIET_END_MIN : minutes);
  }
  return [...out].sort((a, b) => a - b).slice(0, MAX_PER_DAY);
}

export function isoOfLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function plural(n: number, one: string, many: string): string {
  return n > 1 ? many : one;
}

export function planReminders(
  cards: ReadonlyArray<{ dueDate: string }>,
  now: Date,
  settings: ReminderSettings
): PlannedReminder[] {
  if (!settings.enabled) return [];
  const slots = normalizeTimes(settings.times);
  const planned: PlannedReminder[] = [];

  for (let offset = 0; offset < HORIZON_DAYS; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const dayIso = isoOfLocalDate(day);
    // Une carte non révisée reste due les jours suivants (cumul).
    const dueCount = cards.filter((c) => c.dueDate <= dayIso).length;
    if (dueCount === 0) continue;

    const epochDay = Math.floor(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) / 86_400_000);
    slots.forEach((minutes, slotIndex) => {
      const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes);
      if (at.getTime() <= now.getTime() + 60_000) return; // passé ou imminent
      const cardsLabel = `${dueCount} ${plural(dueCount, 'carte', 'cartes')}`;
      planned.push({
        id: epochDay * 10 + slotIndex,
        at,
        title: 'Kairn · révisions',
        body:
          slotIndex === 0
            ? `${cardsLabel} ${plural(dueCount, 'prête', 'prêtes')} à réviser. Quelques minutes suffisent.`
            : `Il reste ${cardsLabel} à réviser aujourd’hui.`,
      });
    });
  }
  return planned;
}
