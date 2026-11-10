import React from 'react';
import { Trophy, ShoppingBag, Users, Workflow, Lock, LockOpen, Tv } from 'lucide-react';
import { cx } from '../ui/components';
import { NewFitLogo } from './NewFitLogo';

export type TabId = 'ranking' | 'balcao' | 'personais' | 'webhook';

export const TABS: { id: TabId; label: string; icon: React.ElementType; protected: boolean }[] = [
  { id: 'ranking', label: 'Ranking', icon: Trophy, protected: false },
  { id: 'balcao', label: 'Balcão', icon: ShoppingBag, protected: true },
  { id: 'personais', label: 'Personais', icon: Users, protected: true },
  { id: 'webhook', label: 'Automação', icon: Workflow, protected: true }
];

interface NavProps {
  activeTab: TabId;
  onSelect: (tab: TabId) => void;
  isUnlocked: boolean;
  onLockClick: () => void;
  onOpenTvMode: () => void;
}

/** Barra de abas inferior (iPhone/iPad em retrato). Material translúcido, conteúdo rola por baixo. */
export const TabBar: React.FC<NavProps> = ({ activeTab, onSelect, isUnlocked }) => (
  <nav
    aria-label="Navegação principal"
    className="lg:hidden fixed bottom-0 inset-x-0 z-40 material border-t-[0.5px] border-separator/30 safe-bottom"
  >
    <ul className="grid grid-cols-4 max-w-xl mx-auto">
      {TABS.map(({ id, label, icon: Icon, protected: isProtected }) => {
        const active = activeTab === id;
        const locked = isProtected && !isUnlocked;
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => onSelect(id)}
              aria-current={active ? 'page' : undefined}
              aria-label={locked ? `${label} (requer PIN)` : label}
              className={cx(
                'w-full flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 touch-manipulation',
                active ? 'text-tint-text' : 'text-label-2'
              )}
            >
              <span className="relative">
                <Icon className="w-6 h-6" strokeWidth={active ? 2.3 : 1.8} aria-hidden />
                {locked && (
                  <span className="absolute -right-1.5 -bottom-1 w-3.5 h-3.5 rounded-full bg-bg flex items-center justify-center">
                    <Lock className="w-2.5 h-2.5 text-label-2" strokeWidth={2.5} aria-hidden />
                  </span>
                )}
              </span>
              <span className="text-[10px] leading-3 font-medium tracking-[0.01em]">{label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  </nav>
);

/** Barra lateral (computador e iPad deitado), estilo macOS. */
export const Sidebar: React.FC<NavProps> = ({ activeTab, onSelect, isUnlocked, onLockClick, onOpenTvMode }) => (
  <aside
    aria-label="Navegação principal"
    className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[260px] flex-col material border-r-[0.5px] border-separator/30"
  >
    <div className="px-5 pt-6 pb-5">
      <NewFitLogo className="h-12" />
      <p className="type-footnote text-label-2 mt-2">Ranking de personais</p>
    </div>

    <ul className="px-3 space-y-0.5">
      {TABS.map(({ id, label, icon: Icon, protected: isProtected }) => {
        const active = activeTab === id;
        const locked = isProtected && !isUnlocked;
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => onSelect(id)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'pressable w-full h-10 px-3 rounded-[10px] flex items-center gap-3 type-callout text-left',
                active ? 'bg-tint/15 text-label font-semibold' : 'text-label hover:bg-fill/10'
              )}
            >
              <Icon className={cx('w-5 h-5 shrink-0', active ? 'text-tint-text' : 'text-label-2')} aria-hidden />
              <span className="flex-1">{label}</span>
              {locked && <Lock className="w-3.5 h-3.5 text-label-3" aria-label="requer PIN" />}
            </button>
          </li>
        );
      })}
    </ul>

    <div className="mt-auto px-3 pb-5 space-y-1">
      <button
        type="button"
        onClick={onOpenTvMode}
        className="pressable w-full h-10 px-3 rounded-[10px] flex items-center gap-3 type-callout text-label hover:bg-fill/10"
      >
        <Tv className="w-5 h-5 text-label-2" aria-hidden />
        <span>Modo TV</span>
      </button>
      <button
        type="button"
        onClick={onLockClick}
        className="pressable w-full h-10 px-3 rounded-[10px] flex items-center gap-3 type-callout text-label hover:bg-fill/10"
      >
        {isUnlocked ? (
          <LockOpen className="w-5 h-5 text-green" aria-hidden />
        ) : (
          <Lock className="w-5 h-5 text-label-2" aria-hidden />
        )}
        <span className="flex-1 text-left">{isUnlocked ? 'Bloquear' : 'Inserir PIN'}</span>
        {isUnlocked && <span className="type-caption text-green font-semibold">Liberado</span>}
      </button>
    </div>
  </aside>
);
