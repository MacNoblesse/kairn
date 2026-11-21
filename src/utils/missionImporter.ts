import { loadAll } from 'js-yaml';
import type {
  CurriculumWeek,
  DailyMission,
  DomainId,
  MissionStep,
  VerificationCheck,
} from '../types/kairn';

export const SAMPLE_S8_M5_YAML = `id: S8-M5
week: 8
day: 5
day_label: vendredi
title: 'AWS : VPC, EC2 et groupe de sécurité'
objective: Une instance accessible en SSH par clé avec un serveur web, puis détruite
duration_core_min: 90
notions:
- VPC, sous-réseau, passerelle Internet
- Groupe de sécurité
- Paire de clés et accès SSH
- Cycle de vie d'une instance
- Éteindre pour ne pas payer
resource: AWS Skill Builder — EC2 et VPC
resource_url: null
reading_max_min: 20
steps:
- Créer un groupe de sécurité limitant SSH à ton adresse
- Lancer une petite instance éligible au niveau gratuit
- Te connecter, installer Nginx et tester depuis l'extérieur
- Terminer l'instance et vérifier qu'aucune ressource ne tourne
livrable: Fiche « Lancer et détruire une instance »
mini: Dessiner le schéma VPC, sous-réseau et groupe de sécurité
verification:
  target: automated
  checks:
  - id: S8-M5-c1
    host: aws
    description: Aucune instance ne reste en cours d'exécution
    cmd: aws ec2 describe-instances --filters Name=instance-state-name,Values=running --query 'length(Reservations[])'
    expect:
      op: equals
      value: 0
    expect_text: '0'
  - id: S8-M5-c2
    host: none
    description: Page Nginx accessible depuis Internet pendant le test (capture)
    cmd: null
    expect:
      op: manual
      value: null
    expect_text: manual
extension: Remplacer l'ouverture SSH par une connexion via Session Manager
incident: 'L''instance est lancée mais injoignable : vérifier groupe de sécurité, routage et IP'
flashcards_target: 7
skill_nodes:
- aws.ec2
- aws.vpc.basics`;

interface RawCheck {
  id?: unknown;
  host?: unknown;
  description?: unknown;
  cmd?: unknown;
  expect?: {
    op?: unknown;
    value?: unknown;
  } | null;
  expect_text?: unknown;
}

interface RawMission {
  id?: unknown;
  week?: unknown;
  day?: unknown;
  day_label?: unknown;
  title?: unknown;
  objective?: unknown;
  duration_core_min?: unknown;
  notions?: unknown;
  resource?: unknown;
  resource_url?: unknown;
  reading_max_min?: unknown;
  steps?: unknown;
  livrable?: unknown;
  mini?: unknown;
  verification?: {
    target?: unknown;
    checks?: unknown;
  } | null;
  extension?: unknown;
  incident?: unknown;
  flashcards_target?: unknown;
  skill_nodes?: unknown;
}

interface RawWeek {
  week?: unknown;
  theme?: unknown;
  goal?: unknown;
  linkedin_post_idea?: unknown;
  missions?: unknown;
}

export interface ParsedImportResult {
  missions: DailyMission[];
  weeks: NormalizedWeekInternal[];
  sundayRule?: string;
}

export interface MergeCurriculumResult {
  missions: DailyMission[];
  weeks: CurriculumWeek[];
  sundayRule: string;
  addedCount: number;
  updatedCount: number;
}

export interface WeekOverviewSummary {
  week: number;
  theme: string;
  goal: string;
  linkedinPostIdea: string;
  total: number;
  completed: number;
  missions: DailyMission[];
}

export interface CurriculumStats {
  totalMissions: number;
  completedMissions: number;
  completionPercent: number;
  totalWeeks: number;
  currentWeekNumber: number;
  weekSummaries: WeekOverviewSummary[];
}

const STOP_WORDS = new Set([
  'avec',
  'dans',
  'pour',
  'sans',
  'une',
  'des',
  'les',
  'sur',
  'par',
  'plus',
  'pas',
  'est',
  'qui',
  'que',
  'son',
  'ses',
  'ton',
  'tes',
  'tout',
  'tous',
  'faire',
  'cree',
  'creer',
  'verifier',
  'fiche',
  'runbook',
]);

function toOptionalString(val: unknown): string | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .map((item) => (typeof item === 'string' ? item.trim() : String(item ?? '').trim()))
    .filter((s) => s.length > 0);
}

function toNumber(val: unknown, fallback: number): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const n = Number(val);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export function inferMissionDomain(raw: {
  skillNodes: string[];
  title: string;
  notions: string[];
}): { domain: DomainId; domainLabel: string } {
  const haystack = `${raw.skillNodes.join(' ')} ${raw.title} ${raw.notions.join(' ')}`.toLowerCase();

  if (
    haystack.includes('aws.') ||
    haystack.includes('terraform') ||
    haystack.includes('vpc') ||
    haystack.includes('ec2') ||
    haystack.includes('s3') ||
    haystack.includes('iam') ||
    haystack.includes('cloud')
  ) {
    return {
      domain: 'cloud',
      domainLabel: haystack.includes('terraform') ? 'Cloud & Terraform' : 'Cloud & AWS',
    };
  }

  if (
    haystack.includes('security') ||
    haystack.includes('wazuh') ||
    haystack.includes('nmap') ||
    haystack.includes('durcir') ||
    haystack.includes('durcissement') ||
    haystack.includes('ufw') ||
    haystack.includes('fail2ban') ||
    haystack.includes('incident') ||
    haystack.includes('cyber') ||
    haystack.includes('tls') ||
    haystack.includes('trivy')
  ) {
    return { domain: 'cyber', domainLabel: 'Cybersécurité' };
  }

  if (
    haystack.includes('docker') ||
    haystack.includes('cicd') ||
    haystack.includes('ci/cd') ||
    haystack.includes('github actions') ||
    haystack.includes('ansible') ||
    haystack.includes('pipeline') ||
    haystack.includes('kubernetes') ||
    haystack.includes('git.') ||
    haystack.includes('python') ||
    haystack.includes('portfolio') ||
    haystack.includes('cv') ||
    haystack.includes('entretien')
  ) {
    return { domain: 'devops', domainLabel: 'DevOps & Automatisation' };
  }

  if (haystack.includes('windows') || haystack.includes('active directory') || haystack.includes('powershell')) {
    return { domain: 'linux', domainLabel: 'Systèmes Windows & AD' };
  }

  return { domain: 'linux', domainLabel: 'Linux & Réseau' };
}

function extractKeywords(raw: {
  title: string;
  notions: string[];
  checks: VerificationCheck[];
  livrable?: string;
}): string[] {
  const tokens: string[] = [];
  const seen = new Set<string>();

  const pushToken = (candidate: string) => {
    const clean = candidate.toLowerCase().replace(/[^a-z0-9àâçéèêëîïôûùüÿ_-]/gi, '');
    if (clean.length < 3 || STOP_WORDS.has(clean) || seen.has(clean)) return;
    seen.add(clean);
    tokens.push(clean);
  };

  for (const c of raw.checks) {
    if (c.cmd) {
      const cmdHead = c.cmd.trim().split(/[\s(|]+/)[0];
      if (cmdHead) pushToken(cmdHead);
    }
  }

  for (const notion of raw.notions) {
    for (const word of notion.split(/[\s,:/()«»'’]+/)) {
      pushToken(word);
      if (tokens.length >= 6) break;
    }
    if (tokens.length >= 6) break;
  }

  if (tokens.length < 4) {
    for (const word of `${raw.title} ${raw.livrable ?? ''}`.split(/[\s,:/()«»'’]+/)) {
      pushToken(word);
      if (tokens.length >= 6) break;
    }
  }

  return tokens;
}

function normalizeVerificationChecks(raw: RawMission['verification']): {
  target: string;
  checks: VerificationCheck[];
} {
  if (!raw || typeof raw !== 'object') {
    return { target: 'manual', checks: [] };
  }
  const target = toOptionalString(raw.target) ?? 'manual';
  const rawChecks = Array.isArray(raw.checks) ? (raw.checks as RawCheck[]) : [];
  const checks: VerificationCheck[] = rawChecks
    .filter((c) => c && typeof c === 'object')
    .map((c, idx) => ({
      id: toOptionalString(c.id) ?? `check-${idx + 1}`,
      host: toOptionalString(c.host) ?? 'none',
      description: toOptionalString(c.description) ?? `Vérification ${idx + 1}`,
      cmd: typeof c.cmd === 'string' && c.cmd.trim().length > 0 ? c.cmd.trim() : null,
      expect: {
        op: toOptionalString(c.expect?.op) ?? 'manual',
        value:
          c.expect?.value !== undefined && c.expect?.value !== null
            ? (c.expect.value as string | number | string[])
            : null,
      },
      expectText: toOptionalString(c.expect_text) ?? 'manual',
    }));

  return { target, checks };
}

function inferIdFromWeekDay(week?: number, day?: number, fallbackIndex = 0): string {
  if (week && day) return `S${week}-M${day}`;
  return `IMP-${fallbackIndex + 1}`;
}

export function normalizeRawMission(rawInput: unknown, index = 0): DailyMission {
  if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput)) {
    throw new Error(`Mission #${index + 1} invalide : un objet structuré est attendu.`);
  }

  const raw = rawInput as RawMission;
  const title = toOptionalString(raw.title);
  if (!title) {
    throw new Error(`Mission #${index + 1} invalide : le champ "title" est requis.`);
  }

  const week = raw.week !== undefined && raw.week !== null ? toNumber(raw.week, 0) || undefined : undefined;
  const day = raw.day !== undefined && raw.day !== null ? toNumber(raw.day, 0) || undefined : undefined;
  const id = toOptionalString(raw.id) ?? inferIdFromWeekDay(week, day, index);
  const dayLabel = toOptionalString(raw.day_label);
  const objective = toOptionalString(raw.objective) ?? title;

  const rawSteps = toStringArray(raw.steps);
  if (rawSteps.length === 0 && !toOptionalString(raw.objective)) {
    throw new Error(`Mission "${id}" invalide : ajoutez au moins "steps" ou "objective".`);
  }

  const durationCore = Math.max(15, toNumber(raw.duration_core_min, 60));
  const readingMaxMin = Math.max(5, Math.min(30, toNumber(raw.reading_max_min, 20)));
  const notions = toStringArray(raw.notions);
  const livrable = toOptionalString(raw.livrable);
  const miniSummary = toOptionalString(raw.mini);
  const extension = toOptionalString(raw.extension);
  const incident = toOptionalString(raw.incident);
  const flashcardsTarget =
    raw.flashcards_target !== undefined ? toNumber(raw.flashcards_target, 5) : undefined;
  const skillNodes = toStringArray(raw.skill_nodes);
  const { target: verificationTarget, checks: verificationChecks } = normalizeVerificationChecks(
    raw.verification
  );

  const { domain, domainLabel } = inferMissionDomain({
    skillNodes,
    title,
    notions,
  });

  const baseStepList = rawSteps.length > 0 ? rawSteps : [objective];
  const steps: MissionStep[] = baseStepList.map((label, sIdx) => ({
    id: `${id}-step-${sIdx + 1}`,
    label,
    detail:
      sIdx === 0 && miniSummary
        ? `Version express : ${miniSummary}`
        : `Étape ${sIdx + 1} sur ${baseStepList.length} du cœur de mission`,
    minLevel: sIdx === 0 ? 'mini' : 'normal',
  }));

  if (extension) {
    steps.push({
      id: `${id}-step-ext`,
      label: `Extension : ${extension}`,
      detail: 'Approfondissement optionnel du mode Plus.',
      minLevel: 'plus',
    });
  }

  const resourceTitle = toOptionalString(raw.resource) ?? 'Documentation officielle recommandée';
  const resourceUrl = toOptionalString(raw.resource_url) ?? '';

  const difficulty: DailyMission['difficulty'] =
    (week && week >= 8) || durationCore >= 90
      ? 'Avancé'
      : (week && week >= 4) || durationCore >= 60
        ? 'Intermédiaire'
        : 'Débutant';

  const commonMistakes = incident
    ? [`Incident fréquent : ${incident}`]
    : ['Ne pas tester chaque étape avant de passer à la suivante.'];

  if (livrable) {
    commonMistakes.push(`Oublier de finaliser le livrable attendu : ${livrable}.`);
  }

  const progressiveHints: string[] = [];
  if (miniSummary) {
    progressiveHints.push(`Si vous bloquez, revenez à l'essentiel (mode Mini) : ${miniSummary}.`);
  }
  if (incident) {
    progressiveHints.push(`Piste de diagnostic : ${incident}.`);
  }
  if (verificationChecks.length > 0) {
    const firstCheck = verificationChecks[0];
    progressiveHints.push(
      firstCheck.cmd
        ? `Vérifiez avec la commande : ${firstCheck.cmd} (attendu : ${firstCheck.expectText}).`
        : `Contrôle attendu : ${firstCheck.description}.`
    );
  }
  if (progressiveHints.length === 0) {
    progressiveHints.push('Reprenez la première étape et notez ce que vous observez.');
  }

  const expectedKeywords = extractKeywords({
    title,
    notions,
    checks: verificationChecks,
    livrable,
  });

  const sampleParts: string[] = [];
  if (livrable) sampleParts.push(`Livrable : ${livrable}`);
  if (notions.length > 0) sampleParts.push(`Notions appliquées : ${notions.slice(0, 3).join(', ')}`);
  const cmdCheck = verificationChecks.find((c) => c.cmd);
  if (cmdCheck?.cmd) {
    sampleParts.push(`Vérification (${cmdCheck.host}) : ${cmdCheck.cmd} -> ${cmdCheck.expectText}`);
  } else {
    sampleParts.push(`Étapes validées : ${baseStepList[0]}`);
  }

  return {
    id,
    date: new Date().toISOString().slice(0, 10),
    title,
    domain,
    domainLabel,
    difficulty,
    objective,
    baseMinutes: {
      mini: Math.min(20, durationCore),
      normal: durationCore,
      plus: durationCore + 30,
    },
    steps,
    briefing: {
      keyNotions: notions.length > 0 ? notions : [objective],
      commonMistakes,
    },
    resource: {
      title: resourceTitle,
      url: resourceUrl,
      summary: `${objective}${livrable ? ` · Livrable : ${livrable}` : ''}`,
    },
    progressiveHints,
    expectedKeywords,
    sampleSolution: sampleParts.join('\n'),
    week,
    day,
    dayLabel,
    readingMaxMin,
    livrable,
    miniSummary,
    extension,
    incident,
    flashcardsTarget,
    skillNodes,
    verificationTarget,
    verificationChecks,
  };
}

interface NormalizedWeekInternal extends CurriculumWeek {
  hasExplicitMeta?: boolean;
}

function normalizeRawWeeks(rawWeeks: unknown, missions: DailyMission[]): NormalizedWeekInternal[] {
  const weekMap = new Map<number, NormalizedWeekInternal>();

  if (Array.isArray(rawWeeks)) {
    for (const item of rawWeeks as RawWeek[]) {
      if (!item || typeof item !== 'object') continue;
      const weekNum = toNumber(item.week, 0);
      if (weekNum <= 0) continue;
      weekMap.set(weekNum, {
        week: weekNum,
        theme: toOptionalString(item.theme) ?? `Semaine ${weekNum}`,
        goal: toOptionalString(item.goal) ?? 'Consolidation pratique des acquis',
        linkedinPostIdea: toOptionalString(item.linkedin_post_idea) ?? '',
        missionIds: toStringArray(item.missions),
        hasExplicitMeta: true,
      });
    }
  }

  for (const m of missions) {
    const wNum = m.week ?? 0;
    if (wNum <= 0) continue;
    const existing = weekMap.get(wNum);
    if (!existing) {
      weekMap.set(wNum, {
        week: wNum,
        theme: m.domainLabel,
        goal: m.objective,
        linkedinPostIdea: '',
        missionIds: [m.id],
        hasExplicitMeta: false,
      });
    } else if (!existing.missionIds.includes(m.id)) {
      existing.missionIds.push(m.id);
    }
  }

  return Array.from(weekMap.values()).sort((a, b) => a.week - b.week);
}

export function parseMissionsInput(rawText: string): ParsedImportResult {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error('Collez un contenu YAML ou JSON, ou sélectionnez un fichier à importer.');
  }

  let docs: unknown[] = [];

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      docs = [JSON.parse(trimmed)];
    } catch (err) {
      throw new Error(
        `JSON invalide : ${err instanceof Error ? err.message : 'syntaxe incorrecte'}.`
      );
    }
  } else {
    try {
      const loaded: unknown[] = [];
      loadAll(trimmed, (doc) => {
        if (doc !== null && doc !== undefined) {
          loaded.push(doc);
        }
      });
      docs = loaded;
    } catch (err) {
      throw new Error(
        `YAML invalide : ${err instanceof Error ? err.message : 'indentation ou syntaxe incorrecte'}.`
      );
    }
  }

  if (docs.length === 0) {
    throw new Error('Aucune donnée détectée dans le fichier ou texte saisi.');
  }

  // Case 1: Full curriculum bundle { index: { version, sunday, weeks }, missions: [...] }
  if (
    docs.length === 1 &&
    docs[0] &&
    typeof docs[0] === 'object' &&
    !Array.isArray(docs[0]) &&
    'missions' in (docs[0] as Record<string, unknown>) &&
    Array.isArray((docs[0] as Record<string, unknown>).missions)
  ) {
    const bundle = docs[0] as {
      index?: { sunday?: unknown; weeks?: unknown };
      missions: unknown[];
    };
    const missions = bundle.missions.map((m, idx) => normalizeRawMission(m, idx));
    if (missions.length === 0) {
      throw new Error('Le tableau "missions" est vide.');
    }
    const weeks = normalizeRawWeeks(bundle.index?.weeks, missions);
    const sundayRule = toOptionalString(bundle.index?.sunday);
    return { missions, weeks, sundayRule };
  }

  // Case 2: Array of missions [ {...}, {...} ]
  const rawList: unknown[] =
    docs.length === 1 && Array.isArray(docs[0]) ? (docs[0] as unknown[]) : docs;

  if (rawList.length === 0) {
    throw new Error('Aucune mission trouvée dans la liste.');
  }

  const missions = rawList.map((item, idx) => normalizeRawMission(item, idx));
  const weeks = normalizeRawWeeks(undefined, missions);
  return { missions, weeks };
}

export function mergeImportedCurriculum(
  existingMissions: DailyMission[],
  existingWeeks: CurriculumWeek[],
  existingSundayRule: string,
  parsed: ParsedImportResult
): MergeCurriculumResult {
  const missionMap = new Map<string, DailyMission>();
  for (const m of existingMissions) {
    missionMap.set(m.id, m);
  }

  let addedCount = 0;
  let updatedCount = 0;

  for (const incoming of parsed.missions) {
    if (missionMap.has(incoming.id)) {
      updatedCount += 1;
    } else {
      addedCount += 1;
    }
    missionMap.set(incoming.id, incoming);
  }

  const missions = Array.from(missionMap.values()).sort((a, b) => {
    const wa = a.week ?? 999;
    const wb = b.week ?? 999;
    if (wa !== wb) return wa - wb;
    const da = a.day ?? 999;
    const db = b.day ?? 999;
    if (da !== db) return da - db;
    return a.id.localeCompare(b.id);
  });

  const weekMap = new Map<number, CurriculumWeek>();
  for (const w of existingWeeks) {
    weekMap.set(w.week, { ...w, missionIds: [...w.missionIds] });
  }

  for (const incomingWeek of parsed.weeks) {
    const prev = weekMap.get(incomingWeek.week);
    if (!prev) {
      weekMap.set(incomingWeek.week, {
        week: incomingWeek.week,
        theme: incomingWeek.theme,
        goal: incomingWeek.goal,
        linkedinPostIdea: incomingWeek.linkedinPostIdea,
        missionIds: [...incomingWeek.missionIds],
      });
    } else {
      const mergedIds = Array.from(new Set([...prev.missionIds, ...incomingWeek.missionIds]));
      const useIncomingMeta = Boolean(incomingWeek.hasExplicitMeta);
      weekMap.set(incomingWeek.week, {
        week: incomingWeek.week,
        theme: useIncomingMeta ? incomingWeek.theme || prev.theme : prev.theme || incomingWeek.theme,
        goal: useIncomingMeta ? incomingWeek.goal || prev.goal : prev.goal || incomingWeek.goal,
        linkedinPostIdea: incomingWeek.linkedinPostIdea || prev.linkedinPostIdea,
        missionIds: mergedIds,
      });
    }
  }

  // Ensure any mission with a week appears in its week's missionIds
  for (const m of missions) {
    if (!m.week) continue;
    const wk = weekMap.get(m.week);
    if (!wk) {
      weekMap.set(m.week, {
        week: m.week,
        theme: m.domainLabel,
        goal: m.objective,
        linkedinPostIdea: '',
        missionIds: [m.id],
      });
    } else if (!wk.missionIds.includes(m.id)) {
      wk.missionIds.push(m.id);
    }
  }

  const weeks = Array.from(weekMap.values()).sort((a, b) => a.week - b.week);

  return {
    missions,
    weeks,
    sundayRule: parsed.sundayRule || existingSundayRule,
    addedCount,
    updatedCount,
  };
}

export function getCurriculumOverviewStats(
  weeks: CurriculumWeek[],
  missions: DailyMission[],
  completedMissionIds: string[]
): CurriculumStats {
  const completedSet = new Set(completedMissionIds);
  const missionById = new Map(missions.map((m) => [m.id, m]));

  // Only count structured curriculum missions if weeks exist, otherwise all missions
  const structuredMissions = missions.filter((m) => m.week !== undefined);
  const pool = structuredMissions.length > 0 ? structuredMissions : missions;

  const weekSummaries: WeekOverviewSummary[] = weeks.map((w) => {
    const weekMissions = w.missionIds
      .map((id) => missionById.get(id))
      .filter((m): m is DailyMission => Boolean(m))
      .sort((a, b) => (a.day ?? 99) - (b.day ?? 99));

    const completed = weekMissions.filter((m) => completedSet.has(m.id)).length;
    return {
      week: w.week,
      theme: w.theme,
      goal: w.goal,
      linkedinPostIdea: w.linkedinPostIdea,
      total: weekMissions.length,
      completed,
      missions: weekMissions,
    };
  });

  const completedMissions = pool.filter((m) => completedSet.has(m.id)).length;
  const totalMissions = pool.length;
  const completionPercent =
    totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;

  const firstIncompleteWeek =
    weekSummaries.find((w) => w.total > 0 && w.completed < w.total)?.week ??
    weekSummaries[0]?.week ??
    1;

  return {
    totalMissions,
    completedMissions,
    completionPercent,
    totalWeeks: weekSummaries.length,
    currentWeekNumber: firstIncompleteWeek,
    weekSummaries,
  };
}
