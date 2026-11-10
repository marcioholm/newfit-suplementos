import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Trophy, X } from 'lucide-react';
import { Personal, Sale } from '../types';
import { formatCurrencyBRL } from '../services/webhookService';
import { Avatar, cx } from '../ui/components';
import { spring } from '../ui/motion';
import { NewFitLogo } from './NewFitLogo';

interface TvModeViewProps {
  personais: Personal[];
  sales: Sale[];
  onClose: () => void;
}

const pts = (n: number) => n.toLocaleString('pt-BR');

/** Ranking em tela cheia para a TV da loja. Sempre escuro, legível à distância. */
export const TvModeView: React.FC<TvModeViewProps> = ({ personais, sales, onClose }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      clearInterval(timer);
      document.body.style.overflow = overflow;
    };
  }, []);

  const leaderboard = useMemo(() => {
    const ref = new Date();
    const monthSales = sales.filter((s) => {
      const d = new Date(s.timestamp);
      return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
    });
    const active = personais.filter((p) => p.active);
    const map = new Map<string, { salesCount: number; totalVolume: number; points: number }>();
    active.forEach((p) => map.set(p.id, { salesCount: 0, totalVolume: 0, points: 0 }));
    monthSales.forEach((s) => {
      const curr = map.get(s.personalId);
      if (curr) {
        curr.salesCount += 1;
        curr.totalVolume += s.value;
        curr.points += s.pointsAdded;
      }
    });
    return active
      .map((p) => ({ personal: p, ...(map.get(p.id) || { salesCount: 0, totalVolume: 0, points: 0 }) }))
      .sort((a, b) => (b.points !== a.points ? b.points - a.points : b.totalVolume - a.totalVolume))
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }, [personais, sales]);

  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const podium = [leaderboard[1], leaderboard[0], leaderboard[2]];

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Modo TV"
      className="theme-dark fixed inset-0 z-[90] bg-black text-white flex flex-col px-[4vw] py-[3.5vh] overflow-hidden select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <header className="flex items-start justify-between gap-6 shrink-0">
        <div className="flex items-center gap-[1.4vw]">
          <NewFitLogo variant="dark" className="h-[7vh] min-h-12" />
          <div>
            <h1 className="font-bold tracking-[-0.025em] leading-none text-[clamp(1.75rem,3.4vw,4rem)]">
              Ranking de Personais
            </h1>
            <p className="text-label-2 mt-[0.6vh] text-[clamp(0.95rem,1.4vw,1.6rem)] first-letter:uppercase">
              New Fit Suplementos · {monthLabel}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <p className="font-semibold tabular-nums tracking-[-0.02em] leading-none text-[clamp(1.75rem,3.4vw,4rem)]">
            {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sair do Modo TV (Esc)"
            className="pressable w-10 h-10 rounded-full bg-white/10 text-white/70 hover:text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {leaderboard.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Trophy className="w-16 h-16 text-tint mb-6" aria-hidden />
          <h2 className="text-[clamp(1.5rem,2.6vw,3rem)] font-bold tracking-[-0.02em]">O ranking do mês começa na primeira venda</h2>
          <p className="text-label-2 mt-2 text-[clamp(1rem,1.4vw,1.5rem)]">
            Indique a New Fit para seus alunos e apareça aqui.
          </p>
        </div>
      ) : (
        <>
          {/* Pódio */}
          <div className="grid grid-cols-3 gap-[1.6vw] items-end mt-[4vh] shrink-0">
            {podium.map((entry, i) => {
              if (!entry) return <div key={`empty-${i}`} />;
              const isFirst = entry.rank === 1;
              return (
                <motion.div
                  key={entry.personal.id}
                  layout
                  transition={spring.default}
                  className={cx(
                    'relative overflow-hidden rounded-[28px] bg-surface flex flex-col items-center text-center',
                    isFirst ? 'py-[3.4vh] px-[2vw]' : 'py-[2.4vh] px-[1.6vw]'
                  )}
                >
                  {isFirst && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: 'radial-gradient(90% 70% at 50% 0%, rgb(245 166 35 / 0.28), transparent 70%)' }}
                      aria-hidden
                    />
                  )}
                  <span
                    className={cx(
                      'relative font-bold tabular-nums leading-none',
                      isFirst ? 'text-tint text-[clamp(1.5rem,2.4vw,3rem)]' : 'text-label-2 text-[clamp(1.25rem,1.8vw,2.25rem)]'
                    )}
                  >
                    {entry.rank}º
                  </span>
                  <Avatar
                    personal={entry.personal}
                    size={isFirst ? 168 : 120}
                    ring={isFirst}
                    className={cx('relative mt-[2vh]', isFirst ? '!w-[9vw] !h-[9vw]' : '!w-[6.5vw] !h-[6.5vw]')}
                  />
                  <h2
                    className={cx(
                      'relative font-bold tracking-[-0.02em] truncate max-w-full mt-[1.8vh]',
                      isFirst ? 'text-[clamp(1.5rem,2.6vw,3.25rem)]' : 'text-[clamp(1.2rem,1.9vw,2.4rem)]'
                    )}
                  >
                    {entry.personal.name}
                  </h2>
                  <p className="relative text-label-2 truncate max-w-full text-[clamp(0.9rem,1.2vw,1.4rem)]">
                    {entry.personal.gym}
                  </p>
                  <p
                    className={cx(
                      'relative font-bold tabular-nums tracking-[-0.03em] leading-none mt-[2vh]',
                      isFirst ? 'text-[clamp(2.5rem,4.6vw,6rem)]' : 'text-[clamp(1.8rem,3vw,3.75rem)]'
                    )}
                  >
                    {pts(entry.points)}
                  </p>
                  <p className="relative text-label-2 text-[clamp(0.9rem,1.1vw,1.3rem)] mt-1">pontos</p>
                </motion.div>
              );
            })}
          </div>

          {/* Demais posições */}
          {leaderboard.length > 3 && (
            <div className="flex-1 min-h-0 mt-[3vh] rounded-[24px] bg-surface overflow-hidden">
              <ol className="h-full overflow-hidden grid grid-cols-2 auto-rows-min gap-x-[2vw] px-[2vw] py-[1.5vh]">
                {leaderboard.slice(3, 15).map((e) => (
                  <motion.li
                    key={e.personal.id}
                    layout
                    transition={spring.default}
                    className="flex items-center gap-[1.2vw] py-[1.1vh] border-b-[0.5px] border-white/10"
                  >
                    <span className="w-[2.6vw] text-label-2 font-semibold tabular-nums text-[clamp(1rem,1.5vw,1.8rem)]">
                      {e.rank}
                    </span>
                    <Avatar personal={e.personal} size={56} className="!w-[3vw] !h-[3vw] min-w-9 min-h-9" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold truncate text-[clamp(1rem,1.5vw,1.8rem)]">{e.personal.name}</span>
                      <span className="block text-label-2 truncate text-[clamp(0.8rem,1vw,1.2rem)]">
                        {e.personal.gym} · {formatCurrencyBRL(e.totalVolume)}
                      </span>
                    </span>
                    <span className="font-bold tabular-nums text-[clamp(1.1rem,1.7vw,2rem)]">{pts(e.points)}</span>
                  </motion.li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </motion.div>,
    document.body
  );
};
