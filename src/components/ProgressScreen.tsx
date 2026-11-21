import { useState } from 'react';
import type { ActivityDay, DomainSkill, MissionHistoryEntry, WeeklyReview } from '../types/kairn';
import { Flame, Award, ChevronRight, CalendarCheck, CheckCircle2, AlertCircle } from './Icons';

interface ProgressScreenProps {
  streak: number;
  bestStreak: number;
  activityHistory: ActivityDay[];
  missionHistory: MissionHistoryEntry[];
  skills: DomainSkill[];
  latestReview: WeeklyReview | undefined;
  missionCompletedToday: boolean;
  activeMissionTitle: string;
  onOpenSundayReview: () => void;
  onOpenHistory: () => void;
}

function getCellClass(count: number): string {
  if (count <= 0) return 'bg-[var(--kairn-surface-high)]';
  if (count === 1) return 'bg-indigo-500/30 dark:bg-indigo-500/30';
  if (count === 2) return 'bg-indigo-500/60 dark:bg-indigo-400/60';
  return 'bg-indigo-600 dark:bg-indigo-400';
}

export function ProgressScreen({
  streak,
  bestStreak,
  activityHistory,
  missionHistory,
  skills,
  latestReview,
  missionCompletedToday,
  activeMissionTitle,
  onOpenSundayReview,
  onOpenHistory,
}: ProgressScreenProps) {
  const [selectedDay, setSelectedDay] = useState<ActivityDay | null>(
    activityHistory[activityHistory.length - 1] ?? null
  );

  // Organize 49 days into 7 columns (weeks) x 7 rows (days)
  const weeks: ActivityDay[][] = [];
  for (let i = 0; i < activityHistory.length; i += 7) {
    weeks.push(activityHistory.slice(i, i + 7));
  }

  const missionsThisWeek = activityHistory
    .slice(-7)
    .reduce((sum, d) => sum + d.missionsDone, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--kairn-text)]">
          Votre progression
        </h1>
        <p className="text-sm text-[var(--kairn-text-muted)]">
          Régularité quotidienne et maîtrise par domaine
        </p>
      </div>

      {/* Top Metrics Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--kairn-text-muted)]">
            <Flame className="w-4 h-4 text-amber-500 dark:text-amber-300" aria-hidden="true" />
            <span>Série</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-[var(--kairn-text)] mt-1">
            {streak} j
          </p>
        </div>

        <div className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-4">
          <p className="text-xs font-medium text-[var(--kairn-text-muted)]">Record</p>
          <p className="text-2xl font-bold tabular-nums text-[var(--kairn-text)] mt-1">
            {bestStreak} j
          </p>
        </div>

        <div className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-4">
          <p className="text-xs font-medium text-[var(--kairn-text-muted)]">Cette semaine</p>
          <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {missionsThisWeek}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* GitHub-style Activity Calendar */}
        <section
          aria-labelledby="calendar-title"
          className="lg:col-span-6 rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="calendar-title" className="text-base font-semibold text-[var(--kairn-text)]">
              Calendrier d’activité (7 semaines)
            </h2>
            <div className="flex items-center gap-1 text-[11px] text-[var(--kairn-text-muted)]">
              <span>Moins</span>
              <span className="w-2.5 h-2.5 rounded-sm bg-[var(--kairn-surface-high)]" />
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500/30" />
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500/60" />
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 dark:bg-indigo-400" />
              <span>Plus</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2" role="grid" aria-label="Activité des 49 derniers jours">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="space-y-2">
                {week.map((day) => {
                  const isSelected = selectedDay?.date === day.date;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      aria-label={`${day.date} : ${day.missionsDone} mission, ${day.reviewsDone} révisions`}
                      className={`w-full aspect-square rounded-md transition-transform cursor-pointer ${getCellClass(
                        day.count
                      )} ${
                        isSelected
                          ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[var(--kairn-surface)]'
                          : 'hover:scale-105'
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {selectedDay && (() => {
            const dayMission = missionHistory.find((m) => m.date === selectedDay.date);
            return (
              <div className="space-y-1 pt-1">
                <p className="text-xs text-[var(--kairn-text-muted)] tabular-nums">
                  {selectedDay.date} · {selectedDay.missionsDone} mission
                  {selectedDay.missionsDone > 1 ? 's' : ''} · {selectedDay.reviewsDone} carte
                  {selectedDay.reviewsDone > 1 ? 's' : ''} révisée
                  {selectedDay.reviewsDone > 1 ? 's' : ''}
                </p>
                {dayMission && (
                  <p className="text-xs font-medium text-[var(--kairn-text)]">
                    Mission : {dayMission.title}
                  </p>
                )}
              </div>
            );
          })()}
        </section>

        {/* Skill Map by Domain */}
        <section
          aria-labelledby="skillmap-title"
          className="lg:col-span-6 rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 sm:p-6 space-y-5"
        >
          <h2 id="skillmap-title" className="text-base font-semibold text-[var(--kairn-text)]">
            Carte des compétences
          </h2>

          <div className="space-y-4">
            {skills.map((skill) => (
              <div key={skill.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--kairn-text)]">
                    {skill.label}
                  </span>
                  <span className="text-xs font-medium text-[var(--kairn-primary)]">
                    {skill.levelLabel} · {skill.cellsFilled}/{skill.totalCells}
                  </span>
                </div>

                <div className="grid grid-cols-10 gap-1.5" aria-hidden="true">
                  {Array.from({ length: skill.totalCells }).map((_, idx) => {
                    const filled = idx < skill.cellsFilled;
                    return (
                      <div
                        key={idx}
                        className={`h-3 rounded-sm transition-colors ${
                          filled
                            ? 'bg-emerald-500 dark:bg-emerald-400'
                            : 'bg-[var(--kairn-surface-high)]'
                        }`}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-[var(--kairn-text-muted)]">{skill.recentTopic}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Weekly Summary — Wins First */}
      <section className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[var(--kairn-text)]">
              Résumé hebdomadaire · Vos réussites d’abord
            </h2>
          </div>
        </div>

        <ul className="space-y-2 text-sm text-[var(--kairn-text)]">
          {missionCompletedToday && (
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold" aria-hidden="true">✓</span>
              <span>Mission du jour validée : {activeMissionTitle}</span>
            </li>
          )}
          {(latestReview?.wins ?? []).map((win, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold" aria-hidden="true">✓</span>
              <span>{win}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onOpenSundayReview}
          className="w-full sm:w-auto min-h-[48px] px-5 rounded-xl bg-[var(--kairn-primary-soft)] text-[var(--kairn-primary)] font-semibold text-sm inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
        >
          <CalendarCheck className="w-4 h-4" aria-hidden="true" />
          <span>Faire ma revue du dimanche</span>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </section>

      {/* Recent Mission History Preview */}
      <section className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--kairn-border)] flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--kairn-text)]">
              Historique des missions
            </h2>
            <p className="text-xs text-[var(--kairn-text-muted)] mt-0.5 tabular-nums">
              {missionHistory.length} missions enregistrées
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenHistory}
            className="min-h-[44px] px-3.5 rounded-xl bg-[var(--kairn-primary-soft)] text-[var(--kairn-primary)] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Tout voir</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="divide-y divide-[var(--kairn-border)]">
          {missionHistory.slice(0, 3).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={onOpenHistory}
              className="w-full min-h-[60px] px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[var(--kairn-surface-high)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                {item.status === 'completed' ? (
                  <CheckCircle2
                    className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <AlertCircle
                    className="w-4 h-4 text-amber-500 dark:text-amber-300 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--kairn-text)] truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-[var(--kairn-text-muted)] tabular-nums mt-0.5">
                    {item.date} · {item.domainLabel} · {item.durationMinutes} min
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--kairn-text-muted)] shrink-0" aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
