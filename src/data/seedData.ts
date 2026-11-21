import type { AppState, ActivityDay, DomainSkill } from '../types/kairn';

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getPastIsoDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const ACTIVITY_WINDOW_DAYS = 49;

/** 49 jours à zéro, se terminant aujourd’hui : aucune activité fictive. */
export function createEmptyActivity(todayIso: string = getTodayIsoDate()): ActivityDay[] {
  const [y, m, d] = todayIso.split('-').map(Number);
  return Array.from({ length: ACTIVITY_WINDOW_DAYS }, (_, idx) => {
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - (ACTIVITY_WINDOW_DAYS - 1 - idx));
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
    return { date: iso, count: 0, missionsDone: 0, reviewsDone: 0 };
  });
}

/**
 * Fait glisser la fenêtre d’activité pour qu’elle se termine aujourd’hui
 * (les jours déjà enregistrés sont conservés, les nouveaux jours sont à zéro).
 */
export function rollActivityHistory(history: ActivityDay[], todayIso: string): ActivityDay[] {
  const fresh = createEmptyActivity(todayIso);
  const byDate = new Map(history.map((d) => [d.date, d]));
  return fresh.map((day) => byDate.get(day.date) ?? day);
}

function createEmptySkills(): DomainSkill[] {
  const none = 'Aucune mission validée pour l’instant';
  return [
    { id: 'devops', label: 'DevOps & CI/CD', cellsFilled: 0, totalCells: 10, levelLabel: 'Découverte', recentTopic: none },
    { id: 'cloud', label: 'Cloud & Infra (IaC)', cellsFilled: 0, totalCells: 10, levelLabel: 'Découverte', recentTopic: none },
    { id: 'cyber', label: 'Cybersécurité', cellsFilled: 0, totalCells: 10, levelLabel: 'Découverte', recentTopic: none },
    { id: 'linux', label: 'Linux & Réseau', cellsFilled: 0, totalCells: 10, levelLabel: 'Découverte', recentTopic: none },
  ];
}

export const WELCOME_COACH_MESSAGE =
  'Bonjour ! Je suis là pour t’aider sur ta mission du jour ou sur toute notion DevOps, Cloud ou Cybersécurité. De quoi as-tu besoin ?';

/**
 * État initial VIDE : aucune donnée de démonstration.
 * Les missions réelles (programme de 12 semaines) sont injectées par
 * `loadBundledCurriculum()` dans App.tsx.
 */
export function createInitialState(): AppState {
  return {
    profile: {
      name: '',
      weeklyGoalDays: 5,
      priorityDomain: 'balanced',
      theme: 'dark',
    },
    streak: 0,
    bestStreak: 0,
    missedDays: 0,
    comebackDismissedDate: null,
    todayEnergy: null,
    selectedLevel: 'normal',
    missionCompletedToday: false,
    completedStepIds: [],
    revealedHintsCount: 0,
    submissionDraft: '',
    readingSecondsRemaining: 20 * 60,
    readingTimerRunning: false,
    bonusTasks: [],
    flashcards: [],
    activityHistory: createEmptyActivity(),
    missionHistory: [],
    skills: createEmptySkills(),
    coachMessages: [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: WELCOME_COACH_MESSAGE,
        timestamp: '',
      },
    ],
    runbooks: [],
    applications: [],
    linkedinDraft: '',
    laterIdeas: [],
    weeklyReviews: [],
    lastReviewDate: null,
    curriculumWeeks: [],
    sundayRule:
      'Revue de la semaine (pas de mission) : victoires d’abord, refaire à froid, objectifs de la semaine suivante, brouillon de post',
    importedMissions: [],
    activeMissionId: '',
    completedMissionIds: [],
    curriculumLoadedOnce: false,
  };
}
