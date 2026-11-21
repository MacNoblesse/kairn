import { apiUrl } from '../utils/apiBase';
import { useEffect, useState } from 'react';
import type {
  DailyMission,
  MissionBriefing,
  MissionLevel,
  VerificationResult,
} from '../types/kairn';
import {
  formatTimerSeconds,
  getStepsForLevel,
  verifyMissionLocally,
} from '../utils/coachLogic';
import {
  CheckCircle2,
  Circle,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  Lightbulb,
  Sparkles,
  MessageSquare,
  Terminal,
  Copy,
  Check,
  ShieldAlert,
  PackageCheck,
} from './Icons';

interface MissionGuideScreenProps {
  mission: DailyMission;
  selectedLevel: MissionLevel;
  completedStepIds: string[];
  revealedHintsCount: number;
  submissionDraft: string;
  readingSecondsRemaining: number;
  readingTimerRunning: boolean;
  isOffline: boolean;
  onToggleStep: (stepId: string) => void;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onRevealNextHint: () => void;
  onUpdateSubmission: (val: string) => void;
  onVerificationComplete: (result: VerificationResult) => void;
  onAskCoachWithContext: (prompt: string) => void;
}

export function MissionGuideScreen({
  mission,
  selectedLevel,
  completedStepIds,
  revealedHintsCount,
  submissionDraft,
  readingSecondsRemaining,
  readingTimerRunning,
  isOffline,
  onToggleStep,
  onToggleTimer,
  onResetTimer,
  onRevealNextHint,
  onUpdateSubmission,
  onVerificationComplete,
  onAskCoachWithContext,
}: MissionGuideScreenProps) {
  const [briefing, setBriefing] = useState<MissionBriefing>(mission.briefing);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [briefingNotice, setBriefingNotice] = useState<string | null>(null);

  const [aiHint, setAiHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);

  const [verifying, setVerifying] = useState(false);
  const [resourceOpen, setResourceOpen] = useState(false);
  const [copiedCmdId, setCopiedCmdId] = useState<string | null>(null);

  useEffect(() => {
    setBriefing(mission.briefing);
    setBriefingNotice(null);
    setAiHint(null);
    setResourceOpen(false);
  }, [mission.id, mission.briefing]);

  const steps = getStepsForLevel(mission.steps, selectedLevel);
  const completedCount = steps.filter((s) => completedStepIds.includes(s.id)).length;
  const maxMinutes = mission.readingMaxMin ?? 20;
  const maxSeconds = maxMinutes * 60;
  const elapsedFraction = Math.min(1, Math.max(0, (maxSeconds - readingSecondsRemaining) / maxSeconds));
  const ringRadius = 18;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = ringCircumference * (1 - elapsedFraction);

  async function handleRefreshBriefing() {
    if (isOffline) {
      setBriefingNotice('Mode hors ligne : le briefing local reste affiché.');
      return;
    }
    setLoadingBriefing(true);
    setBriefingNotice(null);
    try {
      const res = await fetch(apiUrl('/api/ai/briefing'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionTitle: mission.title,
          domain: mission.domainLabel,
          level: selectedLevel,
          objective: mission.objective,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Impossible d’actualiser le briefing.');
      }
      const data = (await res.json()) as MissionBriefing;
      if (data.keyNotions?.length) {
        setBriefing(data);
      }
    } catch (err) {
      setBriefingNotice(
        err instanceof Error ? err.message : 'Service IA indisponible pour le moment.'
      );
    } finally {
      setLoadingBriefing(false);
    }
  }

  async function handleStuckClick() {
    if (revealedHintsCount < mission.progressiveHints.length) {
      onRevealNextHint();
      return;
    }
    if (isOffline) {
      setAiHint('Mode hors ligne : utilisez les indices déjà affichés ou testez votre extrait étape par étape.');
      return;
    }
    setLoadingHint(true);
    try {
      const nextStep = steps.find((s) => !completedStepIds.includes(s.id)) ?? steps[steps.length - 1];
      const res = await fetch(apiUrl('/api/ai/hint'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionTitle: mission.title,
          currentStep: nextStep.label,
          hintLevel: 3,
          userNotes: submissionDraft,
        }),
      });
      if (!res.ok) throw new Error('Indice IA indisponible');
      const data = await res.json();
      setAiHint(data.hint);
    } catch {
      setAiHint('Consultez votre Coach IA pour débloquer ce point précis.');
    } finally {
      setLoadingHint(false);
    }
  }

  async function handleVerifyMission() {
    setVerifying(true);
    const localCheck = verifyMissionLocally(mission, selectedLevel, completedStepIds, submissionDraft);

    // If offline or user clearly skipped steps/input, return immediate calm local feedback
    if (isOffline || submissionDraft.trim().length < 20) {
      setVerifying(false);
      onVerificationComplete(localCheck);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 6000);
      const res = await fetch(apiUrl('/api/ai/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          missionTitle: mission.title,
          objective: mission.objective,
          stepsCompleted: completedCount,
          totalSteps: steps.length,
          submissionText: submissionDraft,
        }),
      });
      window.clearTimeout(timeoutId);
      if (!res.ok) {
        onVerificationComplete(localCheck);
        return;
      }
      const data = await res.json();
      onVerificationComplete({
        passed: Boolean(data.passed) && completedCount === steps.length,
        passedChecks: Array.isArray(data.passedChecks) ? data.passedChecks : localCheck.passedChecks,
        missingItems:
          completedCount < steps.length
            ? [
                `Il reste ${steps.length - completedCount} étape(s) à cocher dans votre liste.`,
                ...(Array.isArray(data.missingItems) ? data.missingItems : []),
              ]
            : Array.isArray(data.missingItems)
              ? data.missingItems
              : [],
        hint: data.hint || localCheck.hint,
        feedback: data.feedback || localCheck.feedback,
        source: 'ai',
      });
    } catch {
      onVerificationComplete(localCheck);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header + 20-min capped reading timer */}
      <section className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-[var(--kairn-text-muted)]">
            {mission.week ? `${mission.id} · Semaine ${mission.week} · ` : ''}
            {mission.domainLabel} · Mode {selectedLevel === 'mini' ? 'Mini 20 min' : selectedLevel === 'normal' ? 'Normal' : 'Plus'}
          </p>
          <h2 className="text-xl font-bold text-[var(--kairn-text)]">{mission.title}</h2>
          {mission.livrable && (
            <p className="text-xs text-[var(--kairn-text-muted)] flex items-center gap-1.5 pt-0.5">
              <PackageCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
              <span>Livrable : {mission.livrable}</span>
            </p>
          )}
        </div>

        {/* Reading Timer capped at readingMaxMin */}
        <div className="flex items-center gap-3 rounded-2xl bg-[var(--kairn-surface-high)] px-4 py-2.5 shrink-0">
          <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true" className="-rotate-90 shrink-0">
            <circle
              cx="22"
              cy="22"
              r={ringRadius}
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              className="text-[var(--kairn-border)]"
            />
            <circle
              cx="22"
              cy="22"
              r={ringRadius}
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={strokeDashoffset}
              className="text-[var(--kairn-primary)] transition-[stroke-dashoffset] duration-300"
            />
          </svg>
          <div>
            <p className="text-[11px] font-medium text-[var(--kairn-text-muted)]">
              Lecture max {maxMinutes} min
            </p>
            <p className="text-base font-bold tabular-nums text-[var(--kairn-text)]">
              {formatTimerSeconds(readingSecondsRemaining)}
            </p>
          </div>
          <div className="flex items-center gap-1 ml-1">
            <button
              type="button"
              onClick={onToggleTimer}
              aria-label={readingTimerRunning ? 'Mettre le minuteur en pause' : 'Démarrer le minuteur'}
              className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center hover:bg-[var(--kairn-surface)] text-[var(--kairn-text)] transition-colors cursor-pointer"
            >
              {readingTimerRunning ? (
                <Pause className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Play className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={onResetTimer}
              aria-label="Réinitialiser le minuteur à 20 minutes"
              className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center hover:bg-[var(--kairn-surface)] text-[var(--kairn-text-muted)] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* AI Briefing Card */}
      <section className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--kairn-primary)]" aria-hidden="true" />
            <h3 className="text-base font-semibold text-[var(--kairn-text)]">
              Briefing du coach
            </h3>
          </div>
          <button
            type="button"
            onClick={handleRefreshBriefing}
            disabled={loadingBriefing}
            className="min-h-[40px] px-3 rounded-xl text-xs font-semibold text-[var(--kairn-primary)] hover:bg-[var(--kairn-primary-soft)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loadingBriefing ? 'Génération...' : 'Actualiser via IA'}
          </button>
        </div>

        {briefingNotice && (
          <p className="text-xs text-amber-600 dark:text-amber-300">{briefingNotice}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--kairn-text-muted)]">Notions clés</p>
            <ul className="space-y-2 text-sm text-[var(--kairn-text)] leading-relaxed">
              {briefing.keyNotions.map((notion, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[var(--kairn-primary)] font-bold mt-0.5" aria-hidden="true">•</span>
                  <span>{notion}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--kairn-text-muted)]">Erreurs fréquentes</p>
            <ul className="space-y-2 text-sm text-[var(--kairn-text-muted)] leading-relaxed">
              {briefing.commonMistakes.map((mistake, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold mt-0.5" aria-hidden="true">•</span>
                  <span>{mistake}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Step-by-step Checklist */}
      <section className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--kairn-border)] flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--kairn-text)]">
            Étapes de la mission
          </h3>
          <span className="text-xs font-semibold tabular-nums text-[var(--kairn-text-muted)]">
            {completedCount}/{steps.length}
          </span>
        </div>

        <div className="divide-y divide-[var(--kairn-border)]">
          {steps.map((step, index) => {
            const done = completedStepIds.includes(step.id);
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onToggleStep(step.id)}
                aria-pressed={done}
                className="w-full min-h-[60px] px-5 py-4 flex items-start gap-3.5 text-left hover:bg-[var(--kairn-surface-high)] transition-colors cursor-pointer"
              >
                {done ? (
                  <CheckCircle2
                    className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                ) : (
                  <Circle
                    className="w-5 h-5 text-[var(--kairn-text-muted)] shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                )}
                <div className="space-y-1 min-w-0">
                  <p
                    className={`text-sm font-semibold ${
                      done ? 'line-through text-[var(--kairn-text-muted)]' : 'text-[var(--kairn-text)]'
                    }`}
                  >
                    {index + 1}. {step.label}
                  </p>
                  <p className="text-xs text-[var(--kairn-text-muted)] leading-relaxed">
                    {step.detail}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Single Recommended Resource Link */}
      <section className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--kairn-text-muted)]">Ressource unique recommandée</p>
            <p className="text-sm font-semibold text-[var(--kairn-text)] mt-0.5">
              {mission.resource.title}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setResourceOpen((prev) => !prev)}
            className="min-h-[44px] px-4 rounded-xl bg-[var(--kairn-surface-high)] text-xs font-semibold text-[var(--kairn-primary)] inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>{resourceOpen ? 'Masquer' : 'Lire le résumé'}</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
        {resourceOpen && (
          <div className="rounded-xl bg-[var(--kairn-surface-high)] p-4 text-sm text-[var(--kairn-text-muted)] space-y-2">
            <p>{mission.resource.summary}</p>
            {mission.resource.url ? (
              <a
                href={mission.resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--kairn-primary)] underline underline-offset-2"
              >
                Ouvrir la documentation officielle
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            ) : (
              <p className="text-xs text-[var(--kairn-primary)] font-medium">
                Référence recommandée : {mission.resource.title}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Verification Checks & Incident Training (when present) */}
      {((mission.verificationChecks && mission.verificationChecks.length > 0) || mission.incident) && (
        <section className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 space-y-4">
          {mission.verificationChecks && mission.verificationChecks.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--kairn-text)] flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[var(--kairn-primary)]" aria-hidden="true" />
                  <span>Contrôles de vérification</span>
                </h3>
                <span className="text-xs text-[var(--kairn-text-muted)]">
                  {mission.verificationTarget === 'automated' ? 'Automatisés' : 'Manuels'}
                </span>
              </div>

              <div className="space-y-2">
                {mission.verificationChecks.map((chk) => (
                  <div
                    key={chk.id}
                    className="rounded-xl bg-[var(--kairn-surface-high)] p-3.5 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-[var(--kairn-text)]">
                        {chk.description}
                      </span>
                      <span className="text-[11px] text-[var(--kairn-text-muted)]">
                        Hôte : {chk.host} · Attendu : {chk.expectText}
                      </span>
                    </div>
                    {chk.cmd && (
                      <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--kairn-surface)] border border-[var(--kairn-border)] px-3 py-1.5">
                        <code className="text-xs font-mono text-[var(--kairn-text)] overflow-x-auto">
                          {chk.cmd}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(chk.cmd!).catch(() => {});
                            setCopiedCmdId(chk.id);
                            window.setTimeout(() => setCopiedCmdId(null), 1500);
                          }}
                          aria-label={`Copier la commande ${chk.id}`}
                          className="min-w-[32px] min-h-[32px] rounded-lg flex items-center justify-center text-[var(--kairn-text-muted)] hover:text-[var(--kairn-text)] shrink-0 cursor-pointer"
                        >
                          {copiedCmdId === chk.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {mission.incident && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-0.5">
                <span className="font-semibold block">Incident à anticiper</span>
                <span>{mission.incident}</span>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Progressive Hints ("Je suis bloquée") */}
      <section className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--kairn-text)]">Besoin d’un coup de pouce ?</h3>
            <p className="text-xs text-[var(--kairn-text-muted)]">
              Indices progressifs sans vous donner la solution tout de suite
            </p>
          </div>
          <button
            type="button"
            onClick={handleStuckClick}
            disabled={loadingHint}
            className="min-h-[48px] px-4 rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface-high)] hover:opacity-90 text-sm font-semibold text-[var(--kairn-text)] inline-flex items-center gap-2 cursor-pointer"
          >
            <Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-300" aria-hidden="true" />
            <span>
              {loadingHint
                ? 'Recherche...'
                : revealedHintsCount < mission.progressiveHints.length
                  ? `Je suis bloquée (${revealedHintsCount}/${mission.progressiveHints.length})`
                  : 'Indice IA supplémentaire'}
            </span>
          </button>
        </div>

        {revealedHintsCount > 0 && (
          <div className="space-y-2.5">
            {mission.progressiveHints.slice(0, revealedHintsCount).map((hint, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-[var(--kairn-surface-high)] p-3.5 text-sm text-[var(--kairn-text)]"
              >
                <span className="text-xs font-semibold text-[var(--kairn-primary)] block mb-1">
                  Indice {idx + 1}
                </span>
                {hint}
              </div>
            ))}
          </div>
        )}

        {aiHint && (
          <div className="rounded-xl bg-[var(--kairn-primary-soft)] p-3.5 text-sm text-[var(--kairn-text)]">
            <span className="text-xs font-semibold text-[var(--kairn-primary)] block mb-1">
              Indice du Coach IA
            </span>
            {aiHint}
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            onAskCoachWithContext(
              `Je suis bloqué(e) sur la mission "${mission.title}". Peux-tu m'aider sans tout me révéler ?`
            )
          }
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--kairn-primary)] min-h-[40px] px-1 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" aria-hidden="true" />
          Discuter avec le Coach IA
        </button>
      </section>

      {/* Work Submission + Primary Verification Action */}
      <section className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="mission-submission" className="text-sm font-semibold text-[var(--kairn-text)]">
            Votre travail (commandes, notes ou compte-rendu)
          </label>
          <button
            type="button"
            onClick={() => onUpdateSubmission(mission.sampleSolution)}
            className="text-xs font-medium text-[var(--kairn-primary)] hover:underline min-h-[36px] px-2 cursor-pointer"
          >
            Insérer un exemple type
          </button>
        </div>

        <textarea
          id="mission-submission"
          rows={6}
          value={submissionDraft}
          onChange={(e) => onUpdateSubmission(e.target.value)}
          placeholder="Décrivez ici les commandes exécutées, vos vérifications ou collez votre configuration..."
          className="w-full rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface-low)] p-3.5 text-sm font-mono text-[var(--kairn-text)] placeholder:text-[var(--kairn-text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <button
          type="button"
          onClick={handleVerifyMission}
          disabled={verifying}
          className="w-full min-h-[52px] px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base transition-colors disabled:opacity-60 cursor-pointer"
        >
          {verifying ? 'Vérification en cours...' : 'Vérifier ma mission'}
        </button>
      </section>
    </div>
  );
}
