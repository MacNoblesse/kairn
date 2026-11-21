import { useState } from 'react';
import type { DomainId, MissionHistoryEntry } from '../types/kairn';
import { filterMissionHistory } from '../utils/coachLogic';
import { EmptyState } from './SpecialStates';
import {
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CalendarCheck,
  MessageSquare,
} from './Icons';

interface MissionHistoryScreenProps {
  history: MissionHistoryEntry[];
  onAskCoachAboutMission: (prompt: string) => void;
}

function formatFrenchDate(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3) return isoDate;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

const DOMAIN_FILTERS: Array<{ id: 'all' | DomainId; label: string }> = [
  { id: 'all', label: 'Toutes' },
  { id: 'devops', label: 'DevOps' },
  { id: 'cloud', label: 'Cloud' },
  { id: 'cyber', label: 'Cyber' },
  { id: 'linux', label: 'Linux' },
];

export function MissionHistoryScreen({
  history,
  onAskCoachAboutMission,
}: MissionHistoryScreenProps) {
  const [domainFilter, setDomainFilter] = useState<'all' | DomainId>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'partial'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(history[0]?.id ?? null);

  const filtered = filterMissionHistory(history, domainFilter, statusFilter);
  const completedTotal = history.filter((h) => h.status === 'completed').length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header Summary */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-[var(--kairn-text)]">
            Vos missions précédentes
          </h2>
          <p className="text-sm text-[var(--kairn-text-muted)] tabular-nums">
            {completedTotal} mission{completedTotal > 1 ? 's' : ''} validée
            {completedTotal > 1 ? 's' : ''} sur {history.length} enregistrée
            {history.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Status Filter */}
        <div
          role="group"
          aria-label="Filtrer par statut"
          className="flex items-center gap-1 p-1 rounded-xl bg-[var(--kairn-surface-high)]"
        >
          {(
            [
              { id: 'all', label: 'Tout' },
              { id: 'completed', label: 'Validées' },
              { id: 'partial', label: 'À finir' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatusFilter(s.id)}
              aria-pressed={statusFilter === s.id}
              className={`min-h-[38px] px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === s.id
                  ? 'bg-[var(--kairn-surface)] text-[var(--kairn-text)] font-semibold shadow-sm'
                  : 'text-[var(--kairn-text-muted)]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Domain Filter Bar */}
      <div
        role="group"
        aria-label="Filtrer par domaine"
        className="flex items-center gap-1.5 overflow-x-auto pb-1"
      >
        {DOMAIN_FILTERS.map((d) => {
          const active = domainFilter === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setDomainFilter(d.id)}
              aria-pressed={active}
              className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                active
                  ? 'border-indigo-500/60 bg-[var(--kairn-primary-soft)] text-[var(--kairn-primary)] font-semibold'
                  : 'border-[var(--kairn-border)] bg-[var(--kairn-surface)] text-[var(--kairn-text-muted)] hover:text-[var(--kairn-text)]'
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {/* History List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="w-6 h-6" aria-hidden="true" />}
          title="Aucune mission dans cette catégorie"
          description="Modifiez vos filtres pour retrouver vos missions des jours précédents."
          actionLabel="Tout afficher"
          onAction={() => {
            setDomainFilter('all');
            setStatusFilter('all');
          }}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isExpanded = expandedId === item.id;
            const isCompleted = item.status === 'completed';

            return (
              <article
                key={item.id}
                className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  aria-expanded={isExpanded}
                  className="w-full min-h-[72px] px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-[var(--kairn-surface-high)] transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {isCompleted ? (
                        <CheckCircle2
                          className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
                          aria-hidden="true"
                        />
                      ) : (
                        <AlertCircle
                          className="w-5 h-5 text-amber-500 dark:text-amber-300"
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-[var(--kairn-text-muted)]">
                        <span className="capitalize">{formatFrenchDate(item.date)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.domainLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{item.durationMinutes} min</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            isCompleted
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-amber-600 dark:text-amber-300 font-semibold'
                          }
                        >
                          {isCompleted ? 'Validée' : 'Partielle'}
                        </span>
                      </div>

                      <h3 className="text-base font-semibold text-[var(--kairn-text)]">
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-[var(--kairn-text-muted)] shrink-0" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[var(--kairn-text-muted)] shrink-0" aria-hidden="true" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-[var(--kairn-border)] px-5 py-5 space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[var(--kairn-text-muted)]">
                        Ce qui était demandé
                      </p>
                      <p className="text-sm text-[var(--kairn-text)] leading-relaxed">
                        {item.objective}
                      </p>
                    </div>

                    {item.stepsDone.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-[var(--kairn-text-muted)]">
                          Étapes réalisées
                        </p>
                        <ul className="space-y-1.5 text-sm text-[var(--kairn-text)]">
                          {item.stepsDone.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-emerald-500 font-bold" aria-hidden="true">✓</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.notesOrSubmission && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-[var(--kairn-text-muted)]">
                          Votre travail / note retenue
                        </p>
                        <pre className="rounded-xl bg-[var(--kairn-surface-high)] p-3.5 text-xs font-mono text-[var(--kairn-text)] overflow-x-auto whitespace-pre-wrap">
                          <code>{item.notesOrSubmission}</code>
                        </pre>
                      </div>
                    )}

                    {item.takeaways.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-[var(--kairn-text-muted)]">
                          À retenir
                        </p>
                        <ul className="space-y-1 text-sm text-[var(--kairn-text-muted)]">
                          {item.takeaways.map((t, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-[var(--kairn-primary)] font-bold" aria-hidden="true">•</span>
                              <span>{t}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        onAskCoachAboutMission(
                          `J'aimerais réviser la mission précédente « ${item.title} » (${item.domainLabel}). Peux-tu me poser une question rapide dessus ?`
                        )
                      }
                      className="min-h-[44px] px-4 rounded-xl bg-[var(--kairn-primary-soft)] text-[var(--kairn-primary)] text-xs font-semibold inline-flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" aria-hidden="true" />
                      <span>Réviser cette mission avec le Coach IA</span>
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
