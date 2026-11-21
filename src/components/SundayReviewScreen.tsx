import { useState } from 'react';
import type { WeeklyReview } from '../types/kairn';
import { CheckCircle2, Plus } from './Icons';

interface SundayReviewScreenProps {
  defaultWins: string[];
  onSaveReview: (review: WeeklyReview) => void;
  onBackToToday: () => void;
}

const PRESET_BLOCKERS = [
  'Manque de temps certains soirs',
  'Une notion technique restée floue',
  'Fatigue ou baisse d’énergie',
  'Dispersion sur d’autres sujets',
];

const PRESET_GOALS = [
  'Tenir 5 sessions (même en mode Mini 20 min)',
  'Maîtriser les bonnes pratiques Docker & K8s',
  'Faire 2 candidatures DevOps / Cloud',
  'Pratiquer 10 min d’anglais technique oral',
  'Réviser toutes les cartes SRS à jour',
];

export function SundayReviewScreen({
  defaultWins,
  onSaveReview,
  onBackToToday,
}: SundayReviewScreenProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [wins, setWins] = useState<string[]>(
    defaultWins.length > 0
      ? defaultWins
      : ['J’ai pris le temps de pratiquer régulièrement cette semaine']
  );
  const [customWin, setCustomWin] = useState('');

  const [selectedBlockers, setSelectedBlockers] = useState<string[]>([]);
  const [customBlocker, setCustomBlocker] = useState('');

  const [selectedGoals, setSelectedGoals] = useState<string[]>([
    PRESET_GOALS[0],
    PRESET_GOALS[1],
  ]);

  function addCustomWin() {
    const trimmed = customWin.trim();
    if (!trimmed) return;
    setWins((prev) => [...prev, trimmed]);
    setCustomWin('');
  }

  function toggleBlocker(item: string) {
    setSelectedBlockers((prev) =>
      prev.includes(item) ? prev.filter((b) => b !== item) : [...prev, item]
    );
  }

  function toggleGoal(goal: string) {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }

  function handleFinish() {
    const blockers = [...selectedBlockers];
    if (customBlocker.trim()) blockers.push(customBlocker.trim());

    onSaveReview({
      id: `rev-${Date.now()}`,
      weekLabel: 'Cette semaine',
      wins,
      blockers: blockers.length > 0 ? blockers : ['Aucun blocage majeur signalé'],
      nextGoals: selectedGoals.length > 0 ? selectedGoals : [PRESET_GOALS[0]],
      completedAt: new Date().toISOString().slice(0, 10),
    });
    setStep(4);
  }

  if (step === 4) {
    return (
      <div className="max-w-xl mx-auto py-4">
        <div className="rounded-[20px] border border-emerald-500/30 bg-[var(--kairn-surface)] p-6 sm:p-8 space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[var(--kairn-text)]">
              Revue du dimanche enregistrée
            </h2>
            <p className="text-sm text-[var(--kairn-text-muted)] leading-relaxed">
              Votre semaine est clôturée sereinement. Vos {selectedGoals.length} objectifs pour la
              semaine prochaine sont prêts.
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToToday}
            className="w-full min-h-[52px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base transition-colors cursor-pointer"
          >
            Retour à Aujourd’hui
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Step Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-[var(--kairn-text-muted)]">
          <span>Étape {step} sur 3</span>
          <span>
            {step === 1 ? 'Réussites' : step === 2 ? 'Blocages' : 'Objectifs'}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-[var(--kairn-surface-high)] overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-500 transition-[width] duration-200"
            style={{ width: `${Math.round((step / 3) * 100)}%` }}
          />
        </div>
      </div>

      {step === 1 && (
        <div className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-6 space-y-5">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-[var(--kairn-text)]">
              Vos réussites d’abord
            </h2>
            <p className="text-sm text-[var(--kairn-text-muted)]">
              Prenez un moment pour reconnaître ce que vous avez accompli cette semaine.
            </p>
          </div>

          <ul className="space-y-2">
            {wins.map((win, idx) => (
              <li
                key={idx}
                className="rounded-xl bg-[var(--kairn-surface-high)] px-4 py-3 text-sm text-[var(--kairn-text)] flex items-start gap-2.5"
              >
                <CheckCircle2
                  className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>{win}</span>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <input
              type="text"
              value={customWin}
              onChange={(e) => setCustomWin(e.target.value)}
              placeholder="Ajouter une autre victoire..."
              aria-label="Ajouter une victoire personnelle"
              className="flex-1 min-h-[48px] px-4 rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface-low)] text-sm text-[var(--kairn-text)] placeholder:text-[var(--kairn-text-muted)]"
            />
            <button
              type="button"
              onClick={addCustomWin}
              aria-label="Ajouter cette victoire"
              className="min-w-[48px] min-h-[48px] rounded-xl bg-[var(--kairn-surface-high)] hover:opacity-90 flex items-center justify-center text-[var(--kairn-text)] cursor-pointer"
            >
              <Plus className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full min-h-[52px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base transition-colors cursor-pointer"
          >
            Continuer vers les blocages
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-6 space-y-5">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-[var(--kairn-text)]">
              Qu’est-ce qui vous a freiné ?
            </h2>
            <p className="text-sm text-[var(--kairn-text-muted)]">
              Sans jugement : identifier les frictions aide à ajuster le rythme.
            </p>
          </div>

          <div className="space-y-2">
            {PRESET_BLOCKERS.map((b) => {
              const active = selectedBlockers.includes(b);
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => toggleBlocker(b)}
                  aria-pressed={active}
                  className={`w-full min-h-[48px] px-4 py-3 rounded-xl border text-left text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'border-indigo-500/60 bg-[var(--kairn-primary-soft)] text-[var(--kairn-text)]'
                      : 'border-[var(--kairn-border)] bg-[var(--kairn-surface-low)] text-[var(--kairn-text-muted)]'
                  }`}
                >
                  {b}
                </button>
              );
            })}
          </div>

          <textarea
            rows={2}
            value={customBlocker}
            onChange={(e) => setCustomBlocker(e.target.value)}
            placeholder="Note libre (optionnel)..."
            aria-label="Note libre sur vos blocages"
            className="w-full rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface-low)] p-3.5 text-sm text-[var(--kairn-text)] placeholder:text-[var(--kairn-text-muted)]"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="min-h-[48px] px-5 rounded-xl border border-[var(--kairn-border)] text-sm font-medium text-[var(--kairn-text)] cursor-pointer"
            >
              Retour
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 min-h-[52px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base transition-colors cursor-pointer"
            >
              Choisir les objectifs
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-6 space-y-5">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-[var(--kairn-text)]">
              Objectifs pour la semaine prochaine
            </h2>
            <p className="text-sm text-[var(--kairn-text-muted)]">
              Sélectionnez 2 ou 3 caps réalistes et motivants.
            </p>
          </div>

          <div className="space-y-2">
            {PRESET_GOALS.map((goal) => {
              const active = selectedGoals.includes(goal);
              return (
                <button
                  key={goal}
                  type="button"
                  onClick={() => toggleGoal(goal)}
                  aria-pressed={active}
                  className={`w-full min-h-[48px] px-4 py-3 rounded-xl border text-left text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-[var(--kairn-text)]'
                      : 'border-[var(--kairn-border)] bg-[var(--kairn-surface-low)] text-[var(--kairn-text-muted)]'
                  }`}
                >
                  {goal}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="min-h-[48px] px-5 rounded-xl border border-[var(--kairn-border)] text-sm font-medium text-[var(--kairn-text)] cursor-pointer"
            >
              Retour
            </button>
            <button
              type="button"
              onClick={handleFinish}
              className="flex-1 min-h-[52px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base transition-colors cursor-pointer"
            >
              Valider ma revue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
