import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mergeImportedCurriculum, parseMissionsInput } from './missionImporter';
import {
  addMissionFlashcards,
  backfillCompletedMissionFlashcards,
  buildMissionFlashcards,
} from './flashcardGenerator';

const raw = fs.readFileSync('public/assets/aistudio/missions_all_f7e3203a.json', 'utf8');
const { missions } = mergeImportedCurriculum([], [], '', parseMissionsInput(raw));
const s1m1 = missions.find((m) => m.id === 'S1-M1')!;

test('S1-M1 : cartes construites à partir des vraies données de la mission', () => {
  const cards = buildMissionFlashcards(s1m1, '2026-11-21');
  assert.equal(cards.length, s1m1.flashcardsTarget);
  assert.equal(cards[0].id, 'S1-M1-fc-1');
  assert.equal(cards[0].answer, '(Get-ADDomain).DNSRoot');
  assert.match(cards[0].example ?? '', /entreprise\.lab\.test/);
  assert.ok(cards.every((c) => c.question && c.answer));
  assert.ok(cards.every((c) => c.dueDate === '2026-11-22' && c.repetitions === 0));
  assert.ok(cards.every((c) => c.missionId === 'S1-M1'));
});

test('chaque mission du programme produit au moins une carte valide et des ids uniques', () => {
  const ids = new Set<string>();
  for (const m of missions) {
    const cards = buildMissionFlashcards(m, '2026-11-21');
    assert.ok(cards.length >= 1, `${m.id} sans carte`);
    for (const c of cards) {
      assert.ok(c.question.trim() && c.answer.trim(), `${m.id} carte vide`);
      assert.ok(!ids.has(c.id), `id en double ${c.id}`);
      ids.add(c.id);
    }
  }
});

test('addMissionFlashcards est idempotent et garde la progression existante', () => {
  const first = addMissionFlashcards([], s1m1, '2026-11-21');
  const progressed = first.map((c, i) => (i === 0 ? { ...c, repetitions: 4, intervalDays: 9 } : c));
  const again = addMissionFlashcards(progressed, s1m1, '2026-11-25');
  assert.equal(again.length, first.length);
  assert.equal(again[0].repetitions, 4);
});

test('backfill ne crée des cartes que pour les missions validées sans carte', () => {
  const s1m2 = missions.find((m) => m.id === 'S1-M2')!;
  const existing = addMissionFlashcards([], s1m1, '2026-11-21');
  const out = backfillCompletedMissionFlashcards(existing, missions, ['S1-M1', 'S1-M2'], '2026-11-21');
  assert.ok(out.some((c) => c.missionId === 'S1-M2'));
  assert.equal(out.filter((c) => c.missionId === 'S1-M1').length, existing.length);
  assert.equal(backfillCompletedMissionFlashcards([], missions, [], '2026-11-21').length, 0);
  assert.ok(s1m2);
});
