import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronsUpDown,
  Download,
  Loader2,
  Lock,
  MessageCircle,
  Plus,
  RotateCw,
  ShoppingBag,
  Trash2,
  Trophy,
  UserPlus,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Personal, Sale, AppSettings, PodiumPrizes } from '../types';
import {
  formatCurrencyBRL,
  buildWhatsAppMessage,
  parseBRL,
  toLocalDateTimeInput,
  computeMonthStanding
} from '../services/webhookService';
import { playSuccessChime } from '../services/audioService';
import {
  Avatar,
  BareInput,
  Button,
  EmptyState,
  FieldRow,
  Group,
  IconButton,
  Row,
  ScreenHeader,
  Section,
  StatusBadge
} from '../ui/components';
import { Sheet } from '../ui/Sheet';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { useToast } from '../ui/Toast';
import { haptic } from '../ui/motion';

interface LeoCounterViewProps {
  personais: Personal[];
  sales: Sale[];
  settings: AppSettings;
  prizes?: PodiumPrizes;
  onUpdatePrizes: (prizes: PodiumPrizes) => void;
  onAddSale: (saleData: {
    personalId: string;
    clientName: string;
    value: number;
    notes: string;
    timestamp: string;
  }) => Promise<{ success: boolean; statusText: string }>;
  onResendWebhook: (sale: Sale) => Promise<void>;
  onDeleteSale: (saleId: string) => void;
  preselectedPersonalId?: string;
  onNavigateToPersonais?: () => void;
  onLock?: () => void;
}

const QUICK_PRODUCTS = [
  '100% Whey Dux 900g',
  'Creatina Creapure 300g',
  'Pré-Treino Égide Max',
  'Iso Whey Adaptogen',
  'Pasta Dr. Peanut 600g',
  'Barra Proteína Caixa',
  'Ômega 3 Ultra Dux',
  'Beta Alanina Max 200g'
];

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return sameDay ? time : `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${time}`;
};

export const LeoCounterView: React.FC<LeoCounterViewProps> = ({
  personais,
  sales,
  settings,
  prizes,
  onUpdatePrizes,
  onAddSale,
  onResendWebhook,
  onDeleteSale,
  preselectedPersonalId,
  onNavigateToPersonais,
  onLock
}) => {
  const toast = useToast();
  const activePersonais = useMemo(() => personais.filter((p) => p.active), [personais]);

  const initialPersonalId = useMemo(() => {
    if (preselectedPersonalId && activePersonais.some((p) => p.id === preselectedPersonalId)) {
      return preselectedPersonalId;
    }
    return activePersonais[0]?.id || '';
  }, [preselectedPersonalId, activePersonais]);

  // Formulário
  const [personalId, setPersonalId] = useState<string>(initialPersonalId);
  const [clientName, setClientName] = useState('');
  const [valueStr, setValueStr] = useState('');
  const [notes, setNotes] = useState('');
  const [dateStr, setDateStr] = useState(() => toLocalDateTimeInput(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const effectivePrizes: PodiumPrizes = prizes ?? settings.prizes ?? { first: '', second: '', third: '', fourth: '', fifth: '' };
  const [prizeDraft, setPrizeDraft] = useState<PodiumPrizes>({
    first: effectivePrizes.first || '',
    second: effectivePrizes.second || '',
    third: effectivePrizes.third || '',
    fourth: effectivePrizes.fourth || '',
    fifth: effectivePrizes.fifth || ''
  });

  useEffect(() => {
    setPrizeDraft({
      first: effectivePrizes.first || '',
      second: effectivePrizes.second || '',
      third: effectivePrizes.third || '',
      fourth: effectivePrizes.fourth || '',
      fifth: effectivePrizes.fifth || ''
    });
  }, [
    effectivePrizes.first,
    effectivePrizes.second,
    effectivePrizes.third,
    effectivePrizes.fourth,
    effectivePrizes.fifth
  ]);

  const prizesChanged =
    prizeDraft.first.trim() !== (effectivePrizes.first || '').trim() ||
    prizeDraft.second.trim() !== (effectivePrizes.second || '').trim() ||
    prizeDraft.third.trim() !== (effectivePrizes.third || '').trim() ||
    (prizeDraft.fourth || '').trim() !== (effectivePrizes.fourth || '').trim() ||
    (prizeDraft.fifth || '').trim() !== (effectivePrizes.fifth || '').trim();

  const handleSavePrizes = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePrizes({
      first: prizeDraft.first.trim(),
      second: prizeDraft.second.trim(),
      third: prizeDraft.third.trim(),
      fourth: (prizeDraft.fourth || '').trim(),
      fifth: (prizeDraft.fifth || '').trim()
    });
  };

  // Detalhe de venda e confirmação de exclusão
  const [openSaleId, setOpenSaleId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const openSale = sales.find((s) => s.id === openSaleId) || null;

  useEffect(() => {
    if (!activePersonais.some((p) => p.id === personalId)) {
      setPersonalId(activePersonais[0]?.id || '');
    }
  }, [activePersonais, personalId]);

  const selectedPersonal = useMemo(
    () => activePersonais.find((p) => p.id === personalId) || activePersonais[0] || null,
    [activePersonais, personalId]
  );

  const parsedValue = useMemo(() => parseBRL(valueStr), [valueStr]);
  const calculatedPoints = Math.round(parsedValue);

  // Resumo do mês
  const month = useMemo(() => {
    const now = new Date();
    const monthSales = sales.filter((s) => {
      const d = new Date(s.timestamp);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const total = monthSales.reduce((acc, s) => acc + s.value, 0);
    return {
      total,
      commission: total * (settings.commissionRate || 0.1),
      count: monthSales.length,
      ticket: monthSales.length ? total / monthSales.length : 0,
      monthSales
    };
  }, [sales, settings.commissionRate]);

  // Posição e pontos do personal, iguais ao que será enviado no payload
  const standing = useMemo(() => {
    if (!selectedPersonal) return { rank: 1, points: 0 };
    if (calculatedPoints <= 0) {
      const s = computeMonthStanding(sales, personais, selectedPersonal.id, dateStr);
      return { rank: s.rank, points: s.monthPoints };
    }
    const virtualSale: Sale = {
      id: 'preview',
      personalId: selectedPersonal.id,
      personalName: selectedPersonal.name,
      clientName: clientName.trim() || 'Cliente Balcão',
      value: parsedValue,
      pointsAdded: calculatedPoints,
      notes: notes.trim(),
      timestamp: new Date(dateStr).toISOString(),
      webhookStatus: 'pending'
    };
    const s = computeMonthStanding([virtualSale, ...sales], personais, selectedPersonal.id, dateStr);
    return { rank: s.rank, points: s.monthPoints };
  }, [sales, personais, selectedPersonal, calculatedPoints, parsedValue, clientName, notes, dateStr]);

  const messagePreview = useMemo(() => {
    if (!selectedPersonal) return '';
    return buildWhatsAppMessage({
      template: settings.whatsappTemplate,
      personal: selectedPersonal,
      sale: {
        clientName: clientName.trim() || 'Nome do aluno',
        value: parsedValue || 0,
        notes: notes.trim() || 'Itens comprados',
        pointsAdded: calculatedPoints || 0
      },
      currentRank: standing.rank,
      totalPoints: standing.points
    });
  }, [selectedPersonal, clientName, parsedValue, notes, calculatedPoints, standing, settings.whatsappTemplate]);

  const whatsappUrl = selectedPersonal?.phone
    ? `https://wa.me/${selectedPersonal.phone.replace(/\D/g, '')}?text=${encodeURIComponent(messagePreview)}`
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonal || parsedValue <= 0) return;

    setIsSubmitting(true);
    try {
      const value = parsedValue;
      const result = await onAddSale({
        personalId: selectedPersonal.id,
        clientName: clientName.trim() || 'Cliente Balcão',
        value,
        notes: notes.trim() || 'Suplementos New Fit',
        timestamp: new Date(dateStr).toISOString()
      });

      setClientName('');
      setValueStr('');
      setNotes('');
      setDateStr(toLocalDateTimeInput(new Date()));

      if (result.success) {
        // Som, vibração e aviso no mesmo instante
        if (soundEnabled) playSuccessChime();
        haptic('success');
        toast.show({
          kind: 'success',
          title: `${formatCurrencyBRL(value)} lançado`,
          message: `${selectedPersonal.firstName} será avisado pelo WhatsApp.`
        });
      } else {
        haptic('error');
        // Fica na tela até fechar: o personal NÃO foi avisado
        toast.show({
          kind: 'error',
          title: 'Venda salva, mas não enviada',
          message: `Não chegou à planilha nem ao WhatsApp. ${result.statusText}. Corrija e toque na venda para reenviar.`
        });
      }
    } catch (err: any) {
      toast.show({ kind: 'error', title: 'Erro ao registrar venda', message: err?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async (sale: Sale) => {
    setResendingId(sale.id);
    try {
      await onResendWebhook(sale);
    } finally {
      setResendingId(null);
    }
  };

  // Comissões do mês em CSV (abre no Excel)
  const handleExportCommissionsCSV = () => {
    const map = new Map<string, { volume: number; count: number; points: number }>();
    personais.forEach((p) => map.set(p.id, { volume: 0, count: 0, points: 0 }));
    month.monthSales.forEach((s) => {
      const curr = map.get(s.personalId) || { volume: 0, count: 0, points: 0 };
      curr.volume += s.value;
      curr.count += 1;
      curr.points += s.pointsAdded;
      map.set(s.personalId, curr);
    });
    const ratePct = Math.round((settings.commissionRate || 0.1) * 100);
    const rows = [['Personal', 'Academia', 'WhatsApp', 'Cupom', 'Qtd Vendas', 'Faturamento R$', `Comissao R$ (${ratePct}%)`, 'Pontos']];
    personais.forEach((p) => {
      const stats = map.get(p.id) || { volume: 0, count: 0, points: 0 };
      rows.push([
        `"${p.name}"`,
        `"${p.gym}"`,
        `"${p.phone}"`,
        `"${p.code}"`,
        String(stats.count),
        stats.volume.toFixed(2).replace('.', ','),
        (stats.volume * (settings.commissionRate || 0.1)).toFixed(2).replace('.', ','),
        String(stats.points)
      ]);
    });
    const csv = 'data:text/csv;charset=utf-8,﻿' + rows.map((r) => r.join(';')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/\s+/g, '_');
    link.setAttribute('download', `comissoes_newfit_${monthName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.show({ kind: 'success', title: 'Planilha de comissões baixada' });
  };

  const addQuickProduct = (name: string) => setNotes((prev) => (prev ? `${prev} + ${name}` : name));

  const headerActions = (
    <>
      <IconButton
        label={soundEnabled ? 'Desativar som de venda' : 'Ativar som de venda'}
        onClick={() => setSoundEnabled((v) => !v)}
        aria-pressed={soundEnabled}
      >
        {soundEnabled ? <Volume2 className="w-[18px] h-[18px]" /> : <VolumeX className="w-[18px] h-[18px]" />}
      </IconButton>
      <IconButton label="Exportar comissões do mês (CSV)" onClick={handleExportCommissionsCSV}>
        <Download className="w-[18px] h-[18px]" />
      </IconButton>
      {onLock && (
        <IconButton label="Bloquear" onClick={onLock} className="lg:hidden">
          <Lock className="w-[18px] h-[18px]" />
        </IconButton>
      )}
    </>
  );

  if (activePersonais.length === 0) {
    return (
      <div>
        <ScreenHeader title="Balcão" actions={headerActions} />
        <EmptyState
          icon={<ShoppingBag className="w-7 h-7" />}
          title="Nenhum personal ativo"
          message="Cadastre um personal parceiro para começar a lançar vendas."
          action={
            onNavigateToPersonais && (
              <Button variant="filled" icon={<UserPlus className="w-4 h-4" />} onClick={onNavigateToPersonais}>
                Cadastrar personal
              </Button>
            )
          }
        />
      </div>
    );
  }

  const canSubmit = !!selectedPersonal && parsedValue > 0;

  return (
    <div>
      <ScreenHeader title="Balcão" subtitle="Venda indicada por personal" actions={headerActions} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 items-start">
        {/* Formulário */}
        <form onSubmit={handleSubmit} className="lg:col-span-7" aria-label="Nova venda">
          <Section title="Nova venda">
            <Group>
              <FieldRow
                label="Personal"
                htmlFor="sale-personal"
                hint={
                  selectedPersonal &&
                  [selectedPersonal.gym, `cupom ${selectedPersonal.code}`].filter(Boolean).join(' · ')
                }
              >
                <div className="relative">
                  <select
                    id="sale-personal"
                    value={personalId}
                    onChange={(e) => setPersonalId(e.target.value)}
                    className="w-full appearance-none bg-transparent type-body text-label py-2.5 pr-7 outline-none cursor-pointer [color-scheme:dark]"
                    required
                  >
                    {activePersonais.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#18181b] text-white">
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronsUpDown
                    className="w-4 h-4 text-label-3 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden
                  />
                </div>
              </FieldRow>

              <FieldRow label="Aluno" htmlFor="sale-client">
                <BareInput
                  id="sale-client"
                  placeholder="Opcional"
                  autoComplete="off"
                  autoCapitalize="words"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </FieldRow>

              <FieldRow
                label="Valor"
                htmlFor="sale-value"
                hint={
                  parsedValue > 0 ? (
                    <span>
                      Será registrado <strong className="text-label font-semibold">{formatCurrencyBRL(parsedValue)}</strong>{' '}
                      · <span className="text-tint-text font-semibold">+{calculatedPoints.toLocaleString('pt-BR')} pts</span>
                    </span>
                  ) : undefined
                }
              >
                <div className="flex items-center gap-1.5">
                  <span className="type-body text-label-2" aria-hidden>
                    R$
                  </span>
                  <BareInput
                    id="sale-value"
                    inputMode="decimal"
                    placeholder="0,00"
                    autoComplete="off"
                    value={valueStr}
                    onChange={(e) => setValueStr(e.target.value)}
                    className="tabular-nums font-semibold"
                    required
                  />
                </div>
              </FieldRow>

              <FieldRow label="Data" htmlFor="sale-date">
                <BareInput
                  id="sale-date"
                  type="datetime-local"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="tabular-nums"
                />
              </FieldRow>

              <FieldRow label="Produtos" htmlFor="sale-notes" align="start">
                <BareInput
                  id="sale-notes"
                  placeholder="Opcional"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="!pt-0"
                />
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3 -mr-4 pr-4" aria-label="Produtos rápidos">
                  {QUICK_PRODUCTS.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => addQuickProduct(name)}
                      className="pressable shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-fill/12 text-label type-footnote"
                    >
                      <Plus className="w-3 h-3 text-label-2" aria-hidden />
                      {name}
                    </button>
                  ))}
                </div>
              </FieldRow>
            </Group>
          </Section>

          <div className="-mt-3 mb-8">
            <Button type="submit" variant="filled" size="lg" fullWidth loading={isSubmitting} disabled={!canSubmit}>
              {isSubmitting ? 'Enviando…' : 'Lançar venda'}
            </Button>
            <p className="type-footnote text-label-2 text-center mt-2 px-4">
              Soma pontos no ranking, grava na planilha e avisa o personal pelo WhatsApp.
            </p>
          </div>
        </form>

        {/* Prévia da mensagem + resumo do mês */}
        <div className="lg:col-span-5 lg:sticky lg:top-8">
          {selectedPersonal && (
            <Section
              title={`Mensagem para ${selectedPersonal.firstName}`}
              footer={`Posição no mês: ${standing.rank}º · Total: ${standing.points.toLocaleString('pt-BR')} pts`}
            >
              <Group>
                <div className="p-3 bg-chat-bg">
                  <div className="ml-auto max-w-[92%] rounded-[14px] rounded-tr-[4px] px-3 py-2 bg-bubble-bg text-bubble-text shadow-[0_1px_0.5px_rgb(0_0_0/0.13)]">
                    <p className="type-subhead whitespace-pre-line break-words">{messagePreview}</p>
                    <p className="type-caption text-right opacity-60 mt-1 tabular-nums">
                      {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                {whatsappUrl && (
                  <Row
                    href={whatsappUrl}
                    leading={<MessageCircle className="w-5 h-5 text-green" aria-hidden />}
                    title={<span className="text-tint-text">Abrir no WhatsApp</span>}
                    chevron
                  />
                )}
              </Group>
            </Section>
          )}

          <Section title="Este mês">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Vendido', value: formatCurrencyBRL(month.total) },
                {
                  label: `Comissão (${Math.round((settings.commissionRate || 0.1) * 100)}%)`,
                  value: formatCurrencyBRL(month.commission)
                },
                { label: 'Vendas', value: month.count.toLocaleString('pt-BR') },
                { label: 'Ticket médio', value: formatCurrencyBRL(month.ticket) }
              ].map((stat) => (
                <div key={stat.label} className="bg-surface rounded-card p-4">
                  <p className="type-footnote text-label-2">{stat.label}</p>
                  <p className="type-title-3 tabular-nums text-label mt-1 truncate">{stat.value}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Premiação do ranking"
            footer="Exibida nos cartões do Top 5 do ranking. Campos em branco ficam ocultos."
          >
            <form onSubmit={handleSavePrizes} className="space-y-3">
              <Group>
                {(
                  [
                    { key: 'first', id: 'prize-first', label: 'Prêmio 1º Lugar', placeholder: 'Ex.: Creatina' },
                    { key: 'second', id: 'prize-second', label: 'Prêmio 2º Lugar', placeholder: 'Ex.: T-shirt' },
                    { key: 'third', id: 'prize-third', label: 'Prêmio 3º Lugar', placeholder: 'Ex.: Shaker' },
                    { key: 'fourth', id: 'prize-fourth', label: 'Prêmio 4º Lugar', placeholder: 'Ex.: Coqueteleira' },
                    { key: 'fifth', id: 'prize-fifth', label: 'Prêmio 5º Lugar', placeholder: 'Ex.: Barra proteica' }
                  ] as const
                ).map((field) => (
                  <div key={field.key} className="ios-row w-full flex pl-4">
                    <div className="ios-row-inner flex-1 min-w-0 flex items-center gap-3 pr-4 min-h-[48px]">
                      <label htmlFor={field.id} className="type-body text-label w-[128px] shrink-0">
                        {field.label}
                      </label>
                      <div className="flex-1 min-w-0">
                        <BareInput
                          id={field.id}
                          type="text"
                          value={prizeDraft[field.key] ?? ''}
                          onChange={(e) => setPrizeDraft((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </Group>
              <Button
                type="submit"
                variant="tinted"
                fullWidth
                icon={<Trophy className="w-4 h-4" />}
                disabled={!prizesChanged}
              >
                Salvar prêmios
              </Button>
            </form>
          </Section>
        </div>
      </div>

      {/* Histórico */}
      <Section
        title={`Últimas vendas${sales.length ? ` (${sales.length})` : ''}`}
        footer={sales.length > 15 ? 'Mostrando as 15 mais recentes deste aparelho.' : undefined}
      >
        <Group>
          {sales.length === 0 ? (
            <Row title={<span className="text-label-2">Nenhuma venda lançada neste aparelho.</span>} />
          ) : (
            sales.slice(0, 15).map((sale) => {
              const ok = sale.webhookStatus === 'success';
              const personal = personais.find((p) => p.id === sale.personalId);
              return (
                <Row
                  key={sale.id}
                  onClick={() => setOpenSaleId(sale.id)}
                  ariaLabel={`Venda de ${formatCurrencyBRL(sale.value)} para ${sale.personalName}, ${ok ? 'enviada' : 'não enviada'}`}
                  leading={personal ? <Avatar personal={personal} size={36} /> : undefined}
                  title={sale.personalName}
                  subtitle={`${sale.clientName} · ${formatWhen(sale.timestamp)}`}
                  trailing={
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="type-subhead font-semibold tabular-nums text-label">
                        {formatCurrencyBRL(sale.value)}
                      </span>
                      {!ok && <StatusBadge ok={false} />}
                    </span>
                  }
                  chevron
                />
              );
            })
          )}
        </Group>
      </Section>

      {/* Detalhe da venda */}
      <Sheet open={!!openSale} onClose={() => setOpenSaleId(null)} title="Venda">
        {openSale && (
          <SaleDetail
            sale={openSale}
            resending={resendingId === openSale.id}
            onResend={() => handleResend(openSale)}
            onDelete={() => setConfirmDeleteId(openSale.id)}
          />
        )}
      </Sheet>

      <ConfirmSheet
        open={!!confirmDeleteId}
        title="Excluir venda?"
        message="A venda sai do ranking deste aparelho. Na planilha do Google ela continua registrada — apague lá também."
        confirmLabel="Excluir venda"
        onConfirm={() => {
          if (confirmDeleteId) onDeleteSale(confirmDeleteId);
          setOpenSaleId(null);
          toast.show({ kind: 'info', title: 'Venda excluída deste aparelho' });
        }}
        onClose={() => setConfirmDeleteId(null)}
      />

      {isSubmitting && (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center px-6"
          style={{ backgroundColor: 'rgb(var(--scrim) / var(--scrim-alpha))' }}
          role="status"
          aria-live="assertive"
        >
          <div className="material rounded-[20px] shadow-float px-7 py-6 flex flex-col items-center text-center max-w-[290px] w-full">
            <Loader2 className="w-8 h-8 animate-spin text-tint" aria-hidden />
            <p className="type-headline text-label mt-4">Registrando venda…</p>
            <p className="type-footnote text-label-2 mt-1">
              Confirmando na planilha e enviando WhatsApp{selectedPersonal ? ` para ${selectedPersonal.firstName}` : ''}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const SaleDetail: React.FC<{
  sale: Sale;
  resending: boolean;
  onResend: () => void;
  onDelete: () => void;
}> = ({ sale, resending, onResend, onDelete }) => {
  const ok = sale.webhookStatus === 'success';
  return (
    <div className="pt-2">
      <div className="text-center pb-5">
        <p className="text-[2.25rem] leading-tight font-bold tracking-[-0.025em] tabular-nums text-label">
          {formatCurrencyBRL(sale.value)}
        </p>
        <p className="type-subhead text-tint-text font-semibold tabular-nums">
          +{sale.pointsAdded.toLocaleString('pt-BR')} pts
        </p>
      </div>

      <div>
        <Group>
          <Row title="Personal" trailing={<span className="text-label">{sale.personalName}</span>} />
          <Row title="Aluno" trailing={<span className="text-label">{sale.clientName}</span>} />
          <Row
            title="Data"
            trailing={
              <span className="text-label tabular-nums">
                {new Date(sale.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            }
          />
          <Row title="Envio" trailing={<StatusBadge ok={ok} />} />
        </Group>
      </div>

      {sale.notes && (
        <>
          <h3 className="type-footnote uppercase text-label-2 px-4 pt-6 pb-1.5">Produtos</h3>
          <div className="bg-surface rounded-card px-4 py-3 type-body text-label">{sale.notes}</div>
        </>
      )}

      {!ok && sale.webhookResponse && (
        <p className="type-footnote text-red px-4 pt-3" role="note">
          {sale.webhookResponse}
        </p>
      )}

      <div className="space-y-2 pt-6">
        <Button
          variant={ok ? 'gray' : 'filled'}
          size="lg"
          fullWidth
          loading={resending}
          icon={<RotateCw className="w-4 h-4" />}
          onClick={onResend}
        >
          {ok ? 'Reenviar mensagem' : 'Tentar enviar de novo'}
        </Button>
        <Button variant="destructive" size="lg" fullWidth icon={<Trash2 className="w-4 h-4" />} onClick={onDelete}>
          Excluir venda
        </Button>
      </div>
    </div>
  );
};
