import type { ReactNode } from 'react';
import type { SubView, TabId } from '../types/kairn';
import {
  CalendarCheck,
  Layers,
  TrendingUp,
  MessageSquare,
  Grid,
  Flame,
  ChevronLeft,
} from './Icons';

interface NavigationShellProps {
  activeTab: TabId;
  subView: SubView;
  streak: number;
  dueCardsCount: number;
  onSelectTab: (tab: TabId) => void;
  onBackFromSubView: () => void;
  children: ReactNode;
}

const TABS: Array<{ id: TabId; label: string; icon: typeof CalendarCheck }> = [
  { id: 'today', label: "Aujourd'hui", icon: CalendarCheck },
  { id: 'reviews', label: 'Révisions', icon: Layers },
  { id: 'progress', label: 'Progrès', icon: TrendingUp },
  { id: 'coach', label: 'Coach', icon: MessageSquare },
  { id: 'more', label: 'Plus', icon: Grid },
];

function getSubViewTitle(subView: SubView): string | null {
  switch (subView.type) {
    case 'mission_guide':
      return 'Guide de mission';
    case 'verification_result':
      return 'Résultat de vérification';
    case 'sunday_review':
      return 'Revue du dimanche';
    case 'curriculum':
      return 'Programme & Import';
    case 'history':
      return 'Historique des missions';
    case 'runbooks':
      return 'Fiches & Runbooks';
    case 'career':
      return 'Carrière';
    case 'english':
      return 'Anglais technique';
    case 'later':
      return 'Plus tard';
    case 'settings':
      return 'Réglages';
    case 'tokens':
      return 'Tokens de design';
    default:
      return null;
  }
}

export function NavigationShell({
  activeTab,
  subView,
  streak,
  dueCardsCount,
  onSelectTab,
  onBackFromSubView,
  children,
}: NavigationShellProps) {
  const subTitle = getSubViewTitle(subView);
  const showBottomBar = subView.type === 'none';

  return (
    <div className="min-h-screen bg-[var(--kairn-bg)] text-[var(--kairn-text)] flex flex-col md:flex-row">
      {/* Desktop Material 3 Navigation Rail */}
      <aside
        aria-label="Navigation principale"
        className="hidden md:flex md:flex-col md:w-60 md:shrink-0 md:sticky md:top-0 md:h-screen border-r border-[var(--kairn-border)] bg-[var(--kairn-surface-low)] px-4 py-6 justify-between"
      >
        <div className="space-y-8">
          <div className="px-3 flex items-center justify-between">
            <span className="text-xl font-bold tracking-tight text-[var(--kairn-text)]">
              Kairn
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-300">
              <Flame className="w-4 h-4" aria-hidden="true" />
              {streak} j
            </span>
          </div>

          <nav className="space-y-1.5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id && subView.type === 'none';
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full min-h-[48px] px-3.5 rounded-xl flex items-center justify-between text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[var(--kairn-primary-soft)] text-[var(--kairn-primary)] font-semibold'
                      : 'text-[var(--kairn-text-muted)] hover:bg-[var(--kairn-surface-high)] hover:text-[var(--kairn-text)]'
                  }`}
                >
                  <span className="flex items-center gap-3 whitespace-nowrap">
                    <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                    {tab.label}
                  </span>
                  {tab.id === 'reviews' && dueCardsCount > 0 && (
                    <span className="text-xs font-semibold tabular-nums text-[var(--kairn-primary)]">
                      {dueCardsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <p className="px-3 text-xs text-[var(--kairn-text-muted)] leading-relaxed">
          DevOps · Cloud · Cybersécurité
        </p>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Compact Sticky Mobile Top App Bar (<= 56px) */}
        <header className="sticky top-0 z-30 h-14 px-4 md:px-8 border-b border-[var(--kairn-border)] bg-[var(--kairn-bg)]/90 backdrop-blur-md flex items-center justify-between pt-safe">
          {subTitle ? (
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={onBackFromSubView}
                aria-label="Retour"
                className="min-w-[44px] min-h-[44px] -ml-2 rounded-xl flex items-center justify-center text-[var(--kairn-text)] hover:bg-[var(--kairn-surface-high)] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" aria-hidden="true" />
              </button>
              <h1 className="text-base font-semibold truncate text-[var(--kairn-text)]">
                {subTitle}
              </h1>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-lg font-bold tracking-tight md:hidden text-[var(--kairn-text)]">
                Kairn
              </span>
              <span className="hidden md:inline text-sm font-medium text-[var(--kairn-text-muted)]">
                {TABS.find((t) => t.id === activeTab)?.label}
              </span>
              <div className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-300 md:hidden">
                <Flame className="w-4 h-4" aria-hidden="true" />
                <span>{streak} jours</span>
              </div>
            </div>
          )}
        </header>

        {/* Scrollable Content */}
        <main
          className={`flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 py-5 md:py-8 ${
            showBottomBar ? 'pb-24 md:pb-10' : 'pb-10'
          }`}
        >
          {children}
        </main>
      </div>

      {/* Mobile Fixed 5-Tab Bottom Navigation Bar */}
      {showBottomBar && (
        <nav
          aria-label="Barre de navigation inférieure"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--kairn-border)] bg-[var(--kairn-surface-low)]/95 backdrop-blur-md pb-safe"
        >
          <div className="grid grid-cols-5 h-16 items-center">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative min-h-[48px] flex flex-col items-center justify-center gap-1 px-1 transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[var(--kairn-primary)]'
                      : 'text-[var(--kairn-text-muted)] hover:text-[var(--kairn-text)]'
                  }`}
                >
                  <span
                    className={`px-3 py-0.5 rounded-full transition-colors ${
                      isActive ? 'bg-[var(--kairn-primary-soft)]' : ''
                    }`}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="text-[11px] font-medium leading-none truncate max-w-full">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
