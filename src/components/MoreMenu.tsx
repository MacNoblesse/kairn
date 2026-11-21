import type { SubView } from '../types/kairn';
import {
  BookOpen,
  Briefcase,
  Mic,
  Inbox,
  Settings,
  CalendarCheck,
  Code2,
  ChevronRight,
  Map,
} from './Icons';

interface MoreMenuProps {
  curriculumWeeksCount: number;
  importedMissionsCount: number;
  historyCount: number;
  runbooksCount: number;
  applicationsCount: number;
  ideasCount: number;
  onNavigateSubView: (view: SubView) => void;
}

export function MoreMenu({
  curriculumWeeksCount,
  importedMissionsCount,
  historyCount,
  runbooksCount,
  applicationsCount,
  ideasCount,
  onNavigateSubView,
}: MoreMenuProps) {
  const items: Array<{
    title: string;
    subtitle: string;
    icon: typeof BookOpen;
    target: SubView;
  }> = [
    {
      title: 'Programme & Import',
      subtitle: `${curriculumWeeksCount} semaines · ${importedMissionsCount} missions · Import YAML/JSON`,
      icon: Map,
      target: { type: 'curriculum' },
    },
    {
      title: 'Historique des missions',
      subtitle: `${historyCount} missions passées et notes enregistrées`,
      icon: CalendarCheck,
      target: { type: 'history' },
    },
    {
      title: 'Fiches',
      subtitle: `${runbooksCount} runbooks Docker, Linux & Kubernetes`,
      icon: BookOpen,
      target: { type: 'runbooks' },
    },
    {
      title: 'Carrière',
      subtitle: `${applicationsCount} candidatures suivies · Brouillons LinkedIn`,
      icon: Briefcase,
      target: { type: 'career' },
    },
    {
      title: 'Anglais',
      subtitle: 'Pratique orale technique & enregistrement vocal',
      icon: Mic,
      target: { type: 'english' },
    },
    {
      title: 'Plus tard',
      subtitle: `${ideasCount} idée${ideasCount > 1 ? 's' : ''} en attente sans vous distraire`,
      icon: Inbox,
      target: { type: 'later' },
    },
    {
      title: 'Revue du dimanche',
      subtitle: 'Bilan calme : réussites, blocages et objectifs',
      icon: CalendarCheck,
      target: { type: 'sunday_review' },
    },
    {
      title: 'Réglages',
      subtitle: 'Thème sombre/clair, profil et aperçu des états',
      icon: Settings,
      target: { type: 'settings' },
    },
    {
      title: 'Tokens de design',
      subtitle: 'Palette M3, typographie, grille 8pt et rayons React',
      icon: Code2,
      target: { type: 'tokens' },
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--kairn-text)]">Plus</h1>
        <p className="text-sm text-[var(--kairn-text-muted)]">
          Outils complémentaires, carrière et préférences
        </p>
      </div>

      <div className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] divide-y divide-[var(--kairn-border)] overflow-hidden">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              type="button"
              onClick={() => onNavigateSubView(item.target)}
              className="w-full min-h-[68px] px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-[var(--kairn-surface-high)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[var(--kairn-surface-high)] flex items-center justify-center text-[var(--kairn-primary)] shrink-0">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-[var(--kairn-text)] truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-[var(--kairn-text-muted)] truncate mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--kairn-text-muted)] shrink-0" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
