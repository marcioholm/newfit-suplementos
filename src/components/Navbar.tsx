import React, { useState } from 'react';
import { 
  Trophy, 
  Zap, 
  Users, 
  Webhook, 
  Tv, 
  Lock, 
  Unlock,
  Sun,
  Moon,
  Share2,
  Check
} from 'lucide-react';
import { NewFitLogo } from './NewFitLogo';

interface NavbarProps {
  activeTab: 'ranking' | 'balcao' | 'personais' | 'webhook';
  setActiveTab: (tab: 'ranking' | 'balcao' | 'personais' | 'webhook') => void;
  onOpenTvMode: () => void;
  onOpenPersonalPortal: () => void;
  isUnlocked: boolean;
  onLockClick: () => void;
  currentMonthSalesTotal: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenTvMode,
  onOpenPersonalPortal,
  isUnlocked,
  onLockClick,
  theme,
  onToggleTheme
}) => {
  const isDark = theme === 'dark';
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyPortalLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const portalUrl = `${window.location.origin}${window.location.pathname}?portal=personal`;
    navigator.clipboard.writeText(portalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <header className="border-b border-zinc-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#0E0F13]/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs dark:shadow-lg transition-colors duration-150">
      
      {/* Brand & Logo */}
      <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => setActiveTab('ranking')}>
        <NewFitLogo theme={theme} size="sm" showText={true} />
      </div>

      {/* Main Navigation Tabs */}
      <nav className="order-last w-full lg:order-none lg:w-auto grid grid-cols-4 lg:flex items-center bg-zinc-100 dark:bg-[#16171B] p-1 rounded-xl border border-zinc-200/90 dark:border-white/[0.08] text-xs">
        
        <button
          onClick={() => setActiveTab('ranking')}
          className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${
            activeTab === 'ranking'
              ? 'bg-[#F5A623] text-black shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span className="sm:hidden">Ranking</span>
          <span className="hidden sm:inline">Classificação</span>
        </button>

        <button
          onClick={() => setActiveTab('balcao')}
          className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap relative ${
            activeTab === 'balcao'
              ? 'bg-[#F5A623] text-black shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="sm:hidden">Balcão</span>
          <span className="hidden sm:inline">Balcão do Leo</span>
          {isUnlocked && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('personais')}
          className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${
            activeTab === 'personais'
              ? 'bg-[#F5A623] text-black shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Personais</span>
        </button>

        <button
          onClick={() => setActiveTab('webhook')}
          className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${
            activeTab === 'webhook'
              ? 'bg-[#F5A623] text-black shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Webhook className="w-3.5 h-3.5" />
          <span className="sm:hidden">n8n</span>
          <span className="hidden sm:inline">Automação & n8n</span>
        </button>

      </nav>

      {/* Right Controls */}
      <div className="flex items-center gap-2 shrink-0">
        
        {/* Link dos Personais (Portal) */}
        <div className="flex items-center">
          <button
            onClick={onOpenPersonalPortal}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-[#D97706] dark:text-[#F5A623] border border-amber-500/30 text-xs px-2.5 sm:px-3 py-1.5 rounded-l-lg font-semibold transition flex items-center gap-1.5 shadow-xs"
            title="Visualizar a tela que os personais veem"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ver Portal</span>
          </button>
          <button
            onClick={handleCopyPortalLink}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-[#D97706] dark:text-[#F5A623] border-y border-r border-amber-500/30 text-xs px-2 py-1.5 rounded-r-lg font-semibold transition flex items-center shadow-xs"
            title="Copiar link do Portal dos Personais para enviar no WhatsApp"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <span className="text-[10px] font-mono">Copiar</span>}
          </button>
        </div>

        {/* Theme Toggle (Light / Dark) */}
        <button
          onClick={onToggleTheme}
          className="bg-white dark:bg-[#16171B] hover:bg-zinc-50 dark:hover:bg-[#202227] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/[0.08] text-xs px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 shadow-xs"
          title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          aria-label={isDark ? 'Modo claro' : 'Modo escuro'}
        >
          {isDark ? (
            <>
              <Sun className="w-3.5 h-3.5 text-[#F5A623]" />
              <span className="hidden md:inline">Claro</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-zinc-600" />
              <span className="hidden md:inline">Escuro</span>
            </>
          )}
        </button>

        {/* Modo TV Fullscreen Button */}
        <button
          onClick={onOpenTvMode}
          className="bg-white dark:bg-[#16171B] hover:bg-zinc-50 dark:hover:bg-[#202227] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/[0.08] text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 shadow-xs"
          title="Abrir em Tela Cheia para a TV da loja"
          aria-label="Modo TV"
        >
          <Tv className="w-3.5 h-3.5 text-[#F5A623]" />
          <span className="hidden sm:inline">Modo TV</span>
        </button>

        {/* Lock / Unlock Toggle Button */}
        <button
          onClick={onLockClick}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 border shadow-xs ${
            isUnlocked
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
              : 'bg-white dark:bg-[#16171B] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/[0.08] hover:text-zinc-900 dark:hover:text-white'
          }`}
          title={isUnlocked ? 'Áreas administrativas liberadas (clique para bloquear)' : 'Inserir PIN'}
          aria-label={isUnlocked ? 'Bloquear' : 'Inserir PIN'}
        >
          {isUnlocked ? (
            <>
              <Unlock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Liberado</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span className="hidden sm:inline">PIN Balcão</span>
            </>
          )}
        </button>

      </div>

    </header>
  );
};

