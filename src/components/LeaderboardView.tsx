import React, { useMemo, useState } from 'react';
import { Loader2, RotateCw, Trophy, Tv, UserPlus, WifiOff } from 'lucide-react';
import { Personal, PodiumPrizes, Sale, PeriodFilter, LeaderboardEntry } from '../types';
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
  loading?: boolean;
  failed?: boolean;
  onRetry?: () => void;
  prizes?: PodiumPrizes;
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
  sourceNote,
  loading,
  failed,
  onRetry,
  prizes
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

      {loading ? (
        <div className="pt-20 pb-16 flex flex-col items-center text-center text-label-2" role="status" aria-live="polite">
          <Loader2 className="w-8 h-8 animate-spin text-tint" aria-hidden />
          <p className="type-headline text-label mt-4">Carregando ranking…</p>
          <p className="type-subhead text-label-2 mt-1">Aguardando dados atualizados da planilha.</p>
        </div>
      ) : failed ? (
        <EmptyState
          icon={<WifiOff className="w-7 h-7" />}
          title="Não foi possível carregar o ranking"
          message="Verifique a conexão e tente de novo para evitar mostrar dados desatualizados."
          action={
            onRetry && (
              <Button variant="filled" icon={<RotateCw className="w-4 h-4" />} onClick={onRetry}>
                Tentar de novo
              </Button>
            )
          }
        />
      ) : leaderboard.length === 0 ? (
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
              <div className="relative overflow-hidden rounded-[20px] bg-surface p-5 sm:p-6">
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
                      {pts(first.points)}{' '}
                      <span className="type-subhead font-normal text-label-2 tracking-normal">pontos</span>
                    </p>
                    {prizes?.first?.trim() && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-tint/15 px-2.5 py-1 type-footnote font-semibold text-tint-text">
                        <span>🏆</span>
                        <span>{prizes.first.trim()}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="type-headline tabular-nums text-label">{formatCurrencyBRL(first.totalVolume)}</p>
                    <p className="type-footnote text-label-2">
                      {first.salesCount} {first.salesCount === 1 ? 'venda' : 'vendas'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(second || third) && (
              <div className="grid grid-cols-2 gap-3">
                {[second, third].map((entry, i) => {
                  const prizeText = (i === 0 ? prizes?.second : prizes?.third)?.trim();
                  return entry ? (
                    <div key={entry.personal.id} className="rounded-[16px] bg-surface p-4">
                      <div className="flex items-center justify-between">
                        <Avatar personal={entry.personal} size={44} />
                        <span className="type-headline tabular-nums text-label-2">{i + 2}º</span>
                      </div>
                      <p className="type-headline text-label truncate mt-3">{entry.personal.name}</p>
                      <p className="type-footnote text-label-2 truncate">{entry.personal.gym}</p>
                      <p className="type-title-3 tabular-nums text-label mt-2">
                        {pts(entry.points)}{' '}
                        <span className="type-footnote text-label-2 font-normal tracking-normal">pontos</span>
                      </p>
                      {prizeText && (
                        <div className="mt-1.5 inline-flex max-w-full items-center gap-1 rounded-full bg-fill/12 px-2 py-0.5 type-caption font-semibold text-label">
                          <span className="shrink-0">🏆</span>
                          <span className="truncate">{prizeText}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div key={`empty-${i}`} />
                  );
                })}
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
                displayEntries.map((entry) => {
                  const listPrize = (
                    entry.rank === 4 ? prizes?.fourth : entry.rank === 5 ? prizes?.fifth : ''
                  )?.trim();
                  const isPrizeHighlight = (entry.rank === 4 || entry.rank === 5) && Boolean(listPrize);
                  return (
                    <Row
                      key={entry.personal.id}
                      className={isPrizeHighlight ? 'bg-tint/[0.09]' : undefined}
                      leading={
                        <div className="flex items-center gap-3">
                          <span
                            className={cx(
                              'w-6 text-center type-subhead font-semibold tabular-nums',
                              entry.rank === 1 || isPrizeHighlight ? 'text-tint-text' : 'text-label-2'
                            )}
                          >
                            {entry.rank}
                          </span>
                          <Avatar personal={entry.personal} size={40} />
                        </div>
                      }
                      trailing={
                        <>
                          {listPrize && (
                            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-tint/15 px-2.5 py-0.5 type-caption font-semibold text-tint-text max-w-[180px]">
                              <span className="shrink-0">🏆</span>
                              <span className="truncate">{listPrize}</span>
                            </span>
                          )}
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
                    >
                      <div className="flex-1 min-w-0 text-left">
                        <div className="type-body text-label truncate">{entry.personal.name}</div>
                        <div className="type-footnote text-label-2 truncate mt-0.5">
                          {[entry.personal.gym, entry.personal.code].filter(Boolean).join(' · ')}
                        </div>
                        {listPrize && (
                          <div className="mt-1 sm:hidden">
                            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-tint/15 px-2 py-0.5 type-caption font-semibold text-tint-text">
                              <span className="shrink-0">🏆</span>
                              <span className="truncate">{listPrize}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </Row>
                  );
                })
              )}
            </Group>
          </Section>
        </>
      )}
    </div>
  );
};
