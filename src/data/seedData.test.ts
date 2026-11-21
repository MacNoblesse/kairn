import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyActivity, createInitialState, rollActivityHistory } from './seedData';

test('createInitialState ne contient aucune donnée de démonstration', () => {
  const s = createInitialState();
  assert.equal(s.profile.name, '');
  assert.equal(s.streak, 0);
  assert.equal(s.bestStreak, 0);
  assert.equal(s.flashcards.length, 0);
  assert.equal(s.missionHistory.length, 0);
  assert.equal(s.applications.length, 0);
  assert.equal(s.runbooks.length, 0);
  assert.equal(s.laterIdeas.length, 0);
  assert.equal(s.weeklyReviews.length, 0);
  assert.equal(s.bonusTasks.length, 0);
  assert.equal(s.linkedinDraft, '');
  assert.equal(s.importedMissions.length, 0);
  assert.ok(s.activityHistory.every((d) => d.count === 0 && d.missionsDone === 0));
  assert.ok(s.skills.every((k) => k.cellsFilled === 0));
});

test('rollActivityHistory conserve les jours connus et termine aujourd’hui', () => {
  const old = createEmptyActivity('2026-11-18').map((d) =>
    d.date === '2026-11-18' ? { ...d, count: 3, missionsDone: 1 } : d
  );
  const rolled = rollActivityHistory(old, '2026-11-21');
  assert.equal(rolled.length, 49);
  assert.equal(rolled[rolled.length - 1].date, '2026-11-21');
  assert.equal(rolled.find((d) => d.date === '2026-11-18')?.missionsDone, 1);
});
