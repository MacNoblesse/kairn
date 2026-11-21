export type TabId = 'today' | 'reviews' | 'progress' | 'coach' | 'more';

export type SubView =
  | { type: 'none' }
  | { type: 'mission_guide' }
  | { type: 'verification_result'; result: VerificationResult }
  | { type: 'sunday_review' }
  | { type: 'curriculum' }
  | { type: 'history' }
  | { type: 'runbooks' }
  | { type: 'career' }
  | { type: 'english' }
  | { type: 'later' }
  | { type: 'settings' }
  | { type: 'tokens' };

export type MissionLevel = 'mini' | 'normal' | 'plus';
export type EnergyLevel = 'calm' | 'focused' | 'low';
export type DomainId = 'devops' | 'cloud' | 'cyber' | 'linux';
export type ThemeMode = 'dark' | 'light';

export interface MissionStep {
  id: string;
  label: string;
  detail: string;
  minLevel: MissionLevel;
}

export interface MissionBriefing {
  keyNotions: string[];
  commonMistakes: string[];
}

export interface VerificationCheck {
  id: string;
  host: string;
  description: string;
  cmd: string | null;
  expect: {
    op: string;
    value: string | number | string[] | null;
  };
  expectText: string;
}

export interface CurriculumWeek {
  week: number;
  theme: string;
  goal: string;
  linkedinPostIdea: string;
  missionIds: string[];
}

export interface DailyMission {
  id: string;
  date: string;
  title: string;
  domain: DomainId;
  domainLabel: string;
  difficulty: 'Débutant' | 'Intermédiaire' | 'Avancé';
  objective: string;
  baseMinutes: Record<MissionLevel, number>;
  steps: MissionStep[];
  briefing: MissionBriefing;
  resource: {
    title: string;
    url: string;
    summary: string;
  };
  progressiveHints: string[];
  expectedKeywords: string[];
  sampleSolution: string;
  week?: number;
  day?: number;
  dayLabel?: string;
  readingMaxMin?: number;
  livrable?: string;
  miniSummary?: string;
  extension?: string;
  incident?: string;
  flashcardsTarget?: number;
  skillNodes?: string[];
  verificationTarget?: string;
  verificationChecks?: VerificationCheck[];
}

export interface VerificationResult {
  passed: boolean;
  passedChecks: string[];
  missingItems: string[];
  hint: string;
  feedback: string;
  source: 'ai' | 'local';
}

export type FlashcardRating = 'again' | 'hard' | 'good' | 'easy';

export interface Flashcard {
  id: string;
  /** Mission d'origine (cartes générées automatiquement). */
  missionId?: string;
  domain: DomainId;
  domainLabel: string;
  question: string;
  answer: string;
  example?: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  dueDate: string; // YYYY-MM-DD
}

export interface ActivityDay {
  date: string; // YYYY-MM-DD
  count: number; // 0..4
  missionsDone: number;
  reviewsDone: number;
}

export interface DomainSkill {
  id: DomainId;
  label: string;
  cellsFilled: number; // out of 10
  totalCells: number;
  levelLabel: 'Découverte' | 'Pratique' | 'Solide' | 'Maîtrisé';
  recentTopic: string;
}

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Runbook {
  id: string;
  title: string;
  domain: DomainId;
  domainLabel: string;
  summary: string;
  commands: string;
}

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: 'À postuler' | 'Envoyée' | 'Entretien' | 'Offre';
  updatedAt: string;
}

export interface LaterIdea {
  id: string;
  text: string;
  domain: DomainId;
  done: boolean;
  createdAt: string;
}

export interface WeeklyReview {
  id: string;
  weekLabel: string;
  wins: string[];
  blockers: string[];
  nextGoals: string[];
  completedAt: string;
}

export interface BonusTask {
  id: string;
  title: string;
  minutes: number;
  domainLabel: string;
  done: boolean;
}

export interface SpecialPreviewFlags {
  forceOffline: boolean;
  forceSkeleton: boolean;
  forceComeback: boolean;
}

export interface UserProfile {
  name: string;
  weeklyGoalDays: number;
  priorityDomain: DomainId | 'balanced';
  theme: ThemeMode;
}

export interface MissionHistoryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  domain: DomainId;
  domainLabel: string;
  level: MissionLevel;
  durationMinutes: number;
  status: 'completed' | 'partial';
  objective: string;
  stepsDone: string[];
  notesOrSubmission: string;
  takeaways: string[];
}

export interface AppState {
  profile: UserProfile;
  streak: number;
  bestStreak: number;
  missedDays: number;
  comebackDismissedDate: string | null;
  todayEnergy: EnergyLevel | null;
  selectedLevel: MissionLevel;
  missionCompletedToday: boolean;
  completedStepIds: string[];
  revealedHintsCount: number;
  submissionDraft: string;
  readingSecondsRemaining: number;
  readingTimerRunning: boolean;
  bonusTasks: BonusTask[];
  flashcards: Flashcard[];
  activityHistory: ActivityDay[];
  missionHistory: MissionHistoryEntry[];
  skills: DomainSkill[];
  coachMessages: CoachMessage[];
  runbooks: Runbook[];
  applications: JobApplication[];
  linkedinDraft: string;
  laterIdeas: LaterIdea[];
  weeklyReviews: WeeklyReview[];
  lastReviewDate: string | null;
  curriculumWeeks: CurriculumWeek[];
  sundayRule: string;
  importedMissions: DailyMission[];
  activeMissionId: string;
  completedMissionIds: string[];
  curriculumLoadedOnce: boolean;
}
