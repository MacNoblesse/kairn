import type { ReactNode } from 'react';
import { WifiOff, HeartHandshake, CheckCircle2 } from './Icons';

export function OfflineBanner({ onDisablePreview }: { onDisablePreview?: () => void }) {
  return (
    <div
      role="status"
      className="w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-3 min-w-0">
        <WifiOff className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
        <p className="truncate font-medium">
          Hors ligne · Révisions et fiches restent disponibles
        </p>
      </div>
      {onDisablePreview && (
        <button
          type="button"
          onClick={onDisablePreview}
          className="text-xs font-semibold underline underline-offset-2 shrink-0 min-h-[36px] px-2 cursor-pointer"
        >
          Quitter aperçu
        </button>
      )}
    </div>
  );
}

export function LoadingSkeleton({ label = 'Chargement en cours...' }: { label?: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="space-y-4 animate-pulse">
      <div className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-6 space-y-4">
        <div className="h-3 w-36 rounded-md bg-[var(--kairn-surface-high)]" />
        <div className="h-6 w-3/4 rounded-md bg-[var(--kairn-surface-high)]" />
        <div className="h-4 w-full rounded-md bg-[var(--kairn-surface-high)]" />
        <div className="h-4 w-5/6 rounded-md bg-[var(--kairn-surface-high)]" />
        <div className="h-12 w-full rounded-xl bg-[var(--kairn-surface-high)] mt-2" />
      </div>
      <div className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 space-y-3">
        <div className="h-4 w-1/3 rounded-md bg-[var(--kairn-surface-high)]" />
        <div className="h-10 w-full rounded-xl bg-[var(--kairn-surface-high)]" />
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] px-6 py-10 text-center space-y-4">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-[var(--kairn-surface-high)] flex items-center justify-center text-[var(--kairn-primary)]">
        {icon || <CheckCircle2 className="w-6 h-6" aria-hidden="true" />}
      </div>
      <div className="space-y-1.5 max-w-sm mx-auto">
        <h3 className="text-base font-semibold text-[var(--kairn-text)]">{title}</h3>
        <p className="text-sm text-[var(--kairn-text-muted)] leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-xl bg-[var(--kairn-primary-soft)] text-[var(--kairn-primary)] text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ComebackScreen({
  studentName,
  missedDays,
  onStartMini,
  onResumeNormal,
}: {
  studentName: string;
  missedDays: number;
  onStartMini: () => void;
  onResumeNormal: () => void;
}) {
  return (
    <div className="max-w-lg mx-auto py-6 space-y-6">
      <div className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-6 sm:p-8 space-y-6">
        <div className="w-12 h-12 rounded-2xl bg-[var(--kairn-primary-soft)] flex items-center justify-center text-[var(--kairn-primary)]">
          <HeartHandshake className="w-6 h-6" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--kairn-text-muted)]">
            Retour en douceur · {missedDays > 0 ? `${missedDays} jours de pause` : 'Reprise calme'}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--kairn-text)] text-balance">
            Content de vous retrouver{studentName.trim() ? `, ${studentName.trim()}` : ''}
          </h1>
          <p className="text-[15px] leading-relaxed text-[var(--kairn-text-muted)]">
            Aucune pression pour rattraper les jours passés. L’essentiel est simplement de poser
            une petite pierre aujourd’hui, à votre rythme.
          </p>
        </div>

        <div className="rounded-2xl bg-[var(--kairn-surface-high)] p-4 space-y-1.5">
          <p className="text-sm font-semibold text-[var(--kairn-text)]">
            Option recommandée : Mini reprise (15–20 min)
          </p>
          <p className="text-xs text-[var(--kairn-text-muted)] leading-relaxed">
            Nous réduisons automatiquement la mission du jour aux 2 étapes essentielles pour
            relancer votre élan sans surcharge.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={onStartMini}
            className="w-full min-h-[48px] px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            Reprendre en mode Mini (20 min)
          </button>
          <button
            type="button"
            onClick={onResumeNormal}
            className="w-full min-h-[48px] px-5 rounded-xl border border-[var(--kairn-border)] bg-transparent hover:bg-[var(--kairn-surface-high)] text-[var(--kairn-text)] font-medium text-sm transition-colors cursor-pointer"
          >
            Afficher la session normale
          </button>
        </div>
      </div>
    </div>
  );
}
