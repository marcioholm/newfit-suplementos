import React, { useState, useMemo } from 'react';
import { Search, Building2, UserPlus, Trophy } from 'lucide-react';
import { Personal, Sale, PeriodFilter, LeaderboardEntry } from '../types';
import { avatarSrc } from '../services/imageService';
import { formatCurrencyBRL } from '../services/webhookService';

interface LeaderboardViewProps {
  personais: Personal[];
  sales: Sale[];
  period: PeriodFilter;
  setPeriod: (p: PeriodFilter) => void;
  onSelectPersonalForSale?: (personalId: string) => void;
  onNavigateToPersonais?: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  personais,
  sales,
  period,
  setPeriod,
  onSelectPersonalForSale,
  onNavigateToPersonais
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtra as vendas com base no período selecionado
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
      return true; // 'all'
    });
  }, [sales, period]);

  // Calcula a pontuação e ranking de cada personal ativo
  const leaderboard: LeaderboardEntry[] = useMemo(() => {
    const activePersonais = personais.filter((p) => p.active);
    const map = new Map<string, { salesCount: number; totalVolume: number; points: number }>();

    activePersonais.forEach((p) => {
      map.set(p.id, { salesCount: 0, totalVolume: 0, points: 0 });
    });

    filteredSales.forEach((s) => {
      const curr = map.get(s.personalId);
      if (curr) {
        curr.salesCount += 1;
        curr.totalVolume += s.value;
        curr.points += s.pointsAdded;
      }
    });

    const entries: LeaderboardEntry[] = activePersonais.map((p) => {
      const stats = map.get(p.id) || { salesCount: 0, totalVolume: 0, points: 0 };
      return {
        rank: 0,
        personal: p,
        salesCount: stats.salesCount,
        totalVolume: stats.totalVolume,
        points: stats.points
      };
    });

    // Ordena por pontos acumulados descrescente, depois por volume total
    entries.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.totalVolume - a.totalVolume;
    });

    // Atribui as posições
    entries.forEach((e, idx) => {
      e.rank = idx + 1;
    });

    return entries;
  }, [personais, filteredSales]);

  // Filtra por termo de busca
  const displayEntries = useMemo(() => {
    if (!searchTerm.trim()) return leaderboard;
    const term = searchTerm.toLowerCase();
    return leaderboard.filter(
      (e) =>
        e.personal.name.toLowerCase().includes(term) ||
        e.personal.gym.toLowerCase().includes(term) ||
        e.personal.code.toLowerCase().includes(term)
    );
  }, [leaderboard, searchTerm]);

  // Top 3 colocados
  const firstPlace = leaderboard[0];
  const secondPlace = leaderboard[1];
  const thirdPlace = leaderboard[2];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8 animate-in fade-in duration-200">
      
      {/* HEADER & FILTROS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-white/[0.08] pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            Classificação Geral de Personais
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.08]">
              AO VIVO
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Indicações computadas em tempo real através do balcão New Fit
          </p>
        </div>

        {/* Período Pill Switch */}
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

      {/* ESTADO VAZIO: NENHUM PERSONAL CADASTRADO */}
      {leaderboard.length === 0 && (
        <div className="bg-white dark:bg-[#16171B] border border-zinc-200/90 dark:border-white/[0.08] rounded-2xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#F5A623]/10 border border-[#F5A623]/30 text-[#F5A623] flex items-center justify-center mx-auto">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Nenhum personal cadastrado ainda</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1">
              Cadastre personais trainers parceiros para começar a computar indicações e exibir o ranking ao vivo.
            </p>
          </div>
          {onNavigateToPersonais && (
            <button
              onClick={onNavigateToPersonais}
              className="bg-[#F5A623] hover:bg-[#e5971a] text-black text-xs font-bold px-4 py-2 rounded-xl transition inline-flex items-center gap-1.5 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Personal</span>
            </button>
          )}
        </div>
      )}

      {/* TOP 3 PODIUM - CLEAN ATHLETIC DESIGN */}
      {leaderboard.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-end pt-2">
          
          {/* 2º LUGAR */}
          {secondPlace ? (
            <div className="bg-white dark:bg-[#16171B] border border-zinc-200/90 dark:border-white/[0.08] rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between h-[250px] shadow-xs dark:shadow-lg hover:border-zinc-300 dark:hover:border-white/[0.15] transition">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-200 dark:border-white/[0.12] bg-zinc-100 dark:bg-zinc-800">
                  <img
                    src={avatarSrc(secondPlace.personal)}
                    alt={secondPlace.personal.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="font-mono text-3xl font-bold text-zinc-300 dark:text-zinc-600 tracking-tight">
                  02
                </span>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider font-mono text-zinc-500 dark:text-zinc-400 font-semibold">
                  2º Colocado
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight mt-0.5 truncate">
                  {secondPlace.personal.name}
                </h3>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                  <span className="truncate">{secondPlace.personal.gym}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-white/[0.08] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono text-zinc-400 dark:text-zinc-500 block">Volume Total</span>
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {formatCurrencyBRL(secondPlace.totalVolume)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono text-zinc-400 dark:text-zinc-500 block">Pontos</span>
                  <span className="text-sm font-bold font-mono text-zinc-900 dark:text-white">
                    {secondPlace.points.toLocaleString('pt-BR')} <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal">pts</span>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden md:block" />
          )}

          {/* 1º LUGAR (DESTAQUE CENTRAL ÂMBAR) */}
          {firstPlace && (
            <div className="bg-amber-500/[0.03] dark:bg-[#191A20] border-2 border-[#F5A623] rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-[280px] shadow-md dark:shadow-2xl shadow-[#F5A623]/10 order-first md:order-none">
              
              {/* Subtle Amber Glow */}
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

                <span className="font-mono text-4xl font-extrabold text-[#F5A623] tracking-tight">
                  01
                </span>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider font-mono text-[#D97706] dark:text-[#F5A623] font-bold flex items-center gap-1.5">
                  <span>Líder do Ranking</span>
                </div>
                <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white tracking-tight mt-0.5 truncate">
                  {firstPlace.personal.name}
                </h3>
                <div className="text-xs text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="truncate">{firstPlace.personal.gym}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-amber-200/40 dark:border-white/[0.12] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono text-zinc-500 dark:text-zinc-400 block">Volume Total</span>
                  <span className="text-sm font-bold text-[#D97706] dark:text-[#F5A623]">
                    {formatCurrencyBRL(firstPlace.totalVolume)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono text-zinc-500 dark:text-zinc-400 block">Pontos Acumulados</span>
                  <span className="text-base font-extrabold font-mono text-zinc-900 dark:text-white">
                    {firstPlace.points.toLocaleString('pt-BR')} <span className="text-xs text-[#D97706] dark:text-[#F5A623] font-bold">pts</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3º LUGAR */}
          {thirdPlace ? (
            <div className="bg-white dark:bg-[#16171B] border border-zinc-200/90 dark:border-white/[0.08] rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between h-[235px] shadow-xs dark:shadow-lg hover:border-zinc-300 dark:hover:border-white/[0.15] transition">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-200 dark:border-white/[0.12] bg-zinc-100 dark:bg-zinc-800">
                  <img
                    src={avatarSrc(thirdPlace.personal)}
                    alt={thirdPlace.personal.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="font-mono text-3xl font-bold text-zinc-300 dark:text-zinc-600 tracking-tight">
                  03
                </span>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider font-mono text-zinc-500 font-semibold">
                  3º Colocado
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight mt-0.5 truncate">
                  {thirdPlace.personal.name}
                </h3>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                  <span className="truncate">{thirdPlace.personal.gym}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-white/[0.08] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono text-zinc-400 dark:text-zinc-500 block">Volume Total</span>
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {formatCurrencyBRL(thirdPlace.totalVolume)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono text-zinc-400 dark:text-zinc-500 block">Pontos</span>
                  <span className="text-sm font-bold font-mono text-zinc-900 dark:text-white">
                    {thirdPlace.points.toLocaleString('pt-BR')} <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal">pts</span>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden md:block" />
          )}

        </div>
      )}

      {/* SEARCH BAR & TABELA GERAL */}
      {leaderboard.length > 0 && (
        <div className="space-y-4 pt-4">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
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

            <span className="text-xs font-mono text-zinc-500 self-end sm:self-center">
              {displayEntries.length} parceiros listados
            </span>
          </div>

          {/* TABELA DE CLASSIFICAÇÃO */}
          <div className="bg-white dark:bg-[#16171B] border border-zinc-200/90 dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-xs dark:shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200/90 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#121316] text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                    <th className="py-3 px-4 w-16 text-center">Pos</th>
                    <th className="py-3 px-4">Personal Trainer</th>
                    <th className="py-3 px-4">Academia / Studio</th>
                    <th className="py-3 px-4 text-center">Vendas</th>
                    <th className="py-3 px-4 text-right">Volume Total (R$)</th>
                    <th className="py-3 px-4 text-right">Pontos</th>
                    <th className="py-3 px-4 text-center w-24">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
                  {displayEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-zinc-500 text-xs">
                        Nenhum resultado encontrado para a busca.
                      </td>
                    </tr>
                  ) : (
                    displayEntries.map((entry) => {
                      const isTop1 = entry.rank === 1;
                      const isTop3 = entry.rank <= 3;

                      return (
                        <tr
                          key={entry.personal.id}
                          className={`hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition ${
                            isTop1 ? 'bg-amber-500/[0.04] dark:bg-[#F5A623]/[0.03]' : ''
                          }`}
                        >
                          {/* Posição Mono */}
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

                          {/* Avatar + Nome + Cupom */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-200 dark:border-white/[0.1] bg-zinc-100 dark:bg-zinc-800 shrink-0">
                                <img
                                  src={avatarSrc(entry.personal)}
                                  alt={entry.personal.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <div className="font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-1.5">
                                  <span>{entry.personal.name}</span>
                                  {isTop1 && (
                                    <span className="text-[9px] font-mono uppercase bg-amber-500/15 dark:bg-[#F5A623]/20 text-[#D97706] dark:text-[#F5A623] px-1 py-0.2 rounded font-bold">
                                      Líder
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] font-mono text-zinc-500">
                                  Cupom: {entry.personal.code}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Academia */}
                          <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                              <span className="truncate max-w-[180px]">{entry.personal.gym}</span>
                            </div>
                          </td>

                          {/* Quantidade de Vendas */}
                          <td className="py-3.5 px-4 text-center font-mono text-zinc-700 dark:text-zinc-300">
                            {entry.salesCount}
                          </td>

                          {/* Volume Total R$ */}
                          <td className="py-3.5 px-4 text-right font-semibold font-mono text-zinc-900 dark:text-zinc-200">
                            {formatCurrencyBRL(entry.totalVolume)}
                          </td>

                          {/* Pontos */}
                          <td className="py-3.5 px-4 text-right">
                            <span
                              className={`font-mono font-bold text-sm ${
                                isTop1
                                  ? 'text-[#D97706] dark:text-[#F5A623]'
                                  : isTop3
                                  ? 'text-zinc-900 dark:text-white'
                                  : 'text-zinc-600 dark:text-zinc-400'
                              }`}
                            >
                              {entry.points.toLocaleString('pt-BR')}
                            </span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 ml-1 font-mono">pts</span>
                          </td>

                          {/* Ação rápida de balcão */}
                          <td className="py-3.5 px-4 text-center">
                            {onSelectPersonalForSale && (
                              <button
                                onClick={() => onSelectPersonalForSale(entry.personal.id)}
                                className="bg-zinc-100 hover:bg-[#F5A623] hover:text-black dark:bg-[#202227] dark:hover:bg-[#F5A623] dark:hover:text-black text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-zinc-200/80 dark:border-transparent transition shadow-xs"
                                title={`Lançar venda direta para ${entry.personal.firstName}`}
                              >
                                + Venda
                              </button>
                            )}
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

    </div>
  );
};
