import { useEffect, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import type {
  AppState,
  CoachMessage,
  EnergyLevel,
  FlashcardRating,
  MissionLevel,
  SpecialPreviewFlags,
  SubView,
  TabId,
  UserProfile,
  VerificationResult,
  WeeklyReview,
} from './types/kairn';
import {
  createInitialState,
  getTodayIsoDate,
  rollActivityHistory,
} from './data/seedData';
import { withBundledCurriculum } from './data/bundledCurriculum';
import { getDueFlashcards, scheduleFlashcard } from './utils/srs';
import {
  addMissionFlashcards,
  backfillCompletedMissionFlashcards,
} from './utils/flashcardGenerator';
import {
  STATE_STORAGE_KEY,
  fetchServerDoc,
  pushServerState,
  readSyncMeta,
  writeSyncMeta,
} from './utils/serverSync';
import { isNative } from './native/platform';
import { mirrorState, readMirroredState } from './native/durableStore';
import { scheduleRescheduleSoon, updateCards } from './native/reminders';
import { getStepsForLevel, shouldShowComebackScreen, upsertTodayMissionHistory } from './utils/coachLogic';
import {
  getCurriculumOverviewStats,
  mergeImportedCurriculum,
  type ParsedImportResult,
} from './utils/missionImporter';
import { NavigationShell } from './components/NavigationShell';
import { ComebackScreen, LoadingSkeleton, OfflineBanner } from './components/SpecialStates';
import { TodayScreen } from './components/TodayScreen';
import { MissionGuideScreen } from './components/MissionGuideScreen';
import { VerificationResultScreen } from './components/VerificationResultScreen';
import { ReviewsScreen } from './components/ReviewsScreen';
import { ProgressScreen } from './components/ProgressScreen';
import { CoachScreen } from './components/CoachScreen';
import { MoreMenu } from './components/MoreMenu';
import { SundayReviewScreen } from './components/SundayReviewScreen';
import { MissionHistoryScreen } from './components/MissionHistoryScreen';
import { CurriculumOverviewScreen } from './components/CurriculumOverviewScreen';
import {
  CareerView,
  DesignTokensView,
  EnglishView,
  LaterView,
  RunbooksView,
  SettingsView,
} from './components/MoreSubViews';

// v2 : la v1 contenait des données de démonstration (profil, séries, historique fictifs).
const LEGACY_STORAGE_KEYS = ['kairn_app_state_v1'];
const SYNC_DELAY_MS = 2000;

/** Complète/valide un état venu du serveur ou du cache local. */
function normalizeState(parsed: Partial<AppState> | null): AppState {
  const initial = createInitialState();
  if (!parsed || typeof parsed !== 'object') return withBundledCurriculum(initial);
  const todayIso = getTodayIsoDate();
  const merged: AppState = {
    ...initial,
    ...parsed,
    importedMissions: Array.isArray(parsed.importedMissions) ? parsed.importedMissions : [],
    curriculumWeeks: Array.isArray(parsed.curriculumWeeks) ? parsed.curriculumWeeks : [],
    completedMissionIds: Array.isArray(parsed.completedMissionIds)
      ? parsed.completedMissionIds
      : initial.completedMissionIds,
    flashcards: Array.isArray(parsed.flashcards) ? parsed.flashcards : [],
    activeMissionId: parsed.activeMissionId || initial.activeMissionId,
    activityHistory: rollActivityHistory(
      Array.isArray(parsed.activityHistory) ? parsed.activityHistory : [],
      todayIso
    ),
    profile: {
      ...initial.profile,
      ...(parsed.profile ?? {}),
    },
  };
  const withCurriculum = withBundledCurriculum(merged);
  // Les missions déjà validées avant l'existence des cartes en reçoivent maintenant.
  return {
    ...withCurriculum,
    flashcards: backfillCompletedMissionFlashcards(
      withCurriculum.flashcards,
      withCurriculum.importedMissions,
      withCurriculum.completedMissionIds,
      todayIso
    ),
  };
}

async function readLocalState(): Promise<Partial<AppState> | null> {
  try {
    for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key);
    const raw = localStorage.getItem(STATE_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Partial<AppState>;
  } catch {
    // localStorage illisible : on tente le miroir natif
  }
  // APK : si Android a vidé les données web de la WebView, le miroir natif les restaure.
  try {
    const mirrored = await readMirroredState();
    return mirrored ? (JSON.parse(mirrored) as Partial<AppState>) : null;
  } catch {
    return null;
  }
}

interface BootResult {
  state: AppState;
  /** Révision serveur connue, ou null si le serveur est injoignable. */
  rev: number | null;
  /** Contenu exact déjà présent sur le serveur (évite de le renvoyer s'il n'a pas changé). */
  serverJson: string | null;
}

/** Choisit la source de vérité au démarrage : serveur (volume Docker) > cache local. */
async function boot(): Promise<BootResult> {
  const local = await readLocalState();
  const meta = readSyncMeta();
  const server = await fetchServerDoc();

  if (!server) return { state: normalizeState(local), rev: null, serverJson: null };

  if (server.state) {
    // Modifications locales jamais envoyées, faites sur la version serveur actuelle : on les garde.
    const serverJson = JSON.stringify(server.state);
    if (local && meta.dirty && meta.baseRev === server.rev) {
      return { state: normalizeState(local), rev: server.rev, serverJson };
    }
    return { state: normalizeState(server.state as Partial<AppState>), rev: server.rev, serverJson };
  }
  // Serveur vide : premier lancement, ou migration des données qui vivaient dans le navigateur.
  return { state: normalizeState(local), rev: server.rev, serverJson: null };
}

export default function App() {
  const [booted, setBooted] = useState<BootResult | null>(null);
  useEffect(() => {
    let cancelled = false;
    boot().then((result) => {
      if (!cancelled) setBooted(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!booted) return <LoadingSkeleton label="Chargement de vos données..." />;
  return <KairnApp initialState={booted.state} initialRev={booted.rev} initialServerJson={booted.serverJson} />;
}

type SyncStatus = 'synced' | 'pending' | 'offline';

function KairnApp({
  initialState,
  initialRev,
  initialServerJson,
}: {
  initialState: AppState;
  initialRev: number | null;
  initialServerJson: string | null;
}) {
  const [state, setState] = useState<AppState>(initialState);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(initialRev === null ? 'offline' : 'synced');
  const revRef = useRef<number | null>(initialRev);
  const savedJsonRef = useRef<string | null>(initialServerJson);
  const latestStateRef = useRef<AppState>(initialState);
  const syncTimerRef = useRef<number | null>(null);
  const syncingRef = useRef(false);
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [subView, setSubView] = useState<SubView>({ type: 'none' });
  const [pendingCoachPrompt, setPendingCoachPrompt] = useState<string | null>(null);
  const [browserOffline, setBrowserOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [previewFlags, setPreviewFlags] = useState<SpecialPreviewFlags>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return {
        forceOffline: params.get('offline') === '1',
        forceSkeleton: params.get('loading') === '1',
        forceComeback: params.get('state') === 'comeback',
      };
    }
    return { forceOffline: false, forceSkeleton: false, forceComeback: false };
  });

  const todayIso = getTodayIsoDate();
  const isOffline = browserOffline || previewFlags.forceOffline;
  const dueCards = getDueFlashcards(state.flashcards, todayIso);
  const activeMission =
    state.importedMissions.find((m) => m.id === state.activeMissionId) ?? state.importedMissions[0];
  const curriculumStats = getCurriculumOverviewStats(
    state.curriculumWeeks,
    state.importedMissions,
    state.completedMissionIds
  );

  // 1) Cache local immédiat  2) envoi au serveur (volume Docker), au plus toutes les 2 s.
  useEffect(() => {
    latestStateRef.current = state;
    try {
      localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
      writeSyncMeta({ baseRev: revRef.current, dirty: true });
    } catch {
      // Ignore storage quota errors
    }
    if (syncTimerRef.current === null) {
      syncTimerRef.current = window.setTimeout(() => {
        syncTimerRef.current = null;
        void flushToServer();
      }, SYNC_DELAY_MS);
    }
    setSyncStatus((s) => (s === 'offline' ? s : 'pending'));
    if (isNative) scheduleMirror();
  }, [state]);

  // Rappels de révision : re-planifiés dès que les cartes changent (révision, synchro, import).
  useEffect(() => {
    updateCards(state.flashcards);
  }, [state.flashcards]);

  const mirrorTimerRef = useRef<number | null>(null);
  function scheduleMirror() {
    if (mirrorTimerRef.current !== null) return;
    mirrorTimerRef.current = window.setTimeout(() => {
      mirrorTimerRef.current = null;
      void mirrorState(JSON.stringify(latestStateRef.current));
    }, 1500);
  }
  function mirrorNow() {
    if (mirrorTimerRef.current !== null) {
      window.clearTimeout(mirrorTimerRef.current);
      mirrorTimerRef.current = null;
    }
    if (isNative) void mirrorState(JSON.stringify(latestStateRef.current));
  }

  async function flushToServer() {
    if (syncingRef.current) {
      // Un envoi est en cours : on réessaie juste après.
      syncTimerRef.current = window.setTimeout(() => {
        syncTimerRef.current = null;
        void flushToServer();
      }, SYNC_DELAY_MS);
      return;
    }
    syncingRef.current = true;
    try {
      // Serveur injoignable au démarrage : on tente de le retrouver.
      if (revRef.current === null) {
        const doc = await fetchServerDoc();
        if (!doc) {
          setSyncStatus('offline');
          scheduleRetry();
          return;
        }
        if (doc.state && doc.rev > 0) {
          adoptServerDoc(doc.state, doc.rev);
          return;
        }
        revRef.current = doc.rev;
      }
      const snapshot = latestStateRef.current;
      const json = JSON.stringify(snapshot);
      if (json === savedJsonRef.current) {
        setSyncStatus('synced');
        return;
      }
      const result = await pushServerState(revRef.current, snapshot);
      if (result.ok) {
        revRef.current = result.rev;
        savedJsonRef.current = json;
        // Des modifications ont pu arriver pendant l'envoi.
        const stillDirty = latestStateRef.current !== snapshot;
        writeSyncMeta({ baseRev: result.rev, dirty: stillDirty });
        setSyncStatus(stillDirty ? 'pending' : 'synced');
        scheduleRescheduleSoon();
      } else if (result.conflict) {
        // Un autre appareil a écrit entre-temps : le serveur fait foi.
        if (result.doc.state) adoptServerDoc(result.doc.state, result.doc.rev);
      } else {
        setSyncStatus('offline');
        scheduleRetry();
      }
    } finally {
      syncingRef.current = false;
    }
  }

  function scheduleRetry() {
    if (syncTimerRef.current !== null) return;
    syncTimerRef.current = window.setTimeout(() => {
      syncTimerRef.current = null;
      void flushToServer();
    }, 15000);
  }

  function adoptServerDoc(serverState: Record<string, unknown>, rev: number) {
    const next = normalizeState(serverState as Partial<AppState>);
    revRef.current = rev;
    savedJsonRef.current = JSON.stringify(next);
    latestStateRef.current = next;
    writeSyncMeta({ baseRev: rev, dirty: false });
    setSyncStatus('synced');
    setState(next);
  }

  /**
   * Synchronisation « maintenant » : envoie ce qui est en attente, sinon reprend la version du serveur
   * si un autre appareil a écrit. Déclenchée à la reprise de l'appli et au retour du réseau.
   */
  async function syncNow() {
    if (syncingRef.current) return;
    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    const dirty =
      revRef.current === null || JSON.stringify(latestStateRef.current) !== savedJsonRef.current;
    if (dirty) {
      await flushToServer();
    } else {
      const doc = await fetchServerDoc();
      if (doc?.state && doc.rev !== revRef.current && !syncingRef.current) {
        if (JSON.stringify(latestStateRef.current) === savedJsonRef.current) {
          adoptServerDoc(doc.state, doc.rev);
        }
      }
    }
    scheduleRescheduleSoon(500); // le temps a passé : re-planifier les rappels
  }

  /** Quitter l'écran : tout envoyer tout de suite (Android peut tuer l'appli en arrière-plan). */
  function flushBeforeBackground() {
    mirrorNow();
    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    if (!syncingRef.current && JSON.stringify(latestStateRef.current) !== savedJsonRef.current) {
      void flushToServer();
    }
  }

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void syncNow();
      else flushBeforeBackground();
    };
    const onOnline = () => void syncNow();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);

    let removeNative: (() => void) | null = null;
    if (isNative) {
      void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) void syncNow();
        else flushBeforeBackground();
      }).then((handle) => {
        removeNative = () => void handle.remove();
      });
    }
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
      removeNative?.();
    };
  }, []);

  // Sync dark/light theme on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (state.profile.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.profile.theme]);

  // Reset scroll to top when switching screens
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab, subView.type]);

  // Online / offline listeners
  useEffect(() => {
    const onOnline = () => setBrowserOffline(false);
    const onOffline = () => setBrowserOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Reading timer capped at mission readingMaxMin
  useEffect(() => {
    if (!state.readingTimerRunning) return;
    const id = window.setInterval(() => {
      setState((prev) => {
        if (prev.readingSecondsRemaining <= 1) {
          return { ...prev, readingSecondsRemaining: 0, readingTimerRunning: false };
        }
        return { ...prev, readingSecondsRemaining: prev.readingSecondsRemaining - 1 };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [state.readingTimerRunning]);

  function handleSelectTab(tab: TabId) {
    setActiveTab(tab);
    setSubView({ type: 'none' });
  }

  function handleSelectEnergy(energy: EnergyLevel) {
    setState((prev) => ({ ...prev, todayEnergy: energy }));
  }

  function handleSelectLevel(level: MissionLevel) {
    setState((prev) => ({ ...prev, selectedLevel: level }));
  }

  function handleToggleStep(stepId: string) {
    setState((prev) => {
      const exists = prev.completedStepIds.includes(stepId);
      return {
        ...prev,
        completedStepIds: exists
          ? prev.completedStepIds.filter((id) => id !== stepId)
          : [...prev.completedStepIds, stepId],
      };
    });
  }

  function handleVerificationComplete(result: VerificationResult) {
    if (result.passed) {
      setState((prev) => {
        const mission =
          prev.importedMissions.find((m) => m.id === prev.activeMissionId) ?? prev.importedMissions[0];
        const alreadyCompleted = prev.missionCompletedToday;
        const nextStreak = alreadyCompleted ? prev.streak : prev.streak + 1;
        const nextBest = Math.max(prev.bestStreak, nextStreak);
        const updatedHistory = prev.activityHistory.map((day, idx) =>
          idx === prev.activityHistory.length - 1
            ? {
                ...day,
                count: Math.max(day.count, 3),
                missionsDone: 1,
              }
            : day
        );
        const stepsForLevel = getStepsForLevel(mission.steps, prev.selectedLevel);
        const updatedMissionHistory = upsertTodayMissionHistory(prev.missionHistory, {
          id: mission.id,
          date: todayIso,
          title: mission.title,
          domain: mission.domain,
          domainLabel: mission.domainLabel,
          level: prev.selectedLevel,
          durationMinutes: mission.baseMinutes[prev.selectedLevel],
          status: 'completed',
          objective: mission.objective,
          stepsDone: stepsForLevel
            .filter((s) => prev.completedStepIds.includes(s.id))
            .map((s) => s.label),
          notesOrSubmission: prev.submissionDraft.trim() || mission.sampleSolution,
          takeaways: mission.briefing.keyNotions.slice(0, 2),
        });
        const nextCompletedIds = prev.completedMissionIds.includes(mission.id)
          ? prev.completedMissionIds
          : [...prev.completedMissionIds, mission.id];
        return {
          ...prev,
          missionCompletedToday: true,
          streak: nextStreak,
          bestStreak: nextBest,
          activityHistory: updatedHistory,
          missionHistory: updatedMissionHistory,
          completedMissionIds: nextCompletedIds,
          flashcards: addMissionFlashcards(prev.flashcards, mission, todayIso),
        };
      });
    }
    setSubView({ type: 'verification_result', result });
  }

  function handleImportParsed(parsed: ParsedImportResult, mode: 'merge' | 'replace') {
    if (mode === 'replace') {
      const merged = mergeImportedCurriculum([], [], state.sundayRule, parsed);
      const nextActiveId = merged.missions.some((m) => m.id === state.activeMissionId)
        ? state.activeMissionId
        : (merged.missions[0]?.id ?? '');
      setState((prev) => ({
        ...prev,
        importedMissions: merged.missions,
        curriculumWeeks: merged.weeks,
        sundayRule: merged.sundayRule,
        activeMissionId: nextActiveId,
        curriculumLoadedOnce: true,
      }));
      return { addedCount: merged.addedCount, updatedCount: merged.updatedCount };
    }

    const merged = mergeImportedCurriculum(
      state.importedMissions,
      state.curriculumWeeks,
      state.sundayRule,
      parsed
    );
    setState((prev) => ({
      ...prev,
      importedMissions: merged.missions,
      curriculumWeeks: merged.weeks,
      sundayRule: merged.sundayRule,
      curriculumLoadedOnce: true,
    }));
    return { addedCount: merged.addedCount, updatedCount: merged.updatedCount };
  }

  function handleActivateMission(missionId: string, openGuide = false) {
    const target = state.importedMissions.find((m) => m.id === missionId);
    if (!target) return;
    setState((prev) => ({
      ...prev,
      activeMissionId: missionId,
      completedStepIds: [],
      revealedHintsCount: 0,
      submissionDraft: '',
      missionCompletedToday: prev.completedMissionIds.includes(missionId),
      readingSecondsRemaining: (target.readingMaxMin ?? 20) * 60,
      readingTimerRunning: false,
    }));
    if (openGuide) {
      setSubView({ type: 'mission_guide' });
    } else {
      setSubView({ type: 'none' });
      setActiveTab('today');
    }
  }

  function handleToggleMissionCompleted(missionId: string) {
    setState((prev) => {
      const exists = prev.completedMissionIds.includes(missionId);
      const nextCompletedIds = exists
        ? prev.completedMissionIds.filter((id) => id !== missionId)
        : [...prev.completedMissionIds, missionId];
      return {
        ...prev,
        completedMissionIds: nextCompletedIds,
        missionCompletedToday:
          missionId === prev.activeMissionId ? !exists : prev.missionCompletedToday,
        flashcards: exists
          ? prev.flashcards
          : addMissionFlashcards(
              prev.flashcards,
              prev.importedMissions.find((m) => m.id === missionId),
              todayIso
            ),
      };
    });
  }

  function handleRateFlashcard(cardId: string, rating: FlashcardRating) {
    setState((prev) => ({
      ...prev,
      flashcards: prev.flashcards.map((c) =>
        c.id === cardId ? scheduleFlashcard(c, rating, todayIso) : c
      ),
      activityHistory: prev.activityHistory.map((day, idx) =>
        idx === prev.activityHistory.length - 1
          ? {
              ...day,
              count: Math.max(day.count, 2),
              reviewsDone: day.reviewsDone + 1,
            }
          : day
      ),
    }));
  }

  function handleAskCoachWithContext(prompt: string) {
    setPendingCoachPrompt(prompt);
    setSubView({ type: 'none' });
    setActiveTab('coach');
  }

  function handleComebackChoice(level: MissionLevel) {
    setPreviewFlags((prev) => ({ ...prev, forceComeback: false }));
    setState((prev) => ({
      ...prev,
      selectedLevel: level,
      missedDays: 0,
      comebackDismissedDate: todayIso,
    }));
    setActiveTab('today');
    setSubView({ type: 'mission_guide' });
  }

  const showComeback = shouldShowComebackScreen(
    state.missedDays,
    state.comebackDismissedDate,
    todayIso,
    previewFlags.forceComeback
  );

  function renderMainContent() {
    if (previewFlags.forceSkeleton) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[var(--kairn-text-muted)]">
              Aperçu de l’état de chargement
            </p>
            <button
              type="button"
              onClick={() => setPreviewFlags((p) => ({ ...p, forceSkeleton: false }))}
              className="text-xs font-semibold text-[var(--kairn-primary)] underline cursor-pointer"
            >
              Quitter aperçu
            </button>
          </div>
          <LoadingSkeleton />
        </div>
      );
    }

    if (showComeback && subView.type === 'none' && activeTab === 'today') {
      return (
        <ComebackScreen
          studentName={state.profile.name}
          missedDays={state.missedDays || 3}
          onStartMini={() => handleComebackChoice('mini')}
          onResumeNormal={() => handleComebackChoice('normal')}
        />
      );
    }

    // Subviews
    if (subView.type === 'mission_guide') {
      return (
        <MissionGuideScreen
          mission={activeMission}
          selectedLevel={state.selectedLevel}
          completedStepIds={state.completedStepIds}
          revealedHintsCount={state.revealedHintsCount}
          submissionDraft={state.submissionDraft}
          readingSecondsRemaining={state.readingSecondsRemaining}
          readingTimerRunning={state.readingTimerRunning}
          isOffline={isOffline}
          onToggleStep={handleToggleStep}
          onToggleTimer={() =>
            setState((prev) => ({ ...prev, readingTimerRunning: !prev.readingTimerRunning }))
          }
          onResetTimer={() =>
            setState((prev) => ({
              ...prev,
              readingTimerRunning: false,
              readingSecondsRemaining: (activeMission.readingMaxMin ?? 20) * 60,
            }))
          }
          onRevealNextHint={() =>
            setState((prev) => ({
              ...prev,
              revealedHintsCount: Math.min(
                activeMission.progressiveHints.length,
                prev.revealedHintsCount + 1
              ),
            }))
          }
          onUpdateSubmission={(val) =>
            setState((prev) => ({ ...prev, submissionDraft: val }))
          }
          onVerificationComplete={handleVerificationComplete}
          onAskCoachWithContext={handleAskCoachWithContext}
        />
      );
    }

    if (subView.type === 'verification_result') {
      return (
        <VerificationResultScreen
          result={subView.result}
          streak={state.streak}
          onReturnHome={() => {
            setSubView({ type: 'none' });
            setActiveTab('today');
          }}
          onRetry={() => setSubView({ type: 'mission_guide' })}
          onOpenReviews={() => {
            setSubView({ type: 'none' });
            setActiveTab('reviews');
          }}
          onAskCoach={handleAskCoachWithContext}
        />
      );
    }

    if (subView.type === 'sunday_review') {
      const defaultWins = [
        ...(state.missionCompletedToday
          ? [`Mission du jour validée : ${activeMission.title}`]
          : []),
        ...(state.weeklyReviews[0]?.wins ?? []),
      ].slice(0, 3);
      return (
        <SundayReviewScreen
          defaultWins={defaultWins}
          onSaveReview={(review: WeeklyReview) =>
            setState((prev) => ({
              ...prev,
              weeklyReviews: [review, ...prev.weeklyReviews],
              lastReviewDate: todayIso,
            }))
          }
          onBackToToday={() => {
            setSubView({ type: 'none' });
            setActiveTab('today');
          }}
        />
      );
    }

    if (subView.type === 'curriculum') {
      return (
        <CurriculumOverviewScreen
          weeks={state.curriculumWeeks}
          missions={state.importedMissions}
          sundayRule={state.sundayRule}
          activeMissionId={activeMission.id}
          completedMissionIds={state.completedMissionIds}
          isOffline={isOffline}
          onImportParsed={handleImportParsed}
          onActivateMission={handleActivateMission}
          onToggleMissionCompleted={handleToggleMissionCompleted}
          onSendLinkedinIdeaToCareer={(idea) => {
            setState((prev) => ({ ...prev, linkedinDraft: idea }));
            setSubView({ type: 'career' });
          }}
        />
      );
    }

    if (subView.type === 'history') {
      return (
        <MissionHistoryScreen
          history={state.missionHistory}
          onAskCoachAboutMission={handleAskCoachWithContext}
        />
      );
    }

    if (subView.type === 'runbooks') {
      return (
        <RunbooksView
          runbooks={state.runbooks}
          onAddRunbook={(rb) =>
            setState((prev) => ({ ...prev, runbooks: [rb, ...prev.runbooks] }))
          }
        />
      );
    }

    if (subView.type === 'career') {
      return (
        <CareerView
          applications={state.applications}
          linkedinDraft={state.linkedinDraft}
          isOffline={isOffline}
          onAddApplication={(app) =>
            setState((prev) => ({ ...prev, applications: [app, ...prev.applications] }))
          }
          onCycleStatus={(id) => {
            const order = ['À postuler', 'Envoyée', 'Entretien', 'Offre'] as const;
            setState((prev) => ({
              ...prev,
              applications: prev.applications.map((a) => {
                if (a.id !== id) return a;
                const nextIdx = (order.indexOf(a.status) + 1) % order.length;
                return { ...a, status: order[nextIdx], updatedAt: 'Aujourd’hui' };
              }),
            }));
          }}
          onDeleteApplication={(id) =>
            setState((prev) => ({
              ...prev,
              applications: prev.applications.filter((a) => a.id !== id),
            }))
          }
          onUpdateLinkedin={(draft) =>
            setState((prev) => ({ ...prev, linkedinDraft: draft }))
          }
        />
      );
    }

    if (subView.type === 'english') {
      return <EnglishView />;
    }

    if (subView.type === 'later') {
      return (
        <LaterView
          ideas={state.laterIdeas}
          onAddIdea={(text) =>
            setState((prev) => ({
              ...prev,
              laterIdeas: [
                {
                  id: `idea-${Date.now()}`,
                  text,
                  domain: 'devops',
                  done: false,
                  createdAt: 'Aujourd’hui',
                },
                ...prev.laterIdeas,
              ],
            }))
          }
          onToggleIdea={(id) =>
            setState((prev) => ({
              ...prev,
              laterIdeas: prev.laterIdeas.map((i) =>
                i.id === id ? { ...i, done: !i.done } : i
              ),
            }))
          }
          onDeleteIdea={(id) =>
            setState((prev) => ({
              ...prev,
              laterIdeas: prev.laterIdeas.filter((i) => i.id !== id),
            }))
          }
        />
      );
    }

    if (subView.type === 'settings') {
      return (
        <SettingsView
          profile={state.profile}
          previewFlags={previewFlags}
          onUpdateProfile={(next: Partial<UserProfile>) =>
            setState((prev) => ({ ...prev, profile: { ...prev.profile, ...next } }))
          }
          onUpdatePreviewFlags={(next) => {
            setPreviewFlags((prev) => ({ ...prev, ...next }));
            if (next.forceComeback) {
              setSubView({ type: 'none' });
              setActiveTab('today');
            }
          }}
          onOpenTokens={() => setSubView({ type: 'tokens' })}
        />
      );
    }

    if (subView.type === 'tokens') {
      return <DesignTokensView />;
    }

    // Main 5 Tabs
    switch (activeTab) {
      case 'today':
        return (
          <TodayScreen
            studentName={state.profile.name}
            streak={state.streak}
            todayEnergy={state.todayEnergy}
            selectedLevel={state.selectedLevel}
            mission={activeMission}
            missionCompletedToday={state.missionCompletedToday}
            completedStepIds={state.completedStepIds}
            dueCardsCount={dueCards.length}
            bonusTasks={state.bonusTasks}
            curriculumStats={{
              total: curriculumStats.totalMissions,
              completed: curriculumStats.completedMissions,
              weeks: curriculumStats.totalWeeks,
            }}
            onSelectEnergy={handleSelectEnergy}
            onSelectLevel={handleSelectLevel}
            onStartMission={() => setSubView({ type: 'mission_guide' })}
            onOpenReviews={() => handleSelectTab('reviews')}
            onToggleBonusTask={(id) =>
              setState((prev) => ({
                ...prev,
                bonusTasks: prev.bonusTasks.map((b) =>
                  b.id === id ? { ...b, done: !b.done } : b
                ),
              }))
            }
            onOpenSundayReview={() => setSubView({ type: 'sunday_review' })}
            onOpenCurriculum={() => setSubView({ type: 'curriculum' })}
          />
        );
      case 'reviews':
        return (
          <ReviewsScreen
            todayIso={todayIso}
            allCards={state.flashcards}
            dueCards={dueCards}
            onRateCard={handleRateFlashcard}
            onFinishToToday={() => handleSelectTab('today')}
          />
        );
      case 'progress':
        return (
          <ProgressScreen
            streak={state.streak}
            bestStreak={state.bestStreak}
            activityHistory={state.activityHistory}
            missionHistory={state.missionHistory}
            skills={state.skills}
            latestReview={state.weeklyReviews[0]}
            missionCompletedToday={state.missionCompletedToday}
            activeMissionTitle={activeMission.title}
            onOpenSundayReview={() => setSubView({ type: 'sunday_review' })}
            onOpenHistory={() => setSubView({ type: 'history' })}
          />
        );
      case 'coach':
        return (
          <CoachScreen
            studentName={state.profile.name}
            mission={activeMission}
            selectedLevel={state.selectedLevel}
            todayEnergy={state.todayEnergy}
            messages={state.coachMessages}
            isOffline={isOffline}
            pendingPrompt={pendingCoachPrompt}
            onConsumePendingPrompt={() => setPendingCoachPrompt(null)}
            onAddMessage={(msg: CoachMessage) =>
              setState((prev) => ({
                ...prev,
                coachMessages: [...prev.coachMessages, msg],
              }))
            }
            onResetChat={() =>
              setState((prev) => ({
                ...prev,
                coachMessages: createInitialState().coachMessages,
              }))
            }
          />
        );
      case 'more':
        return (
          <MoreMenu
            curriculumWeeksCount={state.curriculumWeeks.length}
            importedMissionsCount={curriculumStats.totalMissions}
            historyCount={state.missionHistory.length}
            runbooksCount={state.runbooks.length}
            applicationsCount={state.applications.length}
            ideasCount={state.laterIdeas.length}
            onNavigateSubView={(view) => setSubView(view)}
          />
        );
    }
  }

  return (
    <NavigationShell
      activeTab={activeTab}
      subView={subView}
      streak={state.streak}
      dueCardsCount={dueCards.length}
      onSelectTab={handleSelectTab}
      onBackFromSubView={() => setSubView({ type: 'none' })}
    >
      <div className="space-y-4">
        {isOffline && (
          <OfflineBanner
            onDisablePreview={
              previewFlags.forceOffline
                ? () => setPreviewFlags((p) => ({ ...p, forceOffline: false }))
                : undefined
            }
          />
        )}
        {!isOffline && syncStatus === 'offline' && (
          <div
            role="status"
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300"
          >
            Serveur injoignable : vos données sont gardées sur cet appareil et seront envoyées dès
            que la connexion revient.
          </div>
        )}
        {renderMainContent()}
      </div>
    </NavigationShell>
  );
}
