import { useEffect, useState } from 'react';
import { isNative } from '../native/platform';
import {
  getPermissionState,
  loadReminderSettings,
  requestPermission,
  updateSettings,
  type PermissionState,
} from '../native/reminders';
import { isQuietMinute } from '../native/reminderPlan';

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Réglages des rappels de révision. N'apparaît que dans l'APK Android. */
export function RemindersSection() {
  const [settings, setSettings] = useState(loadReminderSettings);
  const [permission, setPermission] = useState<PermissionState>('prompt');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getPermissionState().then(setPermission);
  }, []);

  if (!isNative) return null;

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (!settings.enabled) {
        let state = await getPermissionState();
        if (state !== 'granted') state = await requestPermission();
        setPermission(state);
        if (state !== 'granted') return;
      }
      const next = { ...settings, enabled: !settings.enabled };
      setSettings(next);
      await updateSettings(next);
    } finally {
      setBusy(false);
    }
  }

  async function changeTime(index: number, value: string) {
    if (!value) return;
    const times = [...settings.times];
    times[index] = value;
    const next = { ...settings, times };
    setSettings(next);
    await updateSettings(next);
  }

  const quietWarning = settings.times.some((t) => t && isQuietMinute(toMinutes(t)));

  return (
    <section className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 sm:p-6 space-y-4">
      <h2 className="text-base font-semibold text-[var(--kairn-text)]">Rappels de révision</h2>
      <p className="text-sm text-[var(--kairn-text-muted)] leading-relaxed">
        Au plus 2 notifications par jour, uniquement s’il y a des cartes à réviser, jamais entre 23 h
        et 5 h. L’heure peut varier de quelques minutes selon l’économie d’énergie d’Android.
      </p>

      <button
        type="button"
        role="switch"
        aria-checked={settings.enabled}
        onClick={toggle}
        disabled={busy}
        className="w-full min-h-[48px] px-4 rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface-low)] text-sm font-medium text-[var(--kairn-text)] flex items-center justify-between cursor-pointer"
      >
        <span>Activer les rappels</span>
        <span className={settings.enabled ? 'text-[var(--kairn-primary)] font-semibold' : 'text-[var(--kairn-text-muted)]'}>
          {settings.enabled ? 'Activés' : 'Désactivés'}
        </span>
      </button>

      {permission === 'denied' && (
        <p role="status" className="text-sm text-amber-700 dark:text-amber-300">
          Les notifications sont refusées pour Kairn. Autorisez-les dans Paramètres Android → Applications → Kairn → Notifications.
        </p>
      )}

      {settings.enabled && (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2">
              <label htmlFor={`reminder-time-${i}`} className="text-xs font-medium text-[var(--kairn-text-muted)]">
                {i === 0 ? 'Matin' : 'Soir'}
              </label>
              <input
                id={`reminder-time-${i}`}
                type="time"
                value={settings.times[i] ?? ''}
                onChange={(e) => void changeTime(i, e.target.value)}
                className="w-full min-h-[48px] px-4 rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface-low)] text-sm text-[var(--kairn-text)]"
              />
            </div>
          ))}
        </div>
      )}
      {settings.enabled && quietWarning && (
        <p className="text-xs text-[var(--kairn-text-muted)]">
          Une heure tombe dans les heures calmes (23 h–5 h) : elle sera ramenée à 5 h.
        </p>
      )}
    </section>
  );
}
