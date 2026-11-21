import type { Flashcard, FlashcardRating } from '../types/kairn';

export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, '0');
  const nd = String(date.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

export function getDueFlashcards(cards: Flashcard[], todayIso: string): Flashcard[] {
  return cards
    .filter((card) => card.dueDate <= todayIso)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
}

/** Libellé court d'un intervalle (« Aujourd'hui », « 3 jours », « 2 sem. »). */
export function formatIntervalDays(days: number): string {
  if (days <= 0) return 'Aujourd’hui';
  if (days === 1) return '1 jour';
  if (days < 14) return `${days} jours`;
  if (days < 60) return `${Math.round(days / 7)} sem.`;
  return `${Math.round(days / 30)} mois`;
}

/** Intervalle réel que produirait chaque note pour cette carte (affiché sur les boutons). */
export function previewIntervals(
  card: Flashcard,
  todayIso: string
): Record<FlashcardRating, string> {
  const ratings: FlashcardRating[] = ['again', 'hard', 'good', 'easy'];
  const out = {} as Record<FlashcardRating, string>;
  for (const r of ratings) out[r] = formatIntervalDays(scheduleFlashcard(card, r, todayIso).intervalDays);
  return out;
}

export function scheduleFlashcard(
  card: Flashcard,
  rating: FlashcardRating,
  todayIso: string
): Flashcard {
  let { repetitions, intervalDays, easeFactor } = card;

  if (rating === 'again') {
    repetitions = 0;
    intervalDays = 0; // Due again immediately in same day / session
    easeFactor = Math.max(1.3, Number((easeFactor - 0.2).toFixed(2)));
  } else if (rating === 'hard') {
    repetitions = Math.max(1, repetitions);
    intervalDays = Math.max(1, Math.round(Math.max(1, intervalDays) * 1.2));
    easeFactor = Math.max(1.3, Number((easeFactor - 0.1).toFixed(2)));
  } else if (rating === 'good') {
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 3;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitions += 1;
  } else {
    // easy
    if (repetitions === 0) {
      intervalDays = 4;
    } else {
      intervalDays = Math.max(4, Math.round(intervalDays * easeFactor * 1.3));
    }
    repetitions += 1;
    easeFactor = Number((easeFactor + 0.1).toFixed(2));
  }

  return {
    ...card,
    repetitions,
    intervalDays,
    easeFactor,
    dueDate: intervalDays === 0 ? todayIso : addDaysIso(todayIso, intervalDays),
  };
}

export function computeSessionSummary(ratings: FlashcardRating[]) {
  const counts: Record<FlashcardRating, number> = {
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  };
  for (const r of ratings) {
    counts[r] += 1;
  }
  const total = ratings.length;
  const retained = counts.good + counts.easy + counts.hard;
  const retentionPercent = total === 0 ? 100 : Math.round((retained / total) * 100);
  return {
    total,
    counts,
    retentionPercent,
  };
}
