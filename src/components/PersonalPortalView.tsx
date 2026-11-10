import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Award, 
  TrendingUp, 
  Copy, 
  Check, 
  Search, 
  Share2, 
  Building2, 
  Sparkles, 
  ShoppingBag, 
  Calendar,
  Sun,
  Moon,
  ExternalLink
} from 'lucide-react';
import { Personal, Sale, PeriodFilter } from '../types';
import { avatarSrc } from '../services/imageService';
import { formatCurrencyBRL } from '../services/webhookService';
import { NewFitLogo } from './NewFitLogo';

interface PersonalPortalViewProps {
  personais: Personal[];
  sales: Sale[];
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  initialCode?: string;
  onExitPortal?: () => void;
}

export const PersonalPortalView: React.FC<PersonalPortalViewProps> = ({
  personais,
  sales,
  theme,
  onToggleTheme,
  initialCode = '',
  onExitPortal
}) => {
  const isDark = theme === 'dark';
  const activePersonais = useMemo(() => personais.filter((p) => p.active), [personais]);

  // Tab: 'ranking' ou 'meu-espaco'
  const [tab, setTab] = useState<'ranking' | 'meu-espaco'>('ranking');
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  // Seleção de personal para "Meu Espaço"
  const [selectedPersonalId, setSelectedPersonalId] = useState<string>(() => {
    if (initialCode) {
      const match = activePersonais.find((p) => p.code.toLowerCase() === initialCode.toLowerCase());
      if (match) return match.id;
    }
    return activePersonais[0]?.id || '';
  });

  // Filtra as vendas com base no período
  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter((s) => {
      const saleDate = new Date(s.timestamp);
      if (period === '7d') {
        const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (period === 'month') {
        return (
          saleDate.getMonth() === now.getMonth() &&
          saleDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  }, [sales, period]);

  // Calcula ranking geral para o período
  const leaderboard = useMemo(() => {
    const map = new Map<string, { salesCount: number; totalVolume: number; points: number }>();
    activePersonais.forEach((p) => map.set(p.id, { salesCount: 0, totalVolume: 0, points: 0 }));

    filteredSales.forEach((s) => {
      const curr = map.get(s.personalId);
      if (curr) {
        curr.salesCount += 1;
        curr.totalVolume += s.value;
        curr.points += s.pointsAdded;
      }
    });

    const entries = activePersonais.map((p) => {
      const stats = map.get(p.id) || { salesCount: 0, totalVolume: 0, points: 0 };
      return {
        rank: 0,
        personal: p,
        salesCount: stats.salesCount,
        totalVolume: stats.totalVolume,
        points: stats.points
      };
    });

    entries.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.totalVolume - a.totalVolume;
    });

    entries.forEach((e, idx) => {
      e.rank = idx + 1;
    });

    return entries;
  }, [activePersonais, filteredSales]);

  // Personal selecionado no "Meu Espaço"
  const currentPersonal = useMemo(
    () => activePersonais.find((p) => p.id === selectedPersonalId) || activePersonais[0] || null,
    [activePersonais, selectedPersonalId]
  );

  // Estatísticas do personal selecionado
  const currentPersonalStats = useMemo(() => {
    if (!currentPersonal) return { rank: 1, points: 0, volume: 0, count: 0, salesList: [] };

    const entry = leaderboard.find((e) => e.personal.id === currentPersonal.id);
    const personalSales = sales.filter((s) => s.personalId === currentPersonal.id);

    return {
      rank: entry?.rank || 1,
      points: entry?.points || 0,
      volume: entry?.totalVolume || 0,
      count: entry?.salesCount || 0,
      salesList: personalSales
    };
  }, [currentPersonal, leaderboard, sales]);

  // Filtragem da busca no ranking
  const displayLeaderboard = useMemo(() => {
    if (!searchTerm.trim()) return leaderboard;
    const term = searchTerm.toLowerCase();
    return leaderboard.filter(
      (e) =>
        e.personal.name.toLowerCase().includes(term) ||
        e.personal.gym.toLowerCase().includes(term) ||
        e.personal.code.toLowerCase().includes(term)
    );
  }, [leaderboard, searchTerm]);

  // Copiar cupom para a área de transferência
  const copyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2500);
  };

  // Copiar mensagem pronta de indicação para o personal enviar ao aluno
  const copyReferralMessage = (personal: Personal) => {
    const msg = `Fala atleta! Na New Fit Suplementos você ganha desconto especial usando meu cupom oficial: *${personal.code}* 💪 Passe lá no balcão e aproveite!`;
    navigator.clipboard.writeText(msg);
    setCopiedCoupon('msg');
    setTimeout(() => setCopiedCoupon(null), 2500);
  };

  const firstPlace = leaderboard[0];
  const secondPlace = leaderboard[1];
  const thirdPlace = leaderboard[2];

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-[#090A0C] text-zinc-900 dark:text-zinc-100 antialiased selection:bg-[#F5A623] selection:text-black transition-colors duration-150">
      
      {/* NAVBAR EXCLUSIVA DO PERSONAL */}
      <header className="border-b border-zinc-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#0E0F13]/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-xs dark:shadow-lg">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <NewFitLogo theme={theme} size="sm" showText={true} />
          <span className="hidden sm:inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-[#D97706] dark:text-[#F5A623] border border-amber-500/20">
            Área do Parceiro
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-100 dark:bg-[#16171B] p-1 rounded-xl border border-zinc-200 dark:border-white/[0.08] text-xs">
            <button
              onClick={() => setTab('ranking')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                tab === 'ranking'
                  ? 'bg-[#F5A623] text-black shadow-xs font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Ranking Geral</span>
            </button>

            <button
              onClick={() => setTab('meu-espaco')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                tab === 'meu-espaco'
                  ? 'bg-[#F5A623] text-black shadow-xs font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Meu Extrato</span>
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="bg-white dark:bg-[#16171B] hover:bg-zinc-50 dark:hover:bg-[#202227] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/[0.08] text-xs p-2 rounded-lg transition shadow-xs"
            title={isDark ? 'Modo claro' : 'Modo escuro'}
            aria-label="Alternar tema"
          >
            {isDark ? <Sun className="w-4 h-4 text-[#F5A623]" /> : <Moon className="w-4 h-4 text-zinc-600" />}
          </button>
        </div>

      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* ABA 1: RANKING GERAL DOS PARCEIROS */}
        {tab === 'ranking' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            
            {/* Header com Filtros */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-white/[0.08] pb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
                  Classificação Oficial de Parceiros
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.08]">
                    AO VIVO
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Pontuação atualizada a cada indicação registrada no balcão New Fit
                </p>
              </div>

              {/* Filtro de Período */}
              <div className="flex items-center bg-zinc-100 dark:bg-[#16171B] p-1 rounded-xl border border-zinc-200 dark:border-white/[0.08] text-xs font-semibold shadow-xs">
                <button
                  onClick={() => setPeriod('7d')}
                  className={`px-3.5 py-1.5 rounded-lg transition ${
                    period === '7d'
                      ? 'bg-[#F5A623] text-black shadow-xs font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  7 Dias
                </button>
                <button
                  onClick={() => setPeriod('month')}
                  className={`px-3.5 py-1.5 rounded-lg transition ${
                    period === 'month'
                      ? 'bg-[#F5A623] text-black shadow-xs font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  Mês Atual
                </button>
                <button
                  onClick={() => setPeriod('all')}
                  className={`px-3.5 py-1.5 rounded-lg transition ${
                    period === 'all'
                      ? 'bg-[#F5A623] text-black shadow-xs font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  Geral
                </button>
              </div>
            </div>

            {/* PODIUM TOP 3 */}
            {leaderboard.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-end pt-2">
                
                {/* 2º Lugar */}
                {secondPlace ? (
                  <div className="bg-white dark:bg-[#16171B] border border-zinc-200/90 dark:border-white/[0.08] rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between h-[230px] shadow-xs dark:shadow-lg">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-200 dark:border-white/[0.12] bg-zinc-100 dark:bg-zinc-800">
                        <img
                          src={avatarSrc(secondPlace.personal)}
                          alt={secondPlace.personal.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-mono text-3xl font-bold text-zinc-300 dark:text-zinc-600">02</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-mono text-zinc-500 font-semibold block">2º Colocado</span>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight truncate mt-0.5">
                        {secondPlace.personal.name}
                      </h3>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 block truncate">{secondPlace.personal.gym}</span>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 dark:border-white/[0.08] flex items-center justify-between">
                      <span className="text-xs text-zinc-500">{secondPlace.salesCount} vendas</span>
                      <span className="text-sm font-bold font-mono text-zinc-900 dark:text-white">
                        {secondPlace.points.toLocaleString('pt-BR')} <span className="text-[10px] text-zinc-400">pts</span>
                      </span>
                    </div>
                  </div>
                ) : <div className="hidden md:block" />}

                {/* 1º Lugar */}
                {firstPlace && (
                  <div className="bg-amber-500/[0.03] dark:bg-[#191A20] border-2 border-[#F5A623] rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-[260px] shadow-md dark:shadow-2xl shadow-[#F5A623]/10 order-first md:order-none">
                    <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#F5A623]/15 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-start justify-between">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-[#F5A623] bg-zinc-100 dark:bg-zinc-800 shadow-md">
                          <img
                            src={avatarSrc(firstPlace.personal)}
                            alt={firstPlace.personal.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="absolute -bottom-1 -right-1 bg-[#F5A623] text-black text-[9px] font-extrabold px-1.5 py-0.2 rounded font-mono shadow">
                          TOP 1
                        </span>
                      </div>
                      <span className="font-mono text-4xl font-extrabold text-[#F5A623]">01</span>
                    </div>

                    <div>
                      <span className="text-xs uppercase font-mono text-[#D97706] dark:text-[#F5A623] font-bold block">
                        Líder do Ranking
                      </span>
                      <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white tracking-tight truncate mt-0.5">
                        {firstPlace.personal.name}
                      </h3>
                      <span className="text-xs text-zinc-600 dark:text-zinc-300 block truncate">{firstPlace.personal.gym}</span>
                    </div>

                    <div className="pt-3 border-t border-amber-200/40 dark:border-white/[0.12] flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#D97706] dark:text-[#F5A623]">
                        {firstPlace.salesCount} vendas realizadas
                      </span>
                      <span className="text-base font-extrabold font-mono text-zinc-900 dark:text-white">
                        {firstPlace.points.toLocaleString('pt-BR')} <span className="text-xs text-[#D97706] dark:text-[#F5A623] font-bold">pts</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* 3º Lugar */}
                {thirdPlace ? (
                  <div className="bg-white dark:bg-[#16171B] border border-zinc-200/90 dark:border-white/[0.08] rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between h-[220px] shadow-xs dark:shadow-lg">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-200 dark:border-white/[0.12] bg-zinc-100 dark:bg-zinc-800">
                        <img
                          src={avatarSrc(thirdPlace.personal)}
                          alt={thirdPlace.personal.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-mono text-3xl font-bold text-zinc-300 dark:text-zinc-600">03</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-mono text-zinc-500 font-semibold block">3º Colocado</span>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight truncate mt-0.5">
                        {thirdPlace.personal.name}
                      </h3>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 block truncate">{thirdPlace.personal.gym}</span>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 dark:border-white/[0.08] flex items-center justify-between">
                      <span className="text-xs text-zinc-500">{thirdPlace.salesCount} vendas</span>
                      <span className="text-sm font-bold font-mono text-zinc-900 dark:text-white">
                        {thirdPlace.points.toLocaleString('pt-BR')} <span className="text-[10px] text-zinc-400">pts</span>
                      </span>
                    </div>
                  </div>
                ) : <div className="hidden md:block" />}

              </div>
            )}

            {/* TABELA GERAL */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar personal ou academia..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-[#16171B] border border-zinc-200 dark:border-white/[0.08] focus:border-[#F5A623] rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none transition shadow-xs"
                  />
                </div>
                <span className="text-xs font-mono text-zinc-500">
                  {displayLeaderboard.length} personais
                </span>
              </div>

              <div className="bg-white dark:bg-[#16171B] border border-zinc-200/90 dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-xs dark:shadow-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200/90 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#121316] text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      <th className="py-3 px-4 w-16 text-center">Pos</th>
                      <th className="py-3 px-4">Personal Trainer</th>
                      <th className="py-3 px-4">Academia</th>
                      <th className="py-3 px-4 text-center">Vendas</th>
                      <th className="py-3 px-4 text-right">Pontos</th>
                      <th className="py-3 px-4 text-center w-24">Extrato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
                    {displayLeaderboard.map((entry) => (
                      <tr key={entry.personal.id} className="hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition">
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-sm">
                          <span
                            className={`inline-block w-7 py-0.5 rounded ${
                              entry.rank === 1
                                ? 'bg-[#F5A623] text-black font-extrabold'
                                : entry.rank === 2
                                ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-white'
                                : entry.rank === 3
                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                                : 'text-zinc-400 dark:text-zinc-500'
                            }`}
                          >
                            {String(entry.rank).padStart(2, '0')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-200 dark:border-white/[0.1] bg-zinc-100 dark:bg-zinc-800 shrink-0">
                              <img src={avatarSrc(entry.personal)} alt={entry.personal.name} className="w-full h-full object-cover" />
                            </div>
                            <span className="font-semibold text-zinc-900 dark:text-white">{entry.personal.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300">{entry.personal.gym}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-zinc-700 dark:text-zinc-300">{entry.salesCount}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-900 dark:text-white">
                          {entry.points.toLocaleString('pt-BR')} <span className="text-[10px] text-zinc-400 font-normal">pts</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedPersonalId(entry.personal.id);
                              setTab('meu-espaco');
                            }}
                            className="text-[11px] font-semibold text-[#D97706] dark:text-[#F5A623] hover:underline"
                          >
                            Ver detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ABA 2: MEU ESPAÇO / EXTRATO DO PERSONAL */}
        {tab === 'meu-espaco' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            
            {/* Seletor do Personal */}
            <div className="bg-white dark:bg-[#16171B] border border-zinc-200/90 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">Personal Selecionado</span>
                <select
                  value={selectedPersonalId}
                  onChange={(e) => setSelectedPersonalId(e.target.value)}
                  className="mt-1 bg-zinc-50 dark:bg-[#0D0E11] border border-zinc-200 dark:border-white/[0.12] rounded-xl px-3 py-2 text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-[#F5A623] cursor-pointer"
                >
                  {activePersonais.map((p) => (
                    <option key={p.id} value={p.id} className="bg-white dark:bg-[#16171B] text-zinc-900 dark:text-white">
                      {p.name} ({p.gym})
                    </option>
                  ))}
                </select>
              </div>

              {currentPersonal && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyCoupon(currentPersonal.code)}
                    className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-[#D97706] dark:text-[#F5A623] border border-amber-500/30 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition"
                    title="Copiar cupom exclusivo"
                  >
                    {copiedCoupon === currentPersonal.code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Cupom: {currentPersonal.code}</span>
                  </button>

                  <button
                    onClick={() => copyReferralMessage(currentPersonal)}
                    className="px-3.5 py-2 bg-[#F5A623] hover:bg-[#e5971a] text-black rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                    title="Copiar mensagem pronta para mandar para alunos no WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{copiedCoupon === 'msg' ? 'Mensagem copiada!' : 'Indicar Aluno'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Profile Hero Card */}
            {currentPersonal && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* Posição no Ranking */}
                <div className="bg-white dark:bg-[#16171B] border border-zinc-200/90 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono uppercase text-zinc-400 block">Posição Atual</span>
                    <div className="text-3xl font-extrabold font-mono text-[#D97706] dark:text-[#F5A623] mt-1">
                      #{currentPersonalStats.rank}
                    </div>
                    <span className="text-[10px] text-zinc-500">no ranking geral</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[#D97706] dark:text-[#F5A623] flex items-center justify-center">
                    <Trophy className="w-6 h-6" />
                  </div>
                </div>

                {/* Pontos Acumulados */}
                <div className="bg-white dark:bg-[#16171B] border border-zinc-200/90 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono uppercase text-zinc-400 block">Pontos Acumulados</span>
                    <div className="text-3xl font-extrabold font-mono text-zinc-900 dark:text-white mt-1">
                      {currentPersonalStats.points.toLocaleString('pt-BR')}
                    </div>
                    <span className="text-[10px] text-zinc-500">neste período</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                </div>

                {/* Total de Vendas */}
                <div className="bg-white dark:bg-[#16171B] border border-zinc-200/90 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono uppercase text-zinc-400 block">Indicações Feitas</span>
                    <div className="text-3xl font-extrabold font-mono text-zinc-900 dark:text-white mt-1">
                      {currentPersonalStats.count}
                    </div>
                    <span className="text-[10px] text-zinc-500">compras de alunos</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                </div>

                {/* Volume Indicado */}
                <div className="bg-white dark:bg-[#16171B] border border-zinc-200/90 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono uppercase text-zinc-400 block">Volume Gerado</span>
                    <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                      {formatCurrencyBRL(currentPersonalStats.volume)}
                    </div>
                    <span className="text-[10px] text-zinc-500">em suplementos</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>

              </div>
            )}

            {/* Extrato de Compras do Personal */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#F5A623]" />
                <span>Extrato Detalhado de Compras dos seus Alunos</span>
              </h3>

              <div className="bg-white dark:bg-[#16171B] border border-zinc-200/90 dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200/90 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#121316] text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Itens / Suplementos</th>
                      <th className="py-3 px-4 text-right">Valor da Compra</th>
                      <th className="py-3 px-4 text-right">Pontos Creditados</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
                    {currentPersonalStats.salesList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-zinc-500 text-xs">
                          Nenhuma compra registrada com o seu cupom ainda. Indique seus alunos para começar a somar pontos!
                        </td>
                      </tr>
                    ) : (
                      currentPersonalStats.salesList.map((sale) => {
                        const date = new Date(sale.timestamp);
                        return (
                          <tr key={sale.id} className="hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition">
                            <td className="py-3 px-4 font-mono text-zinc-500 whitespace-nowrap">
                              {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}{' '}
                              {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3 px-4 font-medium text-zinc-900 dark:text-white">
                              {sale.notes || 'Suplementos New Fit'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                              {formatCurrencyBRL(sale.value)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-[#D97706] dark:text-[#F5A623]">
                              +{sale.pointsAdded} pts
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-200/80 dark:border-white/[0.08] py-4 px-6 text-center text-[11px] text-zinc-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>New Fit Suplementos • Portal do Personal Parceiro</span>
        {onExitPortal && (
          <button
            onClick={onExitPortal}
            className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition underline"
          >
            Acesso Lojista / Balcão
          </button>
        )}
      </footer>

    </div>
  );
};
