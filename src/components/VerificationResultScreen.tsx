import type { VerificationResult } from '../types/kairn';
import { CheckCircle2, AlertCircle, Flame, MessageSquare } from './Icons';

interface VerificationResultScreenProps {
  result: VerificationResult;
  streak: number;
  onReturnHome: () => void;
  onRetry: () => void;
  onOpenReviews: () => void;
  onAskCoach: (prompt: string) => void;
}

export function VerificationResultScreen({
  result,
  streak,
  onReturnHome,
  onRetry,
  onOpenReviews,
  onAskCoach,
}: VerificationResultScreenProps) {
  if (result.passed) {
    return (
      <div className="max-w-xl mx-auto py-4 space-y-6">
        <div className="rounded-[20px] border border-emerald-500/30 bg-[var(--kairn-surface)] p-6 sm:p-8 space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Mission validée
            </p>
            <h2 className="text-2xl font-bold text-[var(--kairn-text)] text-balance">
              Bravo, beau travail aujourd’hui !
            </h2>
            <p className="text-[15px] text-[var(--kairn-text-muted)] leading-relaxed">
              {result.feedback}
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--kairn-surface-high)] p-4 flex items-center gap-3">
            <Flame className="w-5 h-5 text-amber-500 dark:text-amber-300 shrink-0" aria-hidden="true" />
            <p className="text-sm font-medium text-[var(--kairn-text)] tabular-nums">
              Série maintenue à {streak} jours consécutifs
            </p>
          </div>

          {result.passedChecks.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-[var(--kairn-text-muted)]">
                Points validés
              </p>
              <ul className="space-y-2">
                {result.passedChecks.map((check, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--kairn-text)]">
                    <CheckCircle2
                      className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>{check}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={onReturnHome}
              className="w-full min-h-[52px] px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base transition-colors cursor-pointer"
            >
              Retour à Aujourd’hui
            </button>
            <button
              type="button"
              onClick={onOpenReviews}
              className="w-full min-h-[48px] px-6 rounded-xl border border-[var(--kairn-border)] hover:bg-[var(--kairn-surface-high)] text-[var(--kairn-text)] font-medium text-sm transition-colors cursor-pointer"
            >
              Passer aux révisions
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-4 space-y-6">
      <div className="rounded-[20px] border border-amber-500/30 bg-[var(--kairn-surface)] p-6 sm:p-8 space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-300">
          <AlertCircle className="w-8 h-8" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-300">
            À peaufiner
          </p>
          <h2 className="text-2xl font-bold text-[var(--kairn-text)] text-balance">
            Presque ! Il manque encore un petit détail
          </h2>
          <p className="text-[15px] text-[var(--kairn-text-muted)] leading-relaxed">
            {result.feedback}
          </p>
        </div>

        {result.passedChecks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--kairn-text-muted)]">Déjà acquis</p>
            <ul className="space-y-1.5">
              {result.passedChecks.map((check, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--kairn-text)]">
                  <CheckCircle2
                    className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{check}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.missingItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--kairn-text-muted)]">À compléter</p>
            <ul className="space-y-2">
              {result.missingItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--kairn-text)]">
                  <AlertCircle
                    className="w-4 h-4 text-amber-500 dark:text-amber-300 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.hint && (
          <div className="rounded-2xl bg-[var(--kairn-surface-high)] p-4 space-y-1">
            <p className="text-xs font-semibold text-[var(--kairn-primary)]">Petit indice</p>
            <p className="text-sm text-[var(--kairn-text)] leading-relaxed">{result.hint}</p>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={onRetry}
            className="w-full min-h-[52px] px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base transition-colors cursor-pointer"
          >
            Réessayer
          </button>
          <button
            type="button"
            onClick={() =>
              onAskCoach(
                `Ma vérification indique qu'il manque : ${result.missingItems.join(' ; ')}. Peux-tu m'expliquer comment corriger ?`
              )
            }
            className="w-full min-h-[48px] px-6 rounded-xl border border-[var(--kairn-border)] hover:bg-[var(--kairn-surface-high)] text-[var(--kairn-text)] font-medium text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
            Expliquer avec le Coach IA
          </button>
        </div>
      </div>
    </div>
  );
}
