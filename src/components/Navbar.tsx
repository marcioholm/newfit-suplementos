import React from 'react';
import { 
  Trophy, 
  Zap, 
  Users, 
  Webhook, 
  Tv, 
  Lock, 
  Unlock
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'ranking' | 'balcao' | 'personais' | 'webhook';
  setActiveTab: (tab: 'ranking' | 'balcao' | 'personais' | 'webhook') => void;
  onOpenTvMode: () => void;
  isUnlocked: boolean;
  onLockClick: () => void;
  currentMonthSalesTotal: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenTvMode,
  isUnlocked,
  onLockClick,
  currentMonthSalesTotal
}) => {
  return (
    <header className="border-b border-white/[0.08] bg-[#0E0F13] sticky top-0 z-40 px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
      
      {/* Brand & Subtitle */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-[#F5A623] to-[#D48806] text-black font-extrabold flex items-center justify-center text-sm shadow-md shadow-[#F5A623]/20 tracking-wider">
          NF
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
              NEW FIT
              <span className="text-[#F5A623]">SUPLEMENTOS</span>
            </h1>
            <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30">
              PARTNER SYSTEM
            </span>
          </div>
          <p className="hidden sm:block text-[11px] text-zinc-400 font-medium">
            Ranking de Personais & Automação de Comissões
          </p>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <nav className="order-last w-full lg:order-none lg:w-auto grid grid-cols-4 lg:flex items-center bg-[#16171B] p-1 rounded-xl border border-white/[0.08] text-xs">
        
        <button
          onClick={() => setActiveTab('ranking')}
          className={`px-2 sm:px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${
            activeTab === 'ranking'
              ? 'bg-[#F5A623] text-black shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span className="sm:hidden">Ranking</span>
          <span className="hidden sm:inline">Classificação</span>
        </button>

        <button
          onClick={() => setActiveTab('balcao')}
          className={`px-2 sm:px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap relative ${
            activeTab === 'balcao'
              ? 'bg-[#F5A623] text-black shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="sm:hidden">Balcão</span>
          <span className="hidden sm:inline">Balcão do Leo</span>
          {isUnlocked && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('personais')}
          className={`px-2 sm:px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${
            activeTab === 'personais'
              ? 'bg-[#F5A623] text-black shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Personais</span>
        </button>

        <button
          onClick={() => setActiveTab('webhook')}
          className={`px-2 sm:px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${
            activeTab === 'webhook'
              ? 'bg-[#F5A623] text-black shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Webhook className="w-3.5 h-3.5" />
          <span className="sm:hidden">n8n</span>
          <span className="hidden sm:inline">Automação & n8n</span>
        </button>

      </nav>

      {/* Right Controls */}
      <div className="flex items-center gap-2 shrink-0">
        
        {/* Modo TV Fullscreen Button */}
        <button
          onClick={onOpenTvMode}
          className="bg-[#16171B] hover:bg-[#202227] text-zinc-300 hover:text-white border border-white/[0.08] text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 shadow-sm"
          title="Abrir em Tela Cheia para a TV da loja"
          aria-label="Modo TV"
        >
          <Tv className="w-3.5 h-3.5 text-[#F5A623]" />
          <span className="hidden sm:inline">Modo TV</span>
        </button>

        {/* Lock / Unlock Toggle Button */}
        <button
          onClick={onLockClick}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 border ${
            isUnlocked
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-[#16171B] text-zinc-400 border-white/[0.08] hover:text-white'
          }`}
          title={isUnlocked ? 'Áreas administrativas liberadas (clique para bloquear)' : 'Inserir PIN'}
          aria-label={isUnlocked ? 'Bloquear' : 'Inserir PIN'}
        >
          {isUnlocked ? (
            <>
              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Balcão Liberado</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">PIN Balcão</span>
            </>
          )}
        </button>

      </div>

    </header>
  );
};

