import { useState } from 'react';
import type { Flashcard, FlashcardRating } from '../types/kairn';
import { computeSessionSummary, previewIntervals } from '../utils/srs';
import { EmptyState } from './SpecialStates';
import { Layers, CheckCircle2, RotateCcw } from './Icons';

interface ReviewsScreenProps {
  todayIso: string;
  allCards: Flashcard[];
  dueCards: Flashcard[];
  onRateCard: (cardId: string, rating: FlashcardRating) => void;
  onFinishToToday: () => void;
}

const RATINGS: Array<{
  id: FlashcardRating;
  label: string;
  toneClass: string;
}> = [
  {
    id: 'again',
    label: 'À revoir',
    toneClass:
      'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20',
  },
  {
    id: 'hard',
    label: 'Difficile',
    toneClass:
      'border-[var(--kairn-border)] bg-[var(--kairn-surface-high)] text-[var(--kairn-text)] hover:opacity-90',
  },
  {
    id: 'good',
    label: 'Bien',
    toneClass:
      'border-indigo-500/40 bg-[var(--kairn-primary-soft)] text-[var(--kairn-primary)] hover:opacity-90',
  },
  {
    id: 'easy',
    label: 'Facile',
    toneClass:
      'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20',
  },
];

export function ReviewsScreen({
  todayIso,
  allCards,
  dueCards,
  onRateCard,
  onFinishToToday,
}: ReviewsScreenProps) {
  // La file de session ne contient que des ids : les cartes viennent toujours de l'état à jour.
  const [practiceAll, setPracticeAll] = useState(false);
  const [queueIds, setQueueIds] = useState<string[]>(() => dueCards.map((c) => c.id));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionRatings, setSessionRatings] = useState<FlashcardRating[]>([]);
  const [sessionDone, setSessionDone] = useState(false);

  const cardsById = new Map(allCards.map((c) => [c.id, c]));
  const activeQueue = queueIds
    .map((id) => cardsById.get(id))
    .filter((c): c is Flashcard => c !== undefined);
  const activeCard = activeQueue[currentIndex];

  function startEarlyPractice() {
    // Révision libre : n'altère PAS le calendrier de répétition espacée.
    setPracticeAll(true);
    setQueueIds(allCards.map((c) => c.id));
    setCurrentIndex(0);
    setFlipped(false);
    setSessionRatings([]);
    setSessionDone(false);
  }

  function handleRate(rating: FlashcardRating) {
    if (!activeCard) return;
    if (!practiceAll) onRateCard(activeCard.id, rating);
    setSessionRatings((prev) => [...prev, rating]);
    setFlipped(false);

    // « À revoir » : la carte revient en fin de session (une seule fois par passage).
    let nextQueue = queueIds;
    if (rating === 'again' && !practiceAll) {
      nextQueue = [...queueIds, activeCard.id];
      setQueueIds(nextQueue);
    }

    if (currentIndex + 1 >= nextQueue.length) {
      setSessionDone(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }

  const intervalHints = activeCard ? previewIntervals(activeCard, todayIso) : null;

  if (sessionDone) {
    const summary = computeSessionSummary(sessionRatings);
    return (
      <div className="max-w-xl mx-auto py-4 space-y-6">
        <div className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-6 sm:p-8 space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-[var(--kairn-text)]">
              Session de révision terminée
            </h1>
            <p className="text-sm text-[var(--kairn-text-muted)]">
              Votre mémoire à long terme vient de se renforcer sur {summary.total} notion
              {summary.total > 1 ? 's' : ''}.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[var(--kairn-surface-high)] p-4">
              <p className="text-xs text-[var(--kairn-text-muted)]">Cartes vues</p>
              <p className="text-2xl font-bold tabular-nums text-[var(--kairn-text)] mt-1">
                {summary.total}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--kairn-surface-high)] p-4">
              <p className="text-xs text-[var(--kairn-text-muted)]">Maîtrise</p>
              <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                {summary.retentionPercent}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="rounded-xl border border-[var(--kairn-border)] p-3">
              <p className="text-xs text-[var(--kairn-text-muted)]">À revoir</p>
              <p className="text-base font-bold tabular-nums mt-0.5">{summary.counts.again}</p>
            </div>
            <div className="rounded-xl border border-[var(--kairn-border)] p-3">
              <p className="text-xs text-[var(--kairn-text-muted)]">Difficile</p>
              <p className="text-base font-bold tabular-nums mt-0.5">{summary.counts.hard}</p>
            </div>
            <div className="rounded-xl border border-[var(--kairn-border)] p-3">
              <p className="text-xs text-[var(--kairn-text-muted)]">Bien</p>
              <p className="text-base font-bold tabular-nums mt-0.5">{summary.counts.good}</p>
            </div>
            <div className="rounded-xl border border-[var(--kairn-border)] p-3">
              <p className="text-xs text-[var(--kairn-text-muted)]">Facile</p>
              <p className="text-base font-bold tabular-nums mt-0.5">{summary.counts.easy}</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={onFinishToToday}
              className="w-full min-h-[52px] px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base transition-colors cursor-pointer"
            >
              Retour à Aujourd’hui
            </button>
            <button
              type="button"
              onClick={startEarlyPractice}
              className="w-full min-h-[48px] px-6 rounded-xl border border-[var(--kairn-border)] hover:bg-[var(--kairn-surface-high)] text-[var(--kairn-text)] font-medium text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Revoir toute la pile ({allCards.length})
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (allCards.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-6">
        <EmptyState
          icon={<Layers className="w-6 h-6" aria-hidden="true" />}
          title="Aucune carte de révision pour l’instant"
          description="Les cartes apparaîtront ici au fil de tes missions. Rien à réviser aujourd’hui."
          actionLabel="Retour à Aujourd’hui"
          onAction={onFinishToToday}
        />
      </div>
    );
  }

  if (!activeCard) {
    return (
      <div className="max-w-xl mx-auto py-6">
        <EmptyState
          icon={<Layers className="w-6 h-6" aria-hidden="true" />}
          title="Toutes vos révisions sont à jour"
          description="Aucune carte n’est prévue pour aujourd’hui. Vous pouvez revenir demain ou lancer une révision libre."
          actionLabel={`Réviser quand même (${allCards.length} cartes)`}
          onAction={startEarlyPractice}
        />
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / activeQueue.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Top Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-[var(--kairn-text-muted)]">
          <span className="tabular-nums">
            Carte {currentIndex + 1} sur {activeQueue.length}
          </span>
          <span className="tabular-nums">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-[var(--kairn-surface-high)] overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-500 transition-[width] duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Full-Focus Tap-to-Flip Card */}
      <button
        type="button"
        onClick={() => setFlipped((prev) => !prev)}
        aria-label={flipped ? 'Carte retournée, appuyer pour voir la question' : 'Appuyer pour retourner la carte'}
        className="w-full min-h-[340px] sm:min-h-[380px] rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] hover:border-indigo-500/40 p-6 sm:p-8 flex flex-col justify-between text-left transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between gap-2 text-xs font-medium text-[var(--kairn-text-muted)]">
          <span>{activeCard.domainLabel}</span>
          <span>{flipped ? 'Réponse' : 'Question'}</span>
        </div>

        <div className="my-auto py-6 space-y-4">
          {!flipped ? (
            <h2 className="text-xl sm:text-2xl font-bold leading-snug text-[var(--kairn-text)] text-balance">
              {activeCard.question}
            </h2>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium text-[var(--kairn-text-muted)]">
                {activeCard.question}
              </p>
              <p className="text-lg sm:text-xl font-semibold leading-relaxed text-[var(--kairn-text)] whitespace-pre-line">
                {activeCard.answer}
              </p>
              {activeCard.example && (
                <pre className="rounded-xl bg-[var(--kairn-surface-high)] p-4 text-xs sm:text-sm font-mono text-[var(--kairn-text)] overflow-x-auto">
                  <code>{activeCard.example}</code>
                </pre>
              )}
            </div>
          )}
        </div>

        <p className="text-xs font-medium text-[var(--kairn-primary)]">
          {flipped ? 'Choisissez votre niveau de mémorisation ci-dessous' : 'Appuyer sur la carte pour retourner'}
        </p>
      </button>

      {/* Four Rating Buttons */}
      {flipped ? (
        <div
          role="group"
          aria-label="Évaluer la mémorisation de la carte"
          className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
        >
          {RATINGS.map((rating) => (
            <button
              key={rating.id}
              type="button"
              onClick={() => handleRate(rating.id)}
              className={`min-h-[56px] px-3 py-2.5 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${rating.toneClass}`}
            >
              <span className="text-sm font-semibold">{rating.label}</span>
              <span className="text-[11px] opacity-80 tabular-nums">{practiceAll ? '' : intervalHints?.[rating.id]}</span>
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setFlipped(true)}
          className="w-full min-h-[52px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base transition-colors cursor-pointer"
        >
          Voir la réponse
        </button>
      )}
    </div>
  );
}
