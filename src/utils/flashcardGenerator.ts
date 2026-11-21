import type { DailyMission, Flashcard } from '../types/kairn';
import { addDaysIso } from './srs';

const DEFAULT_TARGET = 5;
const MAX_TARGET = 12;

type Draft = Pick<Flashcard, 'question' | 'answer' | 'example'>;

/**
 * Construit des cartes de révision à partir du contenu RÉEL d'une mission
 * (commandes de vérification, étapes, notions, livrable). Aucune réponse n'est inventée :
 * chaque réponse est une donnée présente dans le programme.
 *
 * Les ids sont déterministes (`<missionId>-fc-<n>`) : régénérer ne crée jamais de doublon.
 */
export function buildMissionFlashcardDrafts(mission: DailyMission): Draft[] {
  const target = Math.min(
    MAX_TARGET,
    Math.max(1, Math.round(mission.flashcardsTarget ?? DEFAULT_TARGET))
  );

  const commandCards: Draft[] = (mission.verificationChecks ?? [])
    .filter((c) => c.cmd && c.cmd.trim().length > 0)
    .map((c) => ({
      question: `Quelle commande permet de vérifier : « ${c.description} » ?`,
      answer: (c.cmd as string).trim(),
      example: c.expectText ? `Résultat attendu : ${c.expectText}` : undefined,
    }));

  const notionsCard: Draft[] =
    mission.briefing.keyNotions.length > 1
      ? [
          {
            question: `Quelles notions clés faut-il maîtriser pour « ${mission.title} » ?`,
            answer: mission.briefing.keyNotions.map((n) => `• ${n}`).join('\n'),
          },
        ]
      : [];

  const livrableCard: Draft[] = mission.livrable
    ? [
        {
          question: `Quel livrable produire pour « ${mission.title} » ?`,
          answer: mission.livrable,
        },
      ]
    : [];

  const coreSteps = mission.steps.filter((s) => !s.id.endsWith('-step-ext'));
  const stepCards: Draft[] = coreSteps.map((s, idx) => ({
    question: `« ${mission.objective} » — quelle est l'étape ${idx + 1} sur ${coreSteps.length} ?`,
    answer: s.label,
  }));

  // Priorité : commandes (le plus utile à retenir), notions, livrable, puis étapes.
  return [...commandCards, ...notionsCard, ...livrableCard, ...stepCards].slice(0, target);
}

export function buildMissionFlashcards(mission: DailyMission, todayIso: string): Flashcard[] {
  return buildMissionFlashcardDrafts(mission).map((draft, idx) => ({
    id: `${mission.id}-fc-${idx + 1}`,
    missionId: mission.id,
    domain: mission.domain,
    domainLabel: mission.domainLabel,
    question: draft.question,
    answer: draft.answer,
    example: draft.example,
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    // Première révision le lendemain de l'apprentissage.
    dueDate: addDaysIso(todayIso, 1),
  }));
}

/** Ajoute les cartes d'une mission sans toucher à celles qui existent déjà (progression conservée). */
export function addMissionFlashcards(
  existing: Flashcard[],
  mission: DailyMission | undefined,
  todayIso: string
): Flashcard[] {
  if (!mission) return existing;
  const known = new Set(existing.map((c) => c.id));
  const fresh = buildMissionFlashcards(mission, todayIso).filter((c) => !known.has(c.id));
  return fresh.length === 0 ? existing : [...existing, ...fresh];
}

/** Rattrapage : crée les cartes des missions déjà validées qui n'en ont pas (ex. données existantes). */
export function backfillCompletedMissionFlashcards(
  existing: Flashcard[],
  missions: DailyMission[],
  completedMissionIds: string[],
  todayIso: string
): Flashcard[] {
  let cards = existing;
  for (const id of completedMissionIds) {
    const mission = missions.find((m) => m.id === id);
    if (!mission) continue;
    if (cards.some((c) => c.missionId === id || c.id.startsWith(`${id}-fc-`))) continue;
    cards = addMissionFlashcards(cards, mission, todayIso);
  }
  return cards;
}
