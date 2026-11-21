import test from 'node:test';
import assert from 'node:assert/strict';
import { addDaysIso, getDueFlashcards, scheduleFlashcard, computeSessionSummary, previewIntervals } from './srs';
import type { Flashcard } from '../types/kairn';

const sampleCard: Flashcard = {
  id: 'c1',
  domain: 'devops',
  domainLabel: 'DevOps',
  question: 'Question ?',
  answer: 'Réponse.',
  intervalDays: 1,
  easeFactor: 2.5,
  repetitions: 1,
  dueDate: '2026-11-20',
};

test('addDaysIso advances calendar date cleanly across months', () => {
  assert.equal(addDaysIso('2026-11-29', 3), '2026-12-02');
});

test('getDueFlashcards returns only cards due on or before today', () => {
  const cards: Flashcard[] = [
    sampleCard,
    { ...sampleCard, id: 'c2', dueDate: '2026-11-19' },
    { ...sampleCard, id: 'c3', dueDate: '2026-11-25' },
  ];
  const due = getDueFlashcards(cards, '2026-11-20');
  assert.deepEqual(
    due.map((c) => c.id),
    ['c2', 'c1'] // triées : la plus en retard d'abord
  );
});

test('scheduleFlashcard resets repetitions on again and increases interval on good/easy', () => {
  const again = scheduleFlashcard(sampleCard, 'again', '2026-11-20');
  assert.equal(again.repetitions, 0);
  assert.equal(again.intervalDays, 0);
  assert.equal(again.dueDate, '2026-11-20');

  const good = scheduleFlashcard(sampleCard, 'good', '2026-11-20');
  assert.equal(good.repetitions, 2);
  assert.equal(good.intervalDays, 3);
  assert.equal(good.dueDate, '2026-11-23');

  const easy = scheduleFlashcard(sampleCard, 'easy', '2026-11-20');
  assert.equal(easy.repetitions, 2);
  assert.ok(easy.intervalDays >= 4);
  assert.ok(easy.easeFactor > sampleCard.easeFactor);
});

test('computeSessionSummary aggregates counts and retention rate', () => {
  const summary = computeSessionSummary(['good', 'easy', 'again', 'hard']);
  assert.equal(summary.total, 4);
  assert.equal(summary.counts.good, 1);
  assert.equal(summary.counts.again, 1);
  assert.equal(summary.retentionPercent, 75);
});

test('previewIntervals reflète le vrai intervalle de chaque note pour la carte', () => {
  const card = { ...sampleCard, repetitions: 3, intervalDays: 10, easeFactor: 2.5 };
  const p = previewIntervals(card, '2026-11-20');
  assert.equal(p.again, 'Aujourd’hui');
  assert.equal(p.good, '4 sem.'); // 10 × 2.5 = 25 j ≈ 4 semaines
  assert.notEqual(p.good, '3 jours');
});

test('getDueFlashcards trie les plus en retard d’abord', () => {
  const due = getDueFlashcards(
    [
      { ...sampleCard, id: 'b', dueDate: '2026-11-20' },
      { ...sampleCard, id: 'a', dueDate: '2026-11-10' },
    ],
    '2026-11-20'
  );
  assert.deepEqual(due.map((c) => c.id), ['a', 'b']);
});
