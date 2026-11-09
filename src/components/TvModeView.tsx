import React, { useState, useEffect, useMemo } from 'react';
import { Tv, Building2, Trophy, Clock, X } from 'lucide-react';
import { Personal, Sale } from '../types';
import { formatCurrencyBRL } from '../services/webhookService';

interface TvModeViewProps {
  personais: Personal[];
  sales: Sale[];
  onClose: () => void;
}

export const TvModeView: React.FC<TvModeViewProps> = ({
  personais,
  sales,
  onClose
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute month ranking
  const leaderboard = useMemo(() => {
    const now = new Date();
    const monthSales = sales.filter((s) => {
      const d = new Date(s.timestamp);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const map = new Map<string, { salesCount: number; totalVolume: number; points: number }>();
    personais.forEach((p) => map.set(p.id, { salesCount: 0, totalVolume: 0, points: 0 }));

    monthSales.forEach((s) => {
      const curr = map.get(s.personalId) || { salesCount: 0, totalVolume: 0, points: 0 };
      curr.salesCount += 1;
      curr.totalVolume += s.value;
      curr.points += s.pointsAdded;
      map.set(s.personalId, curr);
    });

    const entries = personais
      .filter((p) => p.active)
      .map((p) => {
        const stats = map.get(p.id) || { salesCount: 0, totalVolume: 0, points: 0 };
        return {
          personal: p,
          salesCount: stats.salesCount,
          totalVolume: stats.totalVolume,
          points: stats.points,
          rank: 0
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
  }, [personais, sales]);

  const firstPlace = leaderboard[0];
  const secondPlace = leaderboard[1];
  const thirdPlace = leaderboard[2];

  return (
    <div className="fixed inset-0 z-50 bg-[#090A0C] text-white flex flex-col p-6 sm:p-10 select-none overflow-hidden animate-in fade-in">
      
      {/* TV HEADER */}
      <header className="flex items-center justify-between border-b border-white/[0.1] pb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F5A623] text-black font-extrabold flex items-center justify-center text-xl shadow-lg shadow-[#F5A623]/25 tracking-wider">
            NF
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <span>NEW FIT</span>
              <span className="text-[#F5A623]">SUPLEMENTOS</span>
            </h1>
            <p className="text-xs sm:text-sm font-mono text-zinc-400 uppercase tracking-widest">
              Leaderboard Oficial • Personais Parceiros do Mês
            </p>
          </div>
        </div>

        {/* Live Clock & Close Button */}
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-white">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block">
              Ao Vivo na Loja
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition border border-white/[0.08]"
            title="Sair do Modo TV (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* PODIUM TOP 3 NA TV */}
      <div className="grid grid-cols-3 gap-6 my-6 items-end shrink-0 max-w-6xl mx-auto w-full">
        
        {/* 2º Colocado */}
        {secondPlace && (
          <div className="bg-[#16171B] border border-white/[0.1] rounded-2xl p-6 flex flex-col justify-between h-[280px] shadow-xl">
            <div className="flex justify-between items-start">
              <span className="font-mono text-4xl font-extrabold text-zinc-500">02</span>
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/[0.15]">
                <img
                  src={secondPlace.personal.avatarUrl}
                  alt={secondPlace.personal.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <span className="text-xs font-mono uppercase text-zinc-400">2º Lugar</span>
              <h2 className="text-xl font-bold truncate mt-0.5">{secondPlace.personal.name}</h2>
              <span className="text-xs text-zinc-400 truncate block">{secondPlace.personal.gym}</span>
            </div>
            <div className="pt-3 border-t border-white/[0.08] flex justify-between items-center">
              <span className="text-xs font-mono text-zinc-400">Pontos</span>
              <span className="text-xl font-mono font-bold text-white">
                {secondPlace.points.toLocaleString('pt-BR')} <span className="text-xs text-zinc-500 font-normal">pts</span>
              </span>
            </div>
          </div>
        )}

        {/* 1º Colocado (Destaque Central) */}
        {firstPlace && (
          <div className="bg-[#1A1B22] border-2 border-[#F5A623] rounded-3xl p-8 flex flex-col justify-between h-[330px] shadow-2xl shadow-[#F5A623]/20 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#F5A623]/20 rounded-full blur-3xl pointer-events-none" />

            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-5xl font-black text-[#F5A623]">01</span>
                <span className="block text-[11px] font-mono uppercase bg-[#F5A623] text-black font-extrabold px-2 py-0.5 rounded mt-1">
                  LÍDER DO MÊS
                </span>
              </div>
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#F5A623] shadow-lg">
                <img
                  src={firstPlace.personal.avatarUrl}
                  alt={firstPlace.personal.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-black tracking-tight truncate">{firstPlace.personal.name}</h2>
              <div className="text-sm text-zinc-300 flex items-center gap-2 mt-1">
                <Building2 className="w-4 h-4 text-[#F5A623]" />
                <span className="truncate">{firstPlace.personal.gym}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.12] flex justify-between items-center">
              <div>
                <span className="text-xs font-mono text-zinc-400 uppercase block">Volume Total</span>
                <span className="text-sm font-bold text-[#F5A623] font-mono">
                  {formatCurrencyBRL(firstPlace.totalVolume)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-zinc-400 uppercase block">Pontos</span>
                <span className="text-2xl font-mono font-black text-white">
                  {firstPlace.points.toLocaleString('pt-BR')} <span className="text-sm text-[#F5A623] font-bold">pts</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3º Colocado */}
        {thirdPlace && (
          <div className="bg-[#16171B] border border-white/[0.1] rounded-2xl p-6 flex flex-col justify-between h-[260px] shadow-xl">
            <div className="flex justify-between items-start">
              <span className="font-mono text-4xl font-extrabold text-zinc-600">03</span>
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/[0.15]">
                <img
                  src={thirdPlace.personal.avatarUrl}
                  alt={thirdPlace.personal.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <span className="text-xs font-mono uppercase text-zinc-400">3º Lugar</span>
              <h2 className="text-xl font-bold truncate mt-0.5">{thirdPlace.personal.name}</h2>
              <span className="text-xs text-zinc-400 truncate block">{thirdPlace.personal.gym}</span>
            </div>
            <div className="pt-3 border-t border-white/[0.08] flex justify-between items-center">
              <span className="text-xs font-mono text-zinc-400">Pontos</span>
              <span className="text-xl font-mono font-bold text-white">
                {thirdPlace.points.toLocaleString('pt-BR')} <span className="text-xs text-zinc-500 font-normal">pts</span>
              </span>
            </div>
          </div>
        )}

      </div>

      {/* TABELA COMPLETA */}
      <div className="flex-1 overflow-auto max-w-6xl mx-auto w-full bg-[#16171B] border border-white/[0.08] rounded-2xl shadow-xl">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#121316] text-xs font-mono uppercase tracking-wider text-zinc-400">
              <th className="py-3 px-6 w-20 text-center">Pos</th>
              <th className="py-3 px-6">Personal Partner</th>
              <th className="py-3 px-6">Academia / Studio</th>
              <th className="py-3 px-6 text-center">Vendas</th>
              <th className="py-3 px-6 text-right">Volume</th>
              <th className="py-3 px-6 text-right">Pontuação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {leaderboard.map((item) => (
              <tr key={item.personal.id} className="hover:bg-white/[0.02]">
                <td className="py-3.5 px-6 text-center font-mono font-bold text-base">
                  <span
                    className={`inline-block w-8 py-0.5 rounded ${
                      item.rank === 1
                        ? 'bg-[#F5A623] text-black font-extrabold'
                        : item.rank === 2
                        ? 'bg-zinc-700 text-white'
                        : item.rank === 3
                        ? 'bg-zinc-800 text-zinc-300'
                        : 'text-zinc-500'
                    }`}
                  >
                    {String(item.rank).padStart(2, '0')}
                  </span>
                </td>
                <td className="py-3.5 px-6 font-bold text-white">{item.personal.name}</td>
                <td className="py-3.5 px-6 text-zinc-400">{item.personal.gym}</td>
                <td className="py-3.5 px-6 text-center font-mono text-zinc-300">{item.salesCount}</td>
                <td className="py-3.5 px-6 text-right font-mono text-zinc-300">{formatCurrencyBRL(item.totalVolume)}</td>
                <td className="py-3.5 px-6 text-right font-mono font-bold text-base text-[#F5A623]">
                  {item.points.toLocaleString('pt-BR')} pts
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

