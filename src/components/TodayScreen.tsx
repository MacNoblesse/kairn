import { useState } from 'react';
import type {
  BonusTask,
  DailyMission,
  EnergyLevel,
  MissionLevel,
} from '../types/kairn';
import { getFrenchGreeting, getStepsForLevel, shouldSuggestMiniMode } from '../utils/coachLogic';
import {
  Flame,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Layers,
  CheckCircle2,
  Circle,
  CalendarCheck,
  Map,
} from './Icons';

interface TodayScreenProps {
  studentName: string;
  streak: number;
  todayEnergy: EnergyLevel | null;
  selectedLevel: MissionLevel;
  mission: DailyMission;
  missionCompletedToday: boolean;
  completedStepIds: string[];
  dueCardsCount: number;
  bonusTasks: BonusTask[];
  curriculumStats?: { total: number; completed: number; weeks: number };
  onSelectEnergy: (energy: EnergyLevel) => void;
  onSelectLevel: (level: MissionLevel) => void;
  onStartMission: () => void;
  onOpenReviews: () => void;
  onToggleBonusTask: (id: string) => void;
  onOpenSundayReview: () => void;
  onOpenCurriculum: () => void;
}

const ENERGY_OPTIONS: Array<{ id: EnergyLevel; emoji: string; label: string }> = [
  { id: 'calm', emoji: '😌', label: 'Calme' },
  { id: 'focused', emoji: '⚡', label: 'En forme' },
  { id: 'low', emoji: '🔋', label: 'Batterie faible' },
];

const LEVEL_OPTIONS: Array<{ id: MissionLevel; label: string; durationLabel: string }> = [
  { id: 'mini', label: 'Mini', durationLabel: '20 min' },
  { id: 'normal', label: 'Normal', durationLabel: '35 min' },
  { id: 'plus', label: 'Plus', durationLabel: '50 min' },
];

export function TodayScreen({
  studentName,
  streak,
  todayEnergy,
  selectedLevel,
  mission,
  missionCompletedToday,
  completedStepIds,
  dueCardsCount,
  bonusTasks,
  curriculumStats,
  onSelectEnergy,
  onSelectLevel,
  onStartMission,
  onOpenReviews,
  onToggleBonusTask,
  onOpenSundayReview,
  onOpenCurriculum,
}: TodayScreenProps) {
  const [extraTimeExpanded, setExtraTimeExpanded] = useState(false);

  const hour = new Date().getHours();
  const greeting = getFrenchGreeting(hour, studentName);
  const formattedDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const stepsForLevel = getStepsForLevel(mission.steps, selectedLevel);
  const completedCount = stepsForLevel.filter((s) => completedStepIds.includes(s.id)).length;
  const estimatedMinutes = mission.baseMinutes[selectedLevel];
  const suggestMini = shouldSuggestMiniMode(todayEnergy) && selectedLevel !== 'mini';

  const primaryCtaLabel = missionCompletedToday
    ? 'Revoir la mission'
    : completedCount > 0
      ? 'Continuer'
      : 'Commencer';

  return (
    <div className="space-y-6">
      {/* Greeting & Streak */}
      <section className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[13px] font-medium text-[var(--kairn-text-muted)] capitalize">
            {formattedDate}
          </p>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-[var(--kairn-text)] text-balance">
            {greeting}
          </h1>
        </div>
        <div
          aria-label={`Série actuelle de ${streak} jours`}
          className="hidden md:flex items-center gap-2 rounded-2xl border border-[var(--kairn-border)] bg-[var(--kairn-surface)] px-4 py-2.5 shrink-0"
        >
          <Flame className="w-4 h-4 text-amber-500 dark:text-amber-300" aria-hidden="true" />
          <span className="text-sm font-semibold tabular-nums text-[var(--kairn-text)]">
            {streak} jours
          </span>
        </div>
      </section>

      {/* Morning Energy Check-in */}
      <section aria-labelledby="energy-heading" className="space-y-2.5">
        <h2 id="energy-heading" className="text-[13px] font-medium text-[var(--kairn-text-muted)]">
          Énergie du matin
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {ENERGY_OPTIONS.map((option) => {
            const active = todayEnergy === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectEnergy(option.id)}
                aria-pressed={active}
                className={`min-h-[56px] sm:min-h-[48px] px-2 sm:px-3 py-2 rounded-2xl border flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 transition-colors cursor-pointer ${
                  active
                    ? 'border-indigo-500/60 bg-[var(--kairn-primary-soft)] text-[var(--kairn-text)]'
                    : 'border-[var(--kairn-border)] bg-[var(--kairn-surface)] text-[var(--kairn-text-muted)] hover:bg-[var(--kairn-surface-high)]'
                }`}
              >
                <span aria-hidden="true" className="text-base leading-none">
                  {option.emoji}
                </span>
                <span className="text-[11px] sm:text-sm font-medium text-center leading-tight">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
        {suggestMini && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--kairn-surface-high)] px-4 py-2.5 text-xs text-[var(--kairn-text-muted)]">
            <span>Journée chargée ? Passez en mode Mini (20 min) pour préserver votre régularité.</span>
            <button
              type="button"
              onClick={() => onSelectLevel('mini')}
              className="font-semibold text-[var(--kairn-primary)] whitespace-nowrap shrink-0 min-h-[36px] px-2 cursor-pointer"
            >
              Activer Mini
            </button>
          </div>
        )}
      </section>

      {/* Main Responsive Grid: Primary Mission + Side Shortcuts on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Today's Mission Card (Dominant Anchor) */}
        <section
          aria-labelledby="mission-heading"
          className="lg:col-span-7 rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 sm:p-6 space-y-5"
        >
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-[var(--kairn-text-muted)]">
              {mission.week && (
                <>
                  <span className="font-semibold text-[var(--kairn-primary)]">
                    S{mission.week}
                    {mission.dayLabel ? ` · ${mission.dayLabel.charAt(0).toUpperCase()}${mission.dayLabel.slice(1)}` : ''}
                  </span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span>{mission.domainLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{estimatedMinutes} min</span>
              <span aria-hidden="true">·</span>
              <span>{mission.difficulty}</span>
              {missionCompletedToday && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Validée
                  </span>
                </>
              )}
            </div>

            <h2
              id="mission-heading"
              className="text-xl font-bold tracking-tight text-[var(--kairn-text)] text-balance"
            >
              {mission.title}
            </h2>
            <p className="text-[15px] leading-relaxed text-[var(--kairn-text-muted)]">
              {mission.objective}
            </p>
            {selectedLevel === 'mini' && mission.miniSummary && (
              <p className="text-xs text-[var(--kairn-primary)] font-medium leading-relaxed">
                Version Mini : {mission.miniSummary}
              </p>
            )}
            {mission.livrable && (
              <p className="text-xs text-[var(--kairn-text-muted)]">
                Livrable : <span className="font-medium text-[var(--kairn-text)]">{mission.livrable}</span>
              </p>
            )}
          </div>

          {/* 3-Level Selector */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-[var(--kairn-text-muted)]">
              Format de la session
            </span>
            <div
              role="group"
              aria-label="Sélecteur de durée de mission"
              className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--kairn-surface-high)]"
            >
              {LEVEL_OPTIONS.map((lvl) => {
                const active = selectedLevel === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => onSelectLevel(lvl.id)}
                    aria-pressed={active}
                    className={`min-h-[44px] px-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-[var(--kairn-surface)] text-[var(--kairn-text)] shadow-sm font-semibold'
                        : 'text-[var(--kairn-text-muted)] hover:text-[var(--kairn-text)]'
                    }`}
                  >
                    {lvl.id === 'mini' ? `${lvl.label} ${lvl.durationLabel}` : lvl.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step progress preview */}
          <div className="flex items-center justify-between text-xs font-medium text-[var(--kairn-text-muted)]">
            <span className="tabular-nums">
              {completedCount} sur {stepsForLevel.length} étapes prêtes
            </span>
            <span className="tabular-nums">
              {Math.round((completedCount / Math.max(1, stepsForLevel.length)) * 100)}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[var(--kairn-surface-high)] overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-[width] duration-200"
              style={{
                width: `${Math.round((completedCount / Math.max(1, stepsForLevel.length)) * 100)}%`,
              }}
            />
          </div>

          {/* Single Primary CTA */}
          <button
            type="button"
            onClick={onStartMission}
            className="w-full min-h-[52px] px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold text-base transition-all cursor-pointer"
          >
            {primaryCtaLabel}
          </button>
        </section>

        {/* Right Column / Stacked Below on Mobile */}
        <div className="lg:col-span-5 space-y-4">
          {/* Cartes à réviser shortcut */}
          <button
            type="button"
            onClick={onOpenReviews}
            className="w-full min-h-[72px] rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] hover:bg-[var(--kairn-surface-high)] p-5 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-[var(--kairn-primary-soft)] flex items-center justify-center text-[var(--kairn-primary)] shrink-0">
                <Layers className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-[var(--kairn-text)] truncate">
                  Cartes à réviser
                </p>
                <p className="text-xs text-[var(--kairn-text-muted)] tabular-nums mt-0.5">
                  {dueCardsCount > 0
                    ? `${dueCardsCount} carte${dueCardsCount > 1 ? 's' : ''} prête${dueCardsCount > 1 ? 's' : ''} aujourd’hui`
                    : 'Tout est à jour pour aujourd’hui'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--kairn-text-muted)] shrink-0" aria-hidden="true" />
          </button>

          {/* Collapsed "J'ai du temps en plus" : masqué tant qu'aucun bonus n'existe */}
          {bonusTasks.length > 0 && (
          <div className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] overflow-hidden">
            <button
              type="button"
              onClick={() => setExtraTimeExpanded((prev) => !prev)}
              aria-expanded={extraTimeExpanded}
              className="w-full min-h-[56px] px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--kairn-surface-high)] transition-colors cursor-pointer"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--kairn-text)]">
                  J’ai du temps en plus
                </p>
                <p className="text-xs text-[var(--kairn-text-muted)] mt-0.5">
                  {bonusTasks.filter((b) => b.done).length}/{bonusTasks.length} bonus optionnels
                </p>
              </div>
              {extraTimeExpanded ? (
                <ChevronUp className="w-5 h-5 text-[var(--kairn-text-muted)] shrink-0" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[var(--kairn-text-muted)] shrink-0" aria-hidden="true" />
              )}
            </button>

            {extraTimeExpanded && (
              <div className="border-t border-[var(--kairn-border)] divide-y divide-[var(--kairn-border)]">
                {bonusTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onToggleBonusTask(task.id)}
                    className="w-full min-h-[56px] px-5 py-3.5 flex items-center gap-3.5 text-left hover:bg-[var(--kairn-surface-high)] transition-colors cursor-pointer"
                  >
                    {task.done ? (
                      <CheckCircle2
                        className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle
                        className="w-5 h-5 text-[var(--kairn-text-muted)] shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${
                          task.done
                            ? 'line-through text-[var(--kairn-text-muted)]'
                            : 'text-[var(--kairn-text)]'
                        }`}
                      >
                        {task.title}
                      </p>
                      <p className="text-xs text-[var(--kairn-text-muted)] mt-0.5">
                        {task.domainLabel} · {task.minutes} min
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Programme & Import Shortcut */}
          <button
            type="button"
            onClick={onOpenCurriculum}
            className="w-full min-h-[56px] rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] hover:bg-[var(--kairn-surface-high)] px-5 py-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Map className="w-5 h-5 text-[var(--kairn-primary)] shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--kairn-text)] truncate">
                  Programme & Import
                </p>
                <p className="text-xs text-[var(--kairn-text-muted)] truncate tabular-nums">
                  {curriculumStats && curriculumStats.total > 0
                    ? `${curriculumStats.weeks} semaines · ${curriculumStats.completed}/${curriculumStats.total} missions`
                    : 'Voir le parcours complet ou importer YAML / JSON'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--kairn-text-muted)] shrink-0" aria-hidden="true" />
          </button>

          {/* Weekly Sunday Review Entry */}
          <button
            type="button"
            onClick={onOpenSundayReview}
            className="w-full min-h-[56px] rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] hover:bg-[var(--kairn-surface-high)] px-5 py-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <CalendarCheck className="w-5 h-5 text-[var(--kairn-primary)] shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--kairn-text)] truncate">
                  Revue du dimanche
                </p>
                <p className="text-xs text-[var(--kairn-text-muted)] truncate">
                  Célébrer vos réussites et planifier la semaine
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--kairn-text-muted)] shrink-0" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
