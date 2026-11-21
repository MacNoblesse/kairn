import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { CurriculumWeek, DailyMission, DomainId } from '../types/kairn';
import {
  getCurriculumOverviewStats,
  parseMissionsInput,
  SAMPLE_S8_M5_YAML,
  type ParsedImportResult,
} from '../utils/missionImporter';
import { EmptyState } from './SpecialStates';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Upload,
  FileText,
  Terminal,
  Search,
  Map,
  ShieldAlert,
  PackageCheck,
  Sparkles,
  Play,
  Copy,
  Check,
  X,
} from './Icons';

interface CurriculumOverviewScreenProps {
  weeks: CurriculumWeek[];
  missions: DailyMission[];
  sundayRule: string;
  activeMissionId: string;
  completedMissionIds: string[];
  isOffline: boolean;
  onImportParsed: (parsed: ParsedImportResult, mode: 'merge' | 'replace') => {
    addedCount: number;
    updatedCount: number;
  };
  onActivateMission: (missionId: string, openGuide?: boolean) => void;
  onToggleMissionCompleted: (missionId: string) => void;
  onSendLinkedinIdeaToCareer: (idea: string) => void;
}

const DOMAIN_FILTERS: Array<{ id: 'all' | DomainId; label: string }> = [
  { id: 'all', label: 'Tout' },
  { id: 'cloud', label: 'Cloud' },
  { id: 'devops', label: 'DevOps' },
  { id: 'cyber', label: 'Cyber' },
  { id: 'linux', label: 'Linux & Systèmes' },
];

export function CurriculumOverviewScreen({
  weeks,
  missions,
  sundayRule,
  activeMissionId,
  completedMissionIds,
  isOffline,
  onImportParsed,
  onActivateMission,
  onToggleMissionCompleted,
  onSendLinkedinIdeaToCareer,
}: CurriculumOverviewScreenProps) {
  const stats = useMemo(
    () => getCurriculumOverviewStats(weeks, missions, completedMissionIds),
    [weeks, missions, completedMissionIds]
  );

  const activeMission = missions.find((m) => m.id === activeMissionId);
  const initialWeek = activeMission?.week ?? stats.currentWeekNumber;

  const [expandedWeek, setExpandedWeek] = useState<number | null>(initialWeek);
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState<'all' | DomainId>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Import panel state
  const [importOpen, setImportOpen] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [loadingBundle, setLoadingBundle] = useState(false);
  const [copiedCmdId, setCopiedCmdId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const completedSet = useMemo(() => new Set(completedMissionIds), [completedMissionIds]);

  const previewResult = useMemo<{
    parsed: ParsedImportResult | null;
    error: string | null;
  }>(() => {
    if (!rawInput.trim()) return { parsed: null, error: null };
    try {
      const parsed = parseMissionsInput(rawInput);
      return { parsed, error: null };
    } catch (err) {
      return {
        parsed: null,
        error: err instanceof Error ? err.message : 'Format non reconnu.',
      };
    }
  }, [rawInput]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredWeeks = useMemo(() => {
    return stats.weekSummaries
      .map((wk) => {
        const filteredMissions = wk.missions.filter((m) => {
          const matchesDomain = domainFilter === 'all' || m.domain === domainFilter;
          if (!matchesDomain) return false;
          if (!normalizedQuery) return true;
          const haystack = [
            m.id,
            m.title,
            m.objective,
            m.domainLabel,
            m.livrable ?? '',
            ...(m.skillNodes ?? []),
            ...m.briefing.keyNotions,
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(normalizedQuery);
        });
        return {
          ...wk,
          filteredMissions,
        };
      })
      .filter((wk) =>
        normalizedQuery || domainFilter !== 'all' ? wk.filteredMissions.length > 0 : true
      );
  }, [stats.weekSummaries, domainFilter, normalizedQuery]);

  const standaloneMissions = useMemo(() => {
    return missions.filter((m) => {
      if (m.week !== undefined) return false;
      const matchesDomain = domainFilter === 'all' || m.domain === domainFilter;
      if (!matchesDomain) return false;
      if (!normalizedQuery) return true;
      return `${m.id} ${m.title} ${m.objective} ${m.domainLabel}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [missions, domainFilter, normalizedQuery]);

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setRawInput(text);
      setImportStatus(null);
    } catch {
      setImportStatus('Impossible de lire ce fichier.');
    } finally {
      e.target.value = '';
    }
  }

  async function handleLoadBundledProgram() {
    if (isOffline) {
      setImportStatus('Mode hors ligne : le chargement réseau du programme complet est indisponible.');
      return;
    }
    setLoadingBundle(true);
    setImportStatus(null);
    try {
      const res = await fetch('/assets/aistudio/missions_all_f7e3203a.json');
      if (!res.ok) throw new Error('Fichier programme introuvable.');
      const text = await res.text();
      const parsed = parseMissionsInput(text);
      const result = onImportParsed(parsed, 'merge');
      setImportStatus(
        `Programme chargé : ${parsed.missions.length} missions sur ${parsed.weeks.length} semaines (${result.addedCount} ajoutées, ${result.updatedCount} mises à jour).`
      );
      setImportOpen(false);
    } catch (err) {
      setImportStatus(
        err instanceof Error ? err.message : 'Erreur lors du chargement du programme.'
      );
    } finally {
      setLoadingBundle(false);
    }
  }

  function handleConfirmImport(mode: 'merge' | 'replace') {
    if (!previewResult.parsed) return;
    const { addedCount, updatedCount } = onImportParsed(previewResult.parsed, mode);
    const firstImported = previewResult.parsed.missions[0];
    if (firstImported?.week) {
      setExpandedWeek(firstImported.week);
      setExpandedMissionId(firstImported.id);
    }
    setImportStatus(
      mode === 'replace'
        ? `Programme remplacé : ${previewResult.parsed.missions.length} mission${previewResult.parsed.missions.length > 1 ? 's' : ''} importée${previewResult.parsed.missions.length > 1 ? 's' : ''}.`
        : `Import réussi : ${addedCount} ajoutée${addedCount > 1 ? 's' : ''}, ${updatedCount} mise${updatedCount > 1 ? 's' : ''} à jour.`
    );
    setRawInput('');
    setImportOpen(false);
  }

  function handleCopyCmd(checkId: string, cmd: string) {
    navigator.clipboard?.writeText(cmd).catch(() => {});
    setCopiedCmdId(checkId);
    window.setTimeout(() => setCopiedCmdId(null), 1500);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header + Primary Import CTA */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--kairn-text)]">
            Vue d’ensemble du programme
          </h2>
          <p className="text-sm text-[var(--kairn-text-muted)]">
            Feuille de route par semaine, progression globale et import YAML / JSON
          </p>
        </div>

        <button
          type="button"
          onClick={() => setImportOpen((prev) => !prev)}
          aria-expanded={importOpen}
          className="min-h-[48px] px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shrink-0 transition-colors cursor-pointer"
        >
          {importOpen ? (
            <>
              <X className="w-4 h-4" aria-hidden="true" />
              <span>Fermer l’import</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>Importer YAML / JSON</span>
            </>
          )}
        </button>
      </section>

      {importStatus && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center justify-between gap-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          <span>{importStatus}</span>
          <button
            type="button"
            onClick={() => setImportStatus(null)}
            aria-label="Fermer la notification"
            className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center hover:bg-emerald-500/10 cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Import Drawer / Panel */}
      {importOpen && (
        <section
          aria-label="Importer des missions YAML ou JSON"
          className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 sm:p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[var(--kairn-text)]">
                Importer des missions (YAML ou JSON)
              </h3>
              <p className="text-xs text-[var(--kairn-text-muted)] mt-0.5">
                Formats acceptés : mission YAML (ex. S8-M5), liste de missions ou programme complet
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setRawInput(SAMPLE_S8_M5_YAML);
                  setImportStatus(null);
                }}
                className="min-h-[40px] px-3 rounded-xl bg-[var(--kairn-surface-high)] hover:opacity-90 text-xs font-semibold text-[var(--kairn-primary)] cursor-pointer"
              >
                Exemple YAML (S8-M5)
              </button>
              <button
                type="button"
                onClick={handleLoadBundledProgram}
                disabled={loadingBundle}
                className="min-h-[40px] px-3 rounded-xl bg-[var(--kairn-surface-high)] hover:opacity-90 text-xs font-semibold text-[var(--kairn-text)] cursor-pointer disabled:opacity-50"
              >
                {loadingBundle ? 'Chargement...' : 'Charger les 12 semaines (72)'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".yaml,.yml,.json,application/json,text/yaml"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Choisir un fichier YAML ou JSON"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[40px] px-3 rounded-xl border border-[var(--kairn-border)] hover:bg-[var(--kairn-surface-high)] text-xs font-semibold text-[var(--kairn-text)] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Fichier .yaml / .json</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="mission-import-textarea" className="text-xs font-medium text-[var(--kairn-text-muted)]">
              Collez votre YAML ou JSON ci-dessous
            </label>
            <textarea
              id="mission-import-textarea"
              rows={9}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={`id: S8-M5\nweek: 8\nday: 5\nday_label: vendredi\ntitle: 'AWS : VPC, EC2 et groupe de sécurité'\n...`}
              className="w-full rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface-low)] p-3.5 text-xs font-mono text-[var(--kairn-text)] placeholder:text-[var(--kairn-text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {previewResult.error && (
            <div
              role="alert"
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-300"
            >
              {previewResult.error}
            </div>
          )}

          {previewResult.parsed && (
            <div className="rounded-xl bg-[var(--kairn-surface-high)] px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Prêt à importer : {previewResult.parsed.missions.length} mission
                {previewResult.parsed.missions.length > 1 ? 's' : ''}
                {previewResult.parsed.weeks.length > 0
                  ? ` · ${previewResult.parsed.weeks.length} semaine${previewResult.parsed.weeks.length > 1 ? 's' : ''}`
                  : ''}
              </p>
              <ul className="space-y-1 text-xs text-[var(--kairn-text-muted)]">
                {previewResult.parsed.missions.slice(0, 3).map((m) => (
                  <li key={m.id} className="truncate">
                    • <span className="font-semibold text-[var(--kairn-text)]">{m.id}</span> — {m.title} ({m.domainLabel})
                  </li>
                ))}
                {previewResult.parsed.missions.length > 3 && (
                  <li>• et {previewResult.parsed.missions.length - 3} autres missions...</li>
                )}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
            {rawInput && (
              <button
                type="button"
                onClick={() => setRawInput('')}
                className="min-h-[44px] px-4 rounded-xl text-xs font-medium text-[var(--kairn-text-muted)] hover:text-[var(--kairn-text)] cursor-pointer"
              >
                Effacer
              </button>
            )}
            <button
              type="button"
              disabled={!previewResult.parsed}
              onClick={() => handleConfirmImport('replace')}
              className="min-h-[44px] px-4 rounded-xl border border-[var(--kairn-border)] hover:bg-[var(--kairn-surface-high)] text-xs font-semibold text-[var(--kairn-text)] disabled:opacity-40 cursor-pointer"
            >
              Remplacer tout
            </button>
            <button
              type="button"
              disabled={!previewResult.parsed}
              onClick={() => handleConfirmImport('merge')}
              className="min-h-[44px] px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              Importer et fusionner
            </button>
          </div>
        </section>
      )}

      {/* Overall KPI Strip */}
      <section className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium text-[var(--kairn-text-muted)]">Avancement</p>
            <p className="text-xl sm:text-2xl font-bold tabular-nums text-[var(--kairn-text)] mt-1">
              {stats.completedMissions}/{stats.totalMissions}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">
              {stats.completionPercent}% validées
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-[var(--kairn-text-muted)]">Durée du parcours</p>
            <p className="text-xl sm:text-2xl font-bold tabular-nums text-[var(--kairn-text)] mt-1">
              {stats.totalWeeks} sem.
            </p>
            <p className="text-xs text-[var(--kairn-text-muted)]">
              Cap actuel : S{stats.currentWeekNumber}
            </p>
          </div>

          <div className="col-span-2 sm:col-span-1 min-w-0">
            <p className="text-xs font-medium text-[var(--kairn-text-muted)]">Mission du jour</p>
            <p className="text-sm sm:text-base font-bold text-[var(--kairn-text)] truncate mt-1.5">
              {activeMission
                ? activeMission.week
                  ? `${activeMission.id} · ${activeMission.title}`
                  : activeMission.title
                : 'Aucune sélectionnée'}
            </p>
            <p className="text-xs text-[var(--kairn-primary)] truncate">
              {activeMission ? activeMission.domainLabel : 'Sélectionnez une mission'}
            </p>
          </div>
        </div>

        <div className="h-2 w-full rounded-full bg-[var(--kairn-surface-high)] overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
            style={{ width: `${stats.completionPercent}%` }}
          />
        </div>

        {sundayRule && (
          <p className="text-xs text-[var(--kairn-text-muted)] leading-relaxed">
            <span className="font-semibold text-[var(--kairn-text)]">Dimanche :</span>{' '}
            {sundayRule.replace(/^Revue de la semaine \(pas de mission\)\s*:\s*/i, '')}
          </p>
        )}
      </section>

      {/* Bird's-Eye 12-Week Matrix Overview */}
      {stats.weekSummaries.length > 0 && (
        <section aria-labelledby="matrix-title" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 id="matrix-title" className="text-sm font-semibold text-[var(--kairn-text)]">
              Carte des semaines
            </h3>
            <span className="text-xs text-[var(--kairn-text-muted)]">
              Touchez une semaine pour la détailler
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {stats.weekSummaries.map((wk) => {
              const isSelected = expandedWeek === wk.week;
              const isAllDone = wk.total > 0 && wk.completed === wk.total;
              const hasActive = wk.missions.some((m) => m.id === activeMissionId);

              return (
                <button
                  key={wk.week}
                  type="button"
                  onClick={() => {
                    setExpandedWeek(wk.week);
                    setDomainFilter('all');
                    setSearchQuery('');
                  }}
                  aria-pressed={isSelected}
                  className={`min-h-[76px] p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-indigo-500/70 bg-[var(--kairn-primary-soft)]'
                      : 'border-[var(--kairn-border)] bg-[var(--kairn-surface)] hover:bg-[var(--kairn-surface-high)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold tabular-nums text-[var(--kairn-text)]">
                      S{wk.week}
                    </span>
                    <span
                      className={`text-[11px] font-semibold tabular-nums ${
                        isAllDone
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : hasActive
                            ? 'text-[var(--kairn-primary)]'
                            : 'text-[var(--kairn-text-muted)]'
                      }`}
                    >
                      {wk.completed}/{wk.total}
                    </span>
                  </div>

                  {/* 6-slot mini completion indicator */}
                  <div className="grid grid-cols-6 gap-1" aria-hidden="true">
                    {wk.missions.slice(0, 6).map((m) => {
                      const done = completedSet.has(m.id);
                      const isCurrent = m.id === activeMissionId;
                      return (
                        <span
                          key={m.id}
                          className={`h-1.5 rounded-full ${
                            done
                              ? 'bg-emerald-500 dark:bg-emerald-400'
                              : isCurrent
                                ? 'bg-indigo-500'
                                : 'bg-[var(--kairn-border)]'
                          }`}
                        />
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-[var(--kairn-text-muted)] truncate leading-tight">
                    {wk.theme}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Search & Domain Filter */}
      <section className="space-y-3">
        <div className="relative">
          <Search
            className="w-4 h-4 text-[var(--kairn-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer par mot-clé, ID (S8-M5), outil (AWS, Terraform, Wazuh)..."
            aria-label="Rechercher une mission dans le programme"
            className="w-full min-h-[46px] rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface)] pl-10 pr-4 text-sm text-[var(--kairn-text)] placeholder:text-[var(--kairn-text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div
          role="group"
          aria-label="Filtrer par domaine technique"
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
      </section>

      {/* Weeks & Missions List */}
      {filteredWeeks.length === 0 && standaloneMissions.length === 0 ? (
        <EmptyState
          icon={<Map className="w-6 h-6" aria-hidden="true" />}
          title="Aucune mission trouvée"
          description="Aucun résultat ne correspond à ce filtre, ou aucun programme n’est encore chargé."
          actionLabel={
            searchQuery || domainFilter !== 'all'
              ? 'Réinitialiser les filtres'
              : 'Charger les 12 semaines'
          }
          onAction={() => {
            if (searchQuery || domainFilter !== 'all') {
              setSearchQuery('');
              setDomainFilter('all');
            } else {
              handleLoadBundledProgram();
            }
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredWeeks.map((wk) => {
            const isSearching = Boolean(normalizedQuery || domainFilter !== 'all');
            const isOpen = isSearching || expandedWeek === wk.week;

            return (
              <section
                key={wk.week}
                className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedWeek(isOpen && !isSearching ? null : wk.week)}
                  aria-expanded={isOpen}
                  className="w-full min-h-[72px] px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-[var(--kairn-surface-high)] transition-colors cursor-pointer"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--kairn-text-muted)] tabular-nums">
                      <span className="font-semibold text-[var(--kairn-primary)]">
                        Semaine {wk.week}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {wk.completed}/{wk.total} validée{wk.completed > 1 ? 's' : ''}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[var(--kairn-text)]">
                      {wk.theme}
                    </h3>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-[var(--kairn-text-muted)] shrink-0" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[var(--kairn-text-muted)] shrink-0" aria-hidden="true" />
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-[var(--kairn-border)]">
                    {/* Week Goal & LinkedIn Post Idea */}
                    <div className="px-5 py-4 bg-[var(--kairn-surface-low)] space-y-2 border-b border-[var(--kairn-border)]">
                      <p className="text-xs text-[var(--kairn-text-muted)] leading-relaxed">
                        <span className="font-semibold text-[var(--kairn-text)]">Objectif :</span>{' '}
                        {wk.goal}
                      </p>
                      {wk.linkedinPostIdea && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <p className="text-xs text-[var(--kairn-text-muted)]">
                            <span className="font-semibold text-[var(--kairn-text)]">Idée LinkedIn :</span>{' '}
                            {wk.linkedinPostIdea}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              onSendLinkedinIdeaToCareer(
                                `${wk.linkedinPostIdea}\n\nSemaine ${wk.week} (${wk.theme}) : ${wk.goal}`
                              )
                            }
                            className="text-xs font-semibold text-[var(--kairn-primary)] hover:underline min-h-[32px] px-1 cursor-pointer shrink-0"
                          >
                            Rédiger dans Carrière
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Missions of the Week */}
                    <div className="divide-y divide-[var(--kairn-border)]">
                      {wk.filteredMissions.map((m) => {
                        const isCompleted = completedSet.has(m.id);
                        const isActive = m.id === activeMissionId;
                        const isExpanded = expandedMissionId === m.id;

                        return (
                          <article key={m.id} className="p-4 sm:px-5 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => onToggleMissionCompleted(m.id)}
                                  aria-label={
                                    isCompleted
                                      ? `Marquer ${m.id} comme à faire`
                                      : `Marquer ${m.id} comme validée`
                                  }
                                  className="min-w-[36px] min-h-[36px] -ml-1.5 -mt-1 rounded-xl flex items-center justify-center hover:bg-[var(--kairn-surface-high)] transition-colors cursor-pointer shrink-0"
                                >
                                  {isCompleted ? (
                                    <CheckCircle2
                                      className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <Circle
                                      className={`w-5 h-5 ${
                                        isActive
                                          ? 'text-[var(--kairn-primary)]'
                                          : 'text-[var(--kairn-text-muted)]'
                                      }`}
                                      aria-hidden="true"
                                    />
                                  )}
                                </button>

                                <div className="min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-[var(--kairn-text-muted)] tabular-nums">
                                    <span className="font-semibold text-[var(--kairn-text)]">
                                      {m.id}
                                    </span>
                                    {m.dayLabel && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="capitalize">{m.dayLabel}</span>
                                      </>
                                    )}
                                    <span aria-hidden="true">·</span>
                                    <span>{m.domainLabel}</span>
                                    <span aria-hidden="true">·</span>
                                    <span>{m.baseMinutes.normal} min</span>
                                    {isActive && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="text-[var(--kairn-primary)] font-semibold">
                                          Active aujourd’hui
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  <h4 className="text-sm sm:text-base font-semibold text-[var(--kairn-text)]">
                                    {m.title}
                                  </h4>
                                  <p className="text-xs sm:text-sm text-[var(--kairn-text-muted)] leading-relaxed">
                                    {m.objective}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Action Row */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pl-8">
                              <button
                                type="button"
                                onClick={() => setExpandedMissionId(isExpanded ? null : m.id)}
                                aria-expanded={isExpanded}
                                className="min-h-[38px] px-3 rounded-xl bg-[var(--kairn-surface-high)] text-xs font-medium text-[var(--kairn-text)] inline-flex items-center gap-1.5 hover:opacity-90 cursor-pointer"
                              >
                                <span>{isExpanded ? 'Masquer détails' : 'Voir le détail'}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                                )}
                              </button>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onActivateMission(m.id, false)}
                                  className="min-h-[38px] px-3 rounded-xl border border-[var(--kairn-border)] hover:bg-[var(--kairn-surface-high)] text-xs font-semibold text-[var(--kairn-text)] cursor-pointer"
                                >
                                  {isActive ? 'Voir sur Aujourd’hui' : 'Activer aujourd’hui'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onActivateMission(m.id, true)}
                                  className="min-h-[38px] px-3.5 rounded-xl bg-[var(--kairn-primary-soft)] text-xs font-semibold text-[var(--kairn-primary)] inline-flex items-center gap-1.5 hover:opacity-90 cursor-pointer"
                                >
                                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Ouvrir le guide</span>
                                </button>
                              </div>
                            </div>

                            {/* Expanded Mission Details */}
                            {isExpanded && (
                              <div className="ml-8 rounded-2xl bg-[var(--kairn-surface-low)] border border-[var(--kairn-border)] p-4 space-y-4">
                                {/* Notions & Steps */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-[var(--kairn-text-muted)]">
                                      Notions abordées
                                    </p>
                                    <ul className="space-y-1 text-xs text-[var(--kairn-text)]">
                                      {m.briefing.keyNotions.map((n, i) => (
                                        <li key={i} className="flex items-start gap-1.5">
                                          <span className="text-[var(--kairn-primary)] font-bold">•</span>
                                          <span>{n}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-[var(--kairn-text-muted)]">
                                      Étapes prévues
                                    </p>
                                    <ol className="space-y-1 text-xs text-[var(--kairn-text)] list-decimal list-inside">
                                      {m.steps
                                        .filter((s) => s.minLevel !== 'plus')
                                        .map((s) => (
                                          <li key={s.id}>{s.label}</li>
                                        ))}
                                    </ol>
                                  </div>
                                </div>

                                {/* Livrable, Mini & Extension */}
                                <div className="space-y-2 text-xs">
                                  {m.livrable && (
                                    <div className="flex items-start gap-2 text-[var(--kairn-text)]">
                                      <PackageCheck
                                        className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                                        aria-hidden="true"
                                      />
                                      <span>
                                        <span className="font-semibold">Livrable :</span> {m.livrable}
                                      </span>
                                    </div>
                                  )}
                                  {m.miniSummary && (
                                    <div className="flex items-start gap-2 text-[var(--kairn-text-muted)]">
                                      <Sparkles
                                        className="w-4 h-4 text-[var(--kairn-primary)] shrink-0 mt-0.5"
                                        aria-hidden="true"
                                      />
                                      <span>
                                        <span className="font-semibold text-[var(--kairn-text)]">Mode Mini :</span>{' '}
                                        {m.miniSummary}
                                      </span>
                                    </div>
                                  )}
                                  {m.extension && (
                                    <div className="flex items-start gap-2 text-[var(--kairn-text-muted)]">
                                      <Sparkles
                                        className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5"
                                        aria-hidden="true"
                                      />
                                      <span>
                                        <span className="font-semibold text-[var(--kairn-text)]">Extension :</span>{' '}
                                        {m.extension}
                                      </span>
                                    </div>
                                  )}
                                  {m.incident && (
                                    <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                                      <span>
                                        <span className="font-semibold">Incident type :</span> {m.incident}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Verification Checks */}
                                {m.verificationChecks && m.verificationChecks.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-[var(--kairn-text-muted)] flex items-center gap-1.5">
                                      <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
                                      <span>Contrôles de vérification ({m.verificationTarget ?? 'manual'})</span>
                                    </p>
                                    <div className="space-y-2">
                                      {m.verificationChecks.map((chk) => (
                                        <div
                                          key={chk.id}
                                          className="rounded-xl bg-[var(--kairn-surface)] border border-[var(--kairn-border)] p-3 space-y-1.5"
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
                                            <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--kairn-surface-high)] px-2.5 py-1.5">
                                              <code className="text-[11px] font-mono text-[var(--kairn-text)] overflow-x-auto">
                                                {chk.cmd}
                                              </code>
                                              <button
                                                type="button"
                                                onClick={() => handleCopyCmd(chk.id, chk.cmd!)}
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

                                {/* Resource & Metadata Footer */}
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[var(--kairn-text-muted)]">
                                  <span>Ressource : {m.resource.title}</span>
                                  <span>
                                    {m.flashcardsTarget ? `${m.flashcardsTarget} cartes cibles` : ''}
                                    {m.skillNodes?.length ? ` · ${m.skillNodes.join(', ')}` : ''}
                                  </span>
                                </div>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            );
          })}

          {standaloneMissions.length > 0 && (
            <section className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--kairn-border)]">
                <h3 className="text-sm font-semibold text-[var(--kairn-text)]">
                  Missions complémentaires ({standaloneMissions.length})
                </h3>
              </div>
              <div className="divide-y divide-[var(--kairn-border)]">
                {standaloneMissions.map((m) => {
                  const isActive = m.id === activeMissionId;
                  return (
                    <div
                      key={m.id}
                      className="px-5 py-4 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-medium text-[var(--kairn-text-muted)]">
                          {m.domainLabel} · {m.baseMinutes.normal} min
                        </p>
                        <p className="text-sm font-semibold text-[var(--kairn-text)]">{m.title}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onActivateMission(m.id, false)}
                        className="min-h-[40px] px-3.5 rounded-xl bg-[var(--kairn-primary-soft)] text-xs font-semibold text-[var(--kairn-primary)] cursor-pointer"
                      >
                        {isActive ? 'Active aujourd’hui' : 'Activer aujourd’hui'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
