import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Loader2, RotateCw, Share, Store, UserRound, WifiOff } from 'lucide-react';
import { Personal, Sale, PeriodFilter } from '../types';
import { formatCurrencyBRL, computeMonthStanding } from '../services/webhookService';
import { referralText, portalUrl, shareOrCopy } from '../services/referral';
import { LeaderboardView } from './LeaderboardView';
import { NewFitLogo } from './NewFitLogo';
import {
  Avatar,
  EmptyState,
  FieldRow,
  Group,
  Row,
  ScreenHeader,
  Section,
  SegmentedControl
} from '../ui/components';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/components';
import { ChevronsUpDown } from 'lucide-react';

interface PersonalPortalViewProps {
  personais: Personal[];
  sales: Sale[];
  initialCode?: string;
  onExitPortal?: () => void;
  loading?: boolean;
  failed?: boolean;
  onRetry?: () => void;
  sourceNote?: string;
}

type PortalTab = 'ranking' | 'meu-espaco';

/** Portal público dos personais: ranking + espaço pessoal, sem dados do balcão. */
export const PersonalPortalView: React.FC<PersonalPortalViewProps> = ({
  personais,
  sales,
  initialCode = '',
  onExitPortal,
  loading,
  failed,
  onRetry,
  sourceNote
}) => {
  const toast = useToast();
  const active = useMemo(() => personais.filter((p) => p.active), [personais]);
  const codeMatch = active.find((p) => p.code.toLowerCase() === initialCode.toLowerCase());

  const [tab, setTab] = useState<PortalTab>(codeMatch ? 'meu-espaco' : 'ranking');
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [personalId, setPersonalId] = useState<string>(codeMatch?.id ?? active[0]?.id ?? '');
  const personal = active.find((p) => p.id === personalId) || active[0] || null;

  // Os dados chegam da planilha depois da primeira renderização: aplica o cupom do link quando chegarem
  useEffect(() => {
    if (codeMatch && !active.some((p) => p.id === personalId)) {
      setPersonalId(codeMatch.id);
      setTab('meu-espaco');
    }
  }, [codeMatch, active, personalId]);

  const mine = useMemo(() => {
    if (!personal) return null;
    const now = new Date();
    const all = sales.filter((s) => s.personalId === personal.id);
    const month = all.filter((s) => {
      const d = new Date(s.timestamp);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const standing = computeMonthStanding(sales, personais, personal.id, now);
    return {
      rank: standing.rank,
      points: standing.monthPoints,
      count: month.length,
      volume: month.reduce((acc, s) => acc + s.value, 0),
      history: [...all].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    };
  }, [personal, sales, personais]);

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.show({ kind: 'success', title: `${what} copiado` });
    } catch {
      toast.show({ kind: 'error', title: 'Não foi possível copiar' });
    }
  };

  const noData = active.length === 0;

  return (
    <div className="min-h-[100dvh] bg-bg text-label">
      <header className="sticky top-0 z-30 material border-b-[0.5px] border-separator/30 safe-top">
        <div className="max-w-[760px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <NewFitLogo className="h-9" />
          <span className="type-footnote font-semibold text-label-2">Portal do Personal</span>
        </div>
      </header>

      <main className="max-w-[760px] mx-auto px-4 sm:px-6 pb-[calc(env(safe-area-inset-bottom)+32px)]">
        {noData && loading ? (
          <div className="pt-24 flex flex-col items-center text-label-2" role="status">
            <Loader2 className="w-7 h-7 animate-spin" aria-hidden />
            <p className="type-subhead mt-3">Carregando ranking…</p>
          </div>
        ) : noData && failed ? (
          <div className="pt-10">
            <EmptyState
              icon={<WifiOff className="w-7 h-7" />}
              title="Não foi possível carregar"
              message="Verifique sua internet e tente de novo."
              action={
                onRetry && (
                  <Button variant="filled" icon={<RotateCw className="w-4 h-4" />} onClick={onRetry}>
                    Tentar de novo
                  </Button>
                )
              }
            />
          </div>
        ) : noData ? (
          <div className="pt-10">
            <EmptyState
              icon={<Store className="w-7 h-7" />}
              title="Ranking em preparação"
              message="Os personais parceiros ainda não foram publicados. Volte em breve!"
            />
          </div>
        ) : (
          <>
            <div className="pt-4">
              <SegmentedControl<PortalTab>
                label="Seção do portal"
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'ranking', label: 'Ranking' },
                  { value: 'meu-espaco', label: 'Meu espaço' }
                ]}
                className="sm:max-w-[340px]"
              />
            </div>

            {tab === 'ranking' ? (
              <LeaderboardView
                personais={personais}
                sales={sales}
                period={period}
                setPeriod={setPeriod}
                sourceNote={sourceNote}
                emptyState={{ title: 'Ranking vazio', message: 'O ranking aparece aqui depois das primeiras vendas.' }}
              />
            ) : (
              personal &&
              mine && (
                <div>
                  <ScreenHeader
                    title="Meu espaço"
                    subtitle={new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase())}
                  />

                  <Section>
                    <Group>
                      <FieldRow label="Personal" htmlFor="portal-personal">
                        <div className="relative flex items-center gap-2">
                          <Avatar personal={personal} size={28} />
                          <select
                            id="portal-personal"
                            value={personal.id}
                            onChange={(e) => setPersonalId(e.target.value)}
                            className="flex-1 appearance-none bg-transparent type-body text-label py-2.5 pr-7 outline-none cursor-pointer"
                          >
                            {active.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <ChevronsUpDown className="w-4 h-4 text-label-3 absolute right-0 pointer-events-none" aria-hidden />
                        </div>
                      </FieldRow>
                    </Group>
                  </Section>

                  <div className="grid grid-cols-2 gap-3 mb-7">
                    {[
                      { label: 'Posição no mês', value: `${mine.rank}º` },
                      { label: 'Pontos no mês', value: mine.points.toLocaleString('pt-BR') },
                      { label: 'Vendas no mês', value: mine.count.toLocaleString('pt-BR') },
                      { label: 'Volume no mês', value: formatCurrencyBRL(mine.volume) }
                    ].map((s) => (
                      <div key={s.label} className="bg-surface rounded-card p-4">
                        <p className="type-footnote text-label-2">{s.label}</p>
                        <p className="type-title-2 tabular-nums text-label mt-1 truncate">{s.value}</p>
                      </div>
                    ))}
                  </div>

                  <Section title="Seu cupom" footer="Envie o texto para seus alunos. Cada compra com o seu cupom soma pontos no ranking.">
                    <Group>
                      <Row
                        title={<span className="font-semibold tracking-[0.04em]">{personal.code}</span>}
                        trailing={
                          <button
                            type="button"
                            onClick={() => copy(personal.code, 'Cupom')}
                            className="pressable inline-flex items-center gap-1 h-8 px-3 rounded-full bg-tint/15 text-tint-text type-footnote font-semibold"
                          >
                            <Copy className="w-3.5 h-3.5" aria-hidden /> Copiar
                          </button>
                        }
                      />
                      <div className="px-4 py-3 type-subhead text-label border-t-[0.5px] border-separator/30 ml-4 pl-0">
                        {referralText(personal.code)}
                      </div>
                      <Row
                        onClick={async () => {
                          const r = await shareOrCopy({ title: 'Cupom New Fit', text: referralText(personal.code) });
                          if (r === 'copied') toast.show({ kind: 'success', title: 'Texto copiado' });
                        }}
                        leading={<Share className="w-5 h-5 text-tint-text" aria-hidden />}
                        title={<span className="text-tint-text">Enviar para os alunos</span>}
                      />
                    </Group>
                  </Section>

                  <Section title={`Vendas com seu cupom (${mine.history.length})`}>
                    <Group>
                      {mine.history.length === 0 ? (
                        <Row title={<span className="text-label-2">Nenhuma venda ainda. Divulgue seu cupom!</span>} />
                      ) : (
                        mine.history.slice(0, 30).map((s) => (
                          <Row
                            key={s.id}
                            title={s.notes || 'Suplementos New Fit'}
                            subtitle={new Date(s.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                            trailing={
                              <span className="text-right">
                                <span className="block type-subhead tabular-nums text-label">{formatCurrencyBRL(s.value)}</span>
                                <span className="block type-caption text-tint-text font-semibold">+{s.pointsAdded.toLocaleString('pt-BR')} pts</span>
                              </span>
                            }
                          />
                        ))
                      )}
                    </Group>
                  </Section>
                </div>
              )
            )}
          </>
        )}

        {onExitPortal && (
          <div className="text-center pt-4">
            <button type="button" onClick={onExitPortal} className="type-footnote text-label-2 inline-flex items-center gap-1 h-10 pressable">
              <UserRound className="w-3.5 h-3.5" aria-hidden /> Área da loja
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export { portalUrl };
