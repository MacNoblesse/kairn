import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterMissionHistory,
  formatTimerSeconds,
  getFrenchGreeting,
  getStepsForLevel,
  shouldShowComebackScreen,
  shouldSuggestMiniMode,
  upsertTodayMissionHistory,
  verifyMissionLocally,
} from './coachLogic';
import fs from 'node:fs';
import path from 'node:path';
import { parseMissionsInput } from './missionImporter';
import type { MissionHistoryEntry } from '../types/kairn';

// Mission réelle du programme (S1-M1) : plus aucune donnée de démonstration.
const REAL_MISSION = parseMissionsInput(
  fs.readFileSync(
    path.resolve(process.cwd(), 'public/assets/aistudio/missions_all_f7e3203a.json'),
    'utf-8'
  )
).missions.find((m) => m.id === 'S1-M1')!;

test('getFrenchGreeting adapts to hour of day', () => {
  assert.equal(getFrenchGreeting(9, 'Léa'), 'Bonjour, Léa');
  assert.equal(getFrenchGreeting(15, 'Léa'), 'Bon après-midi, Léa');
  assert.equal(getFrenchGreeting(21, 'Léa'), 'Bonsoir, Léa');
});

test('getFrenchGreeting sans prénom n’invente aucun nom', () => {
  assert.equal(getFrenchGreeting(9, ''), 'Bonjour');
  assert.equal(getFrenchGreeting(21, '   '), 'Bonsoir');
});

test('getStepsForLevel scales step count for mini, normal, and plus', () => {
  const miniSteps = getStepsForLevel(REAL_MISSION.steps, 'mini');
  const normalSteps = getStepsForLevel(REAL_MISSION.steps, 'normal');
  const plusSteps = getStepsForLevel(REAL_MISSION.steps, 'plus');

  assert.equal(miniSteps.length, 1);
  assert.equal(normalSteps.length, 4);
  assert.equal(plusSteps.length, 5);
});

test('shouldSuggestMiniMode and shouldShowComebackScreen behave predictably', () => {
  assert.equal(shouldSuggestMiniMode('low'), true);
  assert.equal(shouldSuggestMiniMode('calm'), false);

  assert.equal(shouldShowComebackScreen(3, null, '2026-11-20', false), true);
  assert.equal(shouldShowComebackScreen(3, '2026-11-20', '2026-11-20', false), false);
  assert.equal(shouldShowComebackScreen(0, '2026-11-20', '2026-11-20', true), true);
});

test('formatTimerSeconds caps at 20 minutes and pads digits', () => {
  assert.equal(formatTimerSeconds(25 * 60), '20:00');
  assert.equal(formatTimerSeconds(65), '01:05');
  assert.equal(formatTimerSeconds(-5), '00:00');
});

test('verifyMissionLocally validates complete steps and keywords', () => {
  const miniSteps = getStepsForLevel(REAL_MISSION.steps, 'mini').map((s) => s.id);
  const failRes = verifyMissionLocally(REAL_MISSION, 'mini', [], 'x');
  assert.equal(failRes.passed, false);
  assert.ok(failRes.missingItems.length > 0);

  const passRes = verifyMissionLocally(
    REAL_MISSION,
    'mini',
    miniSteps,
    REAL_MISSION.sampleSolution
  );
  assert.equal(passRes.passed, true);
  assert.equal(passRes.missingItems.length, 0);
});

test('filterMissionHistory and upsertTodayMissionHistory work cleanly', () => {
  const sampleHistory: MissionHistoryEntry[] = [
    {
      id: 'h1',
      date: '2026-11-19',
      title: 'Pipeline CI',
      domain: 'devops',
      domainLabel: 'DevOps',
      level: 'normal',
      durationMinutes: 35,
      status: 'completed',
      objective: 'Test',
      stepsDone: ['S1'],
      notesOrSubmission: 'ok',
      takeaways: ['t1'],
    },
    {
      id: 'h2',
      date: '2026-11-18',
      title: 'Terraform State',
      domain: 'cloud',
      domainLabel: 'Cloud',
      level: 'mini',
      durationMinutes: 20,
      status: 'partial',
      objective: 'Test',
      stepsDone: [],
      notesOrSubmission: '',
      takeaways: [],
    },
  ];

  assert.equal(filterMissionHistory(sampleHistory, 'devops', 'all').length, 1);
  assert.equal(filterMissionHistory(sampleHistory, 'all', 'partial').length, 1);

  const updated = upsertTodayMissionHistory(sampleHistory, {
    ...sampleHistory[0],
    id: 'today-1',
    date: '2026-11-20',
    title: 'Dockerfile multi-stage',
  });
  assert.equal(updated.length, 3);
  assert.equal(updated[0].id, 'today-1');

  const deduplicated = upsertTodayMissionHistory(updated, {
    ...sampleHistory[0],
    id: 'today-1',
    date: '2026-11-20',
    title: 'Dockerfile multi-stage v2',
  });
  assert.equal(deduplicated.length, 3);
  assert.equal(deduplicated[0].title, 'Dockerfile multi-stage v2');
});
