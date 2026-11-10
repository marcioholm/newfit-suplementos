import React, { useMemo, useState } from 'react';
import { Trophy, Tv, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { Personal, Sale, PeriodFilter, LeaderboardEntry } from '../types';
import { formatCurrencyBRL } from '../services/webhookService';
import {
  Avatar,
  Button,
  EmptyState,
  Group,
  IconButton,
  Row,
  ScreenHeader,
  SearchField,
  Section,
  SegmentedControl,
  cx
} from '../ui/components';
import { spring } from '../ui/motion';

interface LeaderboardViewProps {
  personais: Personal[];
  sales: Sale[];
  period: PeriodFilter;
  setPeriod: (p: PeriodFilter) => void;
  onSelectPersonalForSale?: (personalId: string) => void;
  onNavigateToPersonais?: () => void;
  onOpenTvMode?: () => void;
  /** Texto do estado vazio (o portal do personal usa outro) */
  emptyState?: { title: string; message: string };
  /** De onde vêm os dados (planilha ou aparelho) */
  sourceNote?: string;
}

const PERIODS: { value: PeriodFilter; label: string }[] = [
  { value: '7d', label: '7 dias' },
  { value: 'month', label: 'Mês' },
  { value: 'all', label: 'Geral' }
];

const pts = (n: number) => n.toLocaleString('pt-BR');

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  personais,
  sales,
  period,
  setPeriod,
  onSelectPersonalForSale,
  onNavigateToPersonais,
  onOpenTvMode,
  emptyState,
  sourceNote
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Vendas do período selecionado
  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter((s) => {
      const saleDate = new Date(s.timestamp);
      if (period === '7d') return (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24) <= 7;
      if (period === 'month') {
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [sales, period]);

  // Pontuação de cada personal ativo
  const leaderboard: LeaderboardEntry[] = useMemo(() => {
    const active = personais.filter((p) => p.active);
    const map = new Map<string, { salesCount: number; totalVolume: number; points: number }>();
    active.forEach((p) => map.set(p.id, { salesCount: 0, totalVolume: 0, points: 0 }));
    filteredSales.forEach((s) => {
      const curr = map.get(s.personalId);
      if (curr) {
        curr.salesCount += 1;
        curr.totalVolume += s.value;
        curr.points += s.pointsAdded;
      }
    });
    const entries: LeaderboardEntry[] = active.map((p) => ({
      rank: 0,
      personal: p,
      ...(map.get(p.id) || { salesCount: 0, totalVolume: 0, points: 0 })
    }));
    entries.sort((a, b) => (b.points !== a.points ? b.points - a.points : b.totalVolume - a.totalVolume));
    entries.forEach((e, idx) => (e.rank = idx + 1));
    return entries;
  }, [personais, filteredSales]);

  const displayEntries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return leaderboard;
    return leaderboard.filter(
      (e) =>
        e.personal.name.toLowerCase().includes(term) ||
        e.personal.gym.toLowerCase().includes(term) ||
        e.personal.code.toLowerCase().includes(term)
    );
  }, [leaderboard, searchTerm]);

  const periodLabel =
    period === 'month'
      ? new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      : period === '7d'
      ? 'Últimos 7 dias'
      : 'Desde o início';

  const [first, second, third] = leaderboard;
  const totalVolume = leaderboard.reduce((acc, e) => acc + e.totalVolume, 0);

  return (
    <div>
      <ScreenHeader
        title="Ranking"
        subtitle={<span className="first-letter:uppercase inline-block">{periodLabel}</span>}
        actions={
          onOpenTvMode && (
            <IconButton label="Modo TV" onClick={onOpenTvMode} className="lg:hidden">
              <Tv className="w-[18px] h-[18px]" />
            </IconButton>
          )
        }
      />

      <SegmentedControl
        label="Período do ranking"
        value={period}
        onChange={setPeriod}
        options={PERIODS}
        className="mb-6 sm:max-w-[340px]"
      />

      {leaderboard.length === 0 ? (
        <EmptyState
          icon={<Trophy className="w-7 h-7" />}
          title={emptyState?.title ?? 'Nenhum personal ainda'}
          message={
            emptyState?.message ?? 'Cadastre os personais parceiros para começar a contar as indicações e montar o ranking.'
          }
          action={
            onNavigateToPersonais && (
              <Button variant="filled" icon={<UserPlus className="w-4 h-4" />} onClick={onNavigateToPersonais}>
                Cadastrar personal
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Pódio */}
          <div className="mb-8 space-y-3">
            {first && (
              <motion.div
                layout
                transition={spring.default}
                className="relative overflow-hidden rounded-[20px] bg-surface p-5 sm:p-6"
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(120% 80% at 100% 0%, rgb(var(--tint) / 0.22) 0%, rgb(var(--tint) / 0) 60%)'
                  }}
                  aria-hidden
                />
                <div className="relative flex items-center gap-4">
                  <Avatar personal={first.personal} size={64} ring />
                  <div className="flex-1 min-w-0">
                    <p className="type-footnote font-semibold text-tint-text flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5" aria-hidden /> 1º lugar
                    </p>
                    <h2 className="type-title-2 text-label truncate">{first.personal.name}</h2>
                    <p className="type-footnote text-label-2 truncate">{first.personal.gym}</p>
                  </div>
                </div>
                <div className="relative mt-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[2.75rem] leading-none font-bold tracking-[-0.03em] tabular-nums text-label">
                      {pts(first.points)}
                    </p>
                    <p className="type-footnote text-label-2 mt-1">pontos</p>
                  </div>
                  <div className="text-right">
                    <p className="type-headline tabular-nums text-label">{formatCurrencyBRL(first.totalVolume)}</p>
                    <p className="type-footnote text-label-2">
                      {first.salesCount} {first.salesCount === 1 ? 'venda' : 'vendas'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {(second || third) && (
              <div className="grid grid-cols-2 gap-3">
                {[second, third].map((entry, i) =>
                  entry ? (
                    <motion.div
                      layout
                      transition={spring.default}
                      key={entry.personal.id}
                      className="rounded-[16px] bg-surface p-4"
                    >
                      <div className="flex items-center justify-between">
                        <Avatar personal={entry.personal} size={44} />
                        <span className="type-headline tabular-nums text-label-2">{i + 2}º</span>
                      </div>
                      <p className="type-headline text-label truncate mt-3">{entry.personal.name}</p>
                      <p className="type-footnote text-label-2 truncate">{entry.personal.gym}</p>
                      <p className="type-title-3 tabular-nums text-label mt-2">
                        {pts(entry.points)} <span className="type-footnote text-label-2 font-normal">pts</span>
                      </p>
                    </motion.div>
                  ) : (
                    <div key={`empty-${i}`} />
                  )
                )}
              </div>
            )}
          </div>

          {/* Classificação completa */}
          <Section
            title="Classificação"
            footer={
              [
                period !== 'all' && totalVolume > 0 ? `${formatCurrencyBRL(totalVolume)} em vendas indicadas no período.` : '',
                sourceNote ?? ''
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
          >
            {leaderboard.length > 5 && (
              <SearchField
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar personal, academia ou cupom"
                className="mb-3"
              />
            )}
            <Group>
              {displayEntries.length === 0 ? (
                <Row title={<span className="text-label-2">Nenhum resultado para “{searchTerm}”</span>} />
              ) : (
                displayEntries.map((entry) => (
                  <motion.div layout="position" transition={spring.default} key={entry.personal.id}>
                    <Row
                      leading={
                        <div className="flex items-center gap-3">
                          <span
                            className={cx(
                              'w-6 text-center type-subhead font-semibold tabular-nums',
                              entry.rank === 1 ? 'text-tint-text' : 'text-label-2'
                            )}
                          >
                            {entry.rank}
                          </span>
                          <Avatar personal={entry.personal} size={40} />
                        </div>
                      }
                      title={entry.personal.name}
                      subtitle={`${entry.personal.gym} · ${entry.personal.code}`}
                      trailing={
                        <>
                          <span className="text-right">
                            <span className="block type-headline tabular-nums text-label">{pts(entry.points)}</span>
                            <span className="block type-caption text-label-2 -mt-0.5">pts</span>
                          </span>
                          {onSelectPersonalForSale && (
                            <Button
                              size="sm"
                              variant="tinted"
                              onClick={() => onSelectPersonalForSale(entry.personal.id)}
                              aria-label={`Lançar venda para ${entry.personal.name}`}
                              className="hidden sm:inline-flex"
                            >
                              Vender
                            </Button>
                          )}
                        </>
                      }
                    />
                  </motion.div>
                ))
              )}
            </Group>
          </Section>
        </>
      )}
    </div>
  );
};
