import type {
  DailyMission,
  DomainId,
  EnergyLevel,
  MissionHistoryEntry,
  MissionLevel,
  MissionStep,
  VerificationResult,
} from '../types/kairn';

export function getFrenchGreeting(hour: number, name: string): string {
  const trimmed = name.trim();
  const suffix = trimmed ? `, ${trimmed}` : '';
  if (hour >= 5 && hour < 12) {
    return `Bonjour${suffix}`;
  }
  if (hour >= 12 && hour < 18) {
    return `Bon après-midi${suffix}`;
  }
  return `Bonsoir${suffix}`;
}

export function getStepsForLevel(steps: MissionStep[], level: MissionLevel): MissionStep[] {
  const rank: Record<MissionLevel, number> = {
    mini: 1,
    normal: 2,
    plus: 3,
  };
  const currentRank = rank[level];
  return steps.filter((step) => rank[step.minLevel] <= currentRank);
}

export function shouldSuggestMiniMode(energy: EnergyLevel | null): boolean {
  return energy === 'low';
}

export function shouldShowComebackScreen(
  missedDays: number,
  comebackDismissedDate: string | null,
  todayIso: string,
  forceComeback = false
): boolean {
  if (forceComeback) return true;
  if (missedDays >= 2 && comebackDismissedDate !== todayIso) {
    return true;
  }
  return false;
}

export function formatTimerSeconds(totalSeconds: number): string {
  const clamped = Math.max(0, Math.min(20 * 60, Math.floor(totalSeconds)));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function verifyMissionLocally(
  mission: DailyMission,
  level: MissionLevel,
  completedStepIds: string[],
  submissionText: string
): VerificationResult {
  const requiredSteps = getStepsForLevel(mission.steps, level);
  const checkedCount = requiredSteps.filter((s) => completedStepIds.includes(s.id)).length;
  const allStepsChecked = checkedCount === requiredSteps.length;

  const normalized = submissionText.trim().toLowerCase();
  const matchedKeywords = mission.expectedKeywords.filter((kw) =>
    normalized.includes(kw.toLowerCase())
  );

  const requiredKeywords = Math.min(1, mission.expectedKeywords.length);

  const hasSubstantiveInput =
    normalized.length >= 25 && matchedKeywords.length >= requiredKeywords;
  const passed =
    allStepsChecked &&
    (hasSubstantiveInput ||
      (mission.expectedKeywords.length >= 3 && matchedKeywords.length >= 3));

  const passedChecks: string[] = [];
  const missingItems: string[] = [];

  if (allStepsChecked) {
    passedChecks.push(`Toutes les étapes (${checkedCount}/${requiredSteps.length}) sont validées.`);
  } else {
    missingItems.push(
      `Il reste ${requiredSteps.length - checkedCount} étape(s) à cocher dans votre guide.`
    );
  }

  if (matchedKeywords.length >= Math.max(1, requiredKeywords)) {
    passedChecks.push(
      `Notions clés repérées dans votre réponse (${matchedKeywords.join(', ')}).`
    );
  } else if (mission.expectedKeywords.length > 0 && normalized.length >= 25) {
    missingItems.push(
      `Ajoutez un extrait ou une explication incluant les notions clés (${mission.expectedKeywords.slice(0, 3).join(', ')}).`
    );
  }

  if (normalized.length < 25) {
    missingItems.push(
      'Précisez votre réponse (au moins quelques lignes de commande, configuration ou résumé).'
    );
  }

  return {
    passed,
    passedChecks,
    missingItems,
    hint: passed
      ? ''
      : mission.progressiveHints[Math.min(1, mission.progressiveHints.length - 1)] ||
        mission.progressiveHints[0] ||
        'Relisez la liste des étapes et vérifiez les points attendus.',
    feedback: passed
      ? mission.livrable
        ? `Beau travail ! Votre mission « ${mission.title} » et son livrable (${mission.livrable}) sont validés.`
        : 'Beau travail ! Votre configuration et vos notes valident l’ensemble des étapes attendues.'
      : 'Vous y êtes presque. Complétez les points ci-dessous puis réessayez tranquillement.',
    source: 'local',
  };
}

export function filterMissionHistory(
  history: MissionHistoryEntry[],
  domainFilter: 'all' | DomainId,
  statusFilter: 'all' | 'completed' | 'partial'
): MissionHistoryEntry[] {
  return history.filter((item) => {
    const matchDomain = domainFilter === 'all' || item.domain === domainFilter;
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchDomain && matchStatus;
  });
}

export function upsertTodayMissionHistory(
  history: MissionHistoryEntry[],
  entry: MissionHistoryEntry
): MissionHistoryEntry[] {
  const withoutSameDay = history.filter((item) => item.date !== entry.date || item.id !== entry.id);
  return [entry, ...withoutSameDay];
}

