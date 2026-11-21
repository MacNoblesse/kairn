import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HORIZON_DAYS,
  MAX_PER_DAY,
  defaultReminderSettings,
  isoOfLocalDate,
  isQuietMinute,
  normalizeTimes,
  planReminders,
} from './reminderPlan';

const on = (times?: string[]) => ({ ...defaultReminderSettings(), enabled: true, ...(times ? { times } : {}) });
const NOW = new Date(2026, 10, 21, 8, 0); // sam. 21/11/2026 08:00 local
const dueOn = (iso: string, n = 3) => Array.from({ length: n }, () => ({ dueDate: iso }));

test('désactivé : aucun rappel', () => {
  assert.deepEqual(planReminders(dueOn('2026-11-20'), NOW, defaultReminderSettings()), []);
});

test('aucune carte due : aucun rappel', () => {
  assert.deepEqual(planReminders([], NOW, on()), []);
  assert.deepEqual(planReminders([{ dueDate: '2027-02-01' }], NOW, on()), []);
});

test('jamais plus de 2 rappels par jour, même si 5 heures sont demandées', () => {
  const plan = planReminders(dueOn('2026-11-20'), NOW, on(['07:00', '09:00', '12:00', '15:00', '19:00']));
  const perDay = new Map<string, number>();
  for (const p of plan) perDay.set(isoOfLocalDate(p.at), (perDay.get(isoOfLocalDate(p.at)) ?? 0) + 1);
  assert.ok(plan.length > 0);
  assert.ok([...perDay.values()].every((n) => n <= MAX_PER_DAY));
});

test('heures calmes 23:00-05:00 : aucun rappel, heures ramenées à 05:00', () => {
  const plan = planReminders(dueOn('2026-11-20'), NOW, on(['23:30', '02:15']));
  assert.ok(plan.length > 0);
  assert.ok(plan.every((p) => !isQuietMinute(p.at.getHours() * 60 + p.at.getMinutes())));
  assert.deepEqual(normalizeTimes(['23:00', '04:59', '05:00']), [300]);
  assert.equal(isQuietMinute(22 * 60 + 59), false);
  assert.equal(isQuietMinute(23 * 60), true);
  assert.equal(isQuietMinute(5 * 60), false);
});

test('jamais dans le passé : à 08:00, seul le créneau de 19:00 reste pour aujourd’hui', () => {
  const plan = planReminders(dueOn('2026-11-20'), NOW, on(['07:00', '19:00']));
  const today = plan.filter((p) => isoOfLocalDate(p.at) === '2026-11-21');
  assert.equal(today.length, 1);
  assert.equal(today[0].at.getHours(), 19);
  assert.ok(plan.every((p) => p.at.getTime() > NOW.getTime()));
});

test('horizon de 7 jours, ids uniques', () => {
  const plan = planReminders(dueOn('2026-11-20'), new Date(2026, 10, 21, 0, 0), on());
  assert.equal(plan.length, HORIZON_DAYS * 2);
  assert.equal(new Set(plan.map((p) => p.id)).size, plan.length);
  assert.ok(plan.every((p) => p.id < 2 ** 31));
});

test('une carte due demain ne déclenche rien aujourd’hui, mais demain oui', () => {
  const plan = planReminders(dueOn('2026-11-22', 1), NOW, on());
  assert.ok(plan.length > 0);
  assert.ok(plan.every((p) => isoOfLocalDate(p.at) >= '2026-11-22'));
  assert.match(plan[0].body, /^1 carte prête/);
});

test('heures invalides ignorées ; si tout est invalide, aucun rappel', () => {
  assert.deepEqual(normalizeTimes(['25:00', 'abc', '']), []);
  assert.deepEqual(planReminders(dueOn('2026-11-20'), NOW, on(['25:00'])), []);
});
