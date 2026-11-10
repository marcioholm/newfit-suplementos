import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, 
  Percent, 
  ShoppingBag, 
  TrendingUp, 
  Send, 
  RotateCw, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare,
  Download,
  ExternalLink,
  Volume2,
  VolumeX,
  UserPlus
} from 'lucide-react';
import { Personal, Sale, AppSettings } from '../types';
import { 
  formatCurrencyBRL, 
  buildWhatsAppMessage, 
  parseBRL, 
  toLocalDateTimeInput,
  computeMonthStanding
} from '../services/webhookService';
import { playSuccessChime } from '../services/audioService';

interface LeoCounterViewProps {
  personais: Personal[];
  sales: Sale[];
  settings: AppSettings;
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
}

export const LeoCounterView: React.FC<LeoCounterViewProps> = ({
  personais,
  sales,
  settings,
  onAddSale,
  onResendWebhook,
  onDeleteSale,
  preselectedPersonalId,
  onNavigateToPersonais
}) => {
  // Apenas personais ativos
  const activePersonais = useMemo(() => personais.filter((p) => p.active), [personais]);

  // Seletor inicial: se preselectedPersonalId for de um ativo, usa; senão primeiro ativo
  const initialPersonalId = useMemo(() => {
    if (preselectedPersonalId && activePersonais.some((p) => p.id === preselectedPersonalId)) {
      return preselectedPersonalId;
    }
    return activePersonais[0]?.id || '';
  }, [preselectedPersonalId, activePersonais]);

  // Form State
  const [personalId, setPersonalId] = useState<string>(initialPersonalId);
  const [clientName, setClientName] = useState<string>('');
  const [valueStr, setValueStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>(() => toLocalDateTimeInput(new Date()));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Sincroniza personalId caso o selecionado fique inativo ou a lista mude
  useEffect(() => {
    if (!activePersonais.some((p) => p.id === personalId)) {
      setPersonalId(activePersonais[0]?.id || '');
    }
  }, [activePersonais, personalId]);

  // Selected Personal
  const selectedPersonal = useMemo(
    () => activePersonais.find((p) => p.id === personalId) || activePersonais[0] || null,
    [activePersonais, personalId]
  );

  // Numeric value helper usando parseBRL
  const parsedValue = useMemo(() => {
    return parseBRL(valueStr);
  }, [valueStr]);

  const calculatedPoints = Math.round(parsedValue);

  // Metric calculations for current month
  const currentMonthMetrics = useMemo(() => {
    const now = new Date();
    const currentMonthSales = sales.filter((s) => {
      const d = new Date(s.timestamp);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const totalFaturado = currentMonthSales.reduce((acc, curr) => acc + curr.value, 0);
    const totalComissao = totalFaturado * (settings.commissionRate || 0.10);
    const count = currentMonthSales.length;
    const ticketMedio = count > 0 ? totalFaturado / count : 0;

    return {
      totalFaturado,
      totalComissao,
      count,
      ticketMedio,
      currentMonthSales
    };
  }, [sales, settings.commissionRate]);

  // Personal's current ranking and month points (batendo com o que será enviado no payload)
  const personalMonthStats = useMemo(() => {
    if (!selectedPersonal) return { rank: 1, points: 0 };
    if (calculatedPoints <= 0) {
      const standing = computeMonthStanding(sales, personais, selectedPersonal.id, dateStr);
      return { rank: standing.rank, points: standing.monthPoints };
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
    const standing = computeMonthStanding([virtualSale, ...sales], personais, selectedPersonal.id, dateStr);
    return { rank: standing.rank, points: standing.monthPoints };
  }, [sales, personais, selectedPersonal, calculatedPoints, parsedValue, clientName, notes, dateStr]);

  // Live WhatsApp message preview
  const liveMessagePreview = useMemo(() => {
    if (!selectedPersonal) return 'Cadastre um personal parceiro para visualizar o preview da mensagem.';
    return buildWhatsAppMessage({
      template: settings.whatsappTemplate,
      personal: selectedPersonal,
      sale: {
        clientName: clientName.trim() || 'Nome do Aluno',
        value: parsedValue || 0,
        notes: notes.trim() || 'Itens comprados',
        pointsAdded: calculatedPoints || 0
      },
      currentRank: personalMonthStats.rank,
      totalPoints: personalMonthStats.points
    });
  }, [selectedPersonal, clientName, parsedValue, notes, calculatedPoints, personalMonthStats, settings.whatsappTemplate]);

  // Direct WhatsApp Link URL
  const directWhatsAppUrl = useMemo(() => {
    if (!selectedPersonal || !selectedPersonal.phone) return '';
    const phone = selectedPersonal.phone.replace(/\D/g, '');
    return `https://wa.me/${phone}?text=${encodeURIComponent(liveMessagePreview)}`;
  }, [selectedPersonal, liveMessagePreview]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonal || parsedValue <= 0) {
      alert('Por favor, selecione um personal e informe um valor de venda válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onAddSale({
        personalId: selectedPersonal.id,
        clientName: clientName.trim() || 'Cliente Balcão',
        value: parsedValue,
        notes: notes.trim() || 'Suplementos New Fit',
        timestamp: new Date(dateStr).toISOString()
      });

      if (soundEnabled && result.success) {
        playSuccessChime();
      }

      // Reset form com horário local
      setClientName('');
      setValueStr('');
      setNotes('');
      setDateStr(toLocalDateTimeInput(new Date()));

      if (result.success) {
        setSuccessToast({
          ok: true,
          text: `Venda de ${formatCurrencyBRL(parsedValue)} registrada e enviada ao n8n.`
        });
        setTimeout(() => setSuccessToast(null), 4000);
      } else {
        // Falha fica na tela até o operador fechar: o personal NÃO foi avisado
        setSuccessToast({
          ok: false,
          text: `Venda de ${formatCurrencyBRL(parsedValue)} salva neste aparelho, mas NÃO foi enviada (planilha e WhatsApp). Motivo: ${result.statusText}. Corrija e use "Reenviar" na lista abaixo.`
        });
        // No celular o aviso fica longe do botão de lançar: rola até ele
        setTimeout(() => {
          document.getElementById('sale-feedback-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
      }
    } catch (err: any) {
      alert('Erro ao registrar venda: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export Monthly Commissions to CSV
  const handleExportCommissionsCSV = () => {
    const map = new Map<string, { volume: number; count: number; points: number }>();
    personais.forEach(p => map.set(p.id, { volume: 0, count: 0, points: 0 }));

    currentMonthMetrics.currentMonthSales.forEach(s => {
      const curr = map.get(s.personalId) || { volume: 0, count: 0, points: 0 };
      curr.volume += s.value;
      curr.count += 1;
      curr.points += s.pointsAdded;
      map.set(s.personalId, curr);
    });

    const rows = [
      ['Personal', 'Academia', 'WhatsApp', 'Cupom', 'Qtd Vendas', 'Faturamento R$', 'Comissao R$ (10%)', 'Pontos']
    ];

    personais.forEach(p => {
      const stats = map.get(p.id) || { volume: 0, count: 0, points: 0 };
      const comissao = stats.volume * (settings.commissionRate || 0.10);
      rows.push([
        `"${p.name}"`,
        `"${p.gym}"`,
        `"${p.phone}"`,
        `"${p.code}"`,
        String(stats.count),
        stats.volume.toFixed(2).replace('.', ','),
        comissao.toFixed(2).replace('.', ','),
        String(stats.points)
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/\s+/g, '_');
    link.setAttribute('download', `comissoes_newfit_${monthName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick product tags
  const quickProducts = [
    '100% Whey Dux 900g',
    'Creatina Creapure 300g',
    'Pré-Treino Égide Max',
    'Iso Whey Adaptogen',
    'Pasta Dr. Peanut 600g',
    'Barra Proteína Caixa',
    'Ômega 3 Ultra Dux',
    'Beta Alanina Max 200g'
  ];

  const addQuickProduct = (pName: string) => {
    setNotes((prev) => (prev ? `${prev} + ${pName}` : pName));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8 animate-in fade-in duration-200">
      
      {/* 1. CARDS DE MÉTRICAS DO MÊS + EXPORT CSV */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
            Desempenho Geral do Mês (Balcão)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 text-zinc-400 hover:text-white bg-[#16171B] border border-white/[0.08] rounded-lg transition"
              title={soundEnabled ? 'Som ativado no lançamento' : 'Som desativado'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#F5A623]" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleExportCommissionsCSV}
              className="bg-[#16171B] hover:bg-[#202227] text-zinc-300 hover:text-white border border-white/[0.08] text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 shadow-sm"
              title="Exportar planilha de comissões do mês em CSV/Excel"
            >
              <Download className="w-3.5 h-3.5 text-[#F5A623]" />
              <span>Exportar Comissões (CSV)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Total Faturado */}
          <div className="bg-[#16171B] border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                Faturado no Mês (Indicações)
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-[#F5A623] mt-1">
                {formatCurrencyBRL(currentMonthMetrics.totalFaturado)}
              </div>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">
                Volume total somado
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/20 flex items-center justify-center text-[#F5A623]">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          {/* Comissão a Repassar (10%) */}
          <div className="bg-[#16171B] border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                Comissão a Repassar (10%)
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1">
                {formatCurrencyBRL(currentMonthMetrics.totalComissao)}
              </div>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">
                Estimativa acumulada
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Percent className="w-5 h-5" />
            </div>
          </div>

          {/* Quantidade de Compras */}
          <div className="bg-[#16171B] border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                Vendas Registradas
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
                {currentMonthMetrics.count} <span className="text-xs text-zinc-500 font-normal">pedidos</span>
              </div>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">
                Neste mês corrente
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>

          {/* Ticket Médio */}
          <div className="bg-[#16171B] border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                Ticket Médio / Compra
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-200 mt-1">
                {formatCurrencyBRL(currentMonthMetrics.ticketMedio)}
              </div>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">
                Média por indicação
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

        </div>
      </div>

      {/* TOAST FEEDBACK DE SUCESSO */}
      {successToast && successToast.ok && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-3 text-emerald-200 shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{successToast.text}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Enviado</span>
        </div>
      )}
      {successToast && !successToast.ok && (
        <div id="sale-feedback-error" role="alert" className="p-4 bg-red-950/60 border border-red-500/50 rounded-2xl flex items-start justify-between gap-3 text-red-200 shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs sm:text-sm font-semibold">{successToast.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-[11px] font-semibold text-red-300 hover:text-white px-2 py-1 rounded-lg border border-red-500/40 shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      {/* ALERTA DE ESTADO VAZIO: NENHUM PERSONAL ATIVO */}
      {activePersonais.length === 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 shadow-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#F5A623] shrink-0" />
            <span className="text-xs sm:text-sm">
              Nenhum personal ativo cadastrado. Cadastre um personal parceiro para habilitar o lançamento de vendas.
            </span>
          </div>
          {onNavigateToPersonais && (
            <button
              onClick={onNavigateToPersonais}
              className="bg-[#F5A623] hover:bg-[#e5971a] text-black text-xs font-bold px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 shadow"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Cadastrar Personal</span>
            </button>
          )}
        </div>
      )}

      {/* 2. FORMULÁRIO DE VENDA RÁPIDA + PREVIEW DE WHATSAPP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* FORMULÁRIO DO BALCÃO (ESQUERDA) */}
        <div className="lg:col-span-7 bg-[#16171B] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Lançamento Rápido de Balcão</span>
                <span className="text-[10px] font-mono uppercase bg-[#F5A623]/20 text-[#F5A623] px-2 py-0.5 rounded font-bold">
                  Leo
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Registra a venda no ranking e envia automaticamente ao n8n
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Campo 1: Selecionar Personal (Apenas Ativos) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                <span>1. Personal Partner (Cupom)</span>
                {selectedPersonal && (
                  <span className="text-[11px] text-[#F5A623] font-mono lowercase">
                    {selectedPersonal.gym} • cupom: {selectedPersonal.code}
                  </span>
                )}
              </label>

              <select
                value={personalId}
                onChange={(e) => setPersonalId(e.target.value)}
                disabled={activePersonais.length === 0}
                className="w-full bg-[#0D0E11] border border-white/[0.12] focus:border-[#F5A623] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition cursor-pointer disabled:opacity-50"
                required
              >
                {activePersonais.length === 0 ? (
                  <option value="">Nenhum personal ativo disponível</option>
                ) : (
                  activePersonais.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#16171B] text-white">
                      {p.name} — {p.gym} ({p.code})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Campo 2: Nome do Aluno */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                2. Nome do Aluno / Cliente
              </label>
              <input
                type="text"
                placeholder="Ex: Matheus Oliveira"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-[#0D0E11] border border-white/[0.12] focus:border-[#F5A623] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none transition"
                required
              />
            </div>

            {/* Grid 2 colunas: Valor e Data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Campo 3: Valor da Venda em R$ com parseBRL e confirmação visual */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    3. Valor Total (R$)
                  </label>
                  {calculatedPoints > 0 && (
                    <span className="text-[11px] font-mono text-[#F5A623] font-semibold">
                      +{calculatedPoints.toLocaleString('pt-BR')} pts
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-zinc-400">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 1.250,00"
                    value={valueStr}
                    onChange={(e) => setValueStr(e.target.value)}
                    className="w-full bg-[#0D0E11] border border-white/[0.12] focus:border-[#F5A623] rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono font-bold text-white placeholder-zinc-600 focus:outline-none transition"
                    required
                  />
                </div>
                {/* Mostra abaixo do campo o valor interpretado formatado em R$ */}
                {parsedValue > 0 && (
                  <p className="text-[11px] font-mono text-zinc-400 mt-1">
                    Será registrado: <span className="text-[#F5A623] font-semibold">{formatCurrencyBRL(parsedValue)}</span>
                  </p>
                )}
              </div>

              {/* Campo 4: Data e Hora em horário local */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  4. Data & Horário
                </label>
                <input
                  type="datetime-local"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full bg-[#0D0E11] border border-white/[0.12] focus:border-[#F5A623] rounded-xl px-3 py-2.5 text-xs font-mono text-zinc-300 focus:outline-none transition"
                />
              </div>

            </div>

            {/* Campo 5: Produtos / Observações */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                5. Produtos / Observações
              </label>
              <input
                type="text"
                placeholder="Ex: 2x 100% Whey Dux + Creatina Creapure"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#0D0E11] border border-white/[0.12] focus:border-[#F5A623] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none transition"
              />

              {/* Atalhos rápidos de suplementos */}
              <div className="pt-1.5 flex flex-wrap gap-1.5">
                <span className="text-[10px] text-zinc-500 font-mono self-center mr-1">Rápido:</span>
                {quickProducts.map((pName) => (
                  <button
                    key={pName}
                    type="button"
                    onClick={() => addQuickProduct(pName)}
                    className="text-[10px] bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-white/[0.08] px-2 py-0.5 rounded-md transition"
                  >
                    + {pName}
                  </button>
                ))}
              </div>
            </div>

            {/* BOTÃO PRINCIPAL DE AÇÃO */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting || !selectedPersonal || parsedValue <= 0}
                className="w-full py-3.5 px-4 bg-[#F5A623] hover:bg-[#e5971a] active:scale-[0.99] disabled:opacity-50 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#F5A623]/20 transition flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-black" />
                    <span>Processando e Disparando Webhook...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-black" />
                    <span>Lançar Venda & Disparar Fluxo ⚡</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-zinc-500 text-center mt-2">
                O envio alimenta o Google Sheets e notifica o WhatsApp do personal via n8n.
              </p>
            </div>

          </form>
        </div>

        {/* PREVIEW DO WHATSAPP AO VIVO (DIREITA) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-[#16171B] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Notificação WhatsApp (Preview Real)
                </h4>
              </div>
              
              {directWhatsAppUrl && (
                <a
                  href={directWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition"
                  title="Abrir diretamente no WhatsApp Web/App com a mensagem pronta"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>WhatsApp Direto</span>
                </a>
              )}
            </div>

            {/* WhatsApp Bubble Preview */}
            <div className="bg-[#0b141a] border border-[#202c33] rounded-2xl p-4 shadow-inner">
              <div className="bg-[#005c4b] text-white p-3.5 rounded-2xl rounded-tl-none text-xs leading-relaxed font-sans shadow-md whitespace-pre-line select-text border border-[#02735e]/30">
                {liveMessagePreview}
              </div>
              <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-zinc-500 font-mono">
                <span>Disparado via Evolution API / n8n</span>
                <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            <div className="p-3 bg-[#121316] rounded-xl border border-white/[0.06] space-y-1.5 text-xs text-zinc-400">
              <div className="flex justify-between">
                <span>Personal Destino:</span>
                <span className="font-semibold text-white">{selectedPersonal?.name || 'Nenhum'}</span>
              </div>
              <div className="flex justify-between">
                <span>Posição no Mês:</span>
                <span className="font-mono text-[#F5A623] font-bold">{personalMonthStats.rank}º lugar</span>
              </div>
              <div className="flex justify-between">
                <span>Total Acumulado:</span>
                <span className="font-mono text-white">
                  {personalMonthStats.points.toLocaleString('pt-BR')} pts
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 3. HISTÓRICO DE LANÇAMENTOS RECENTES */}
      <div className="space-y-4 pt-4 border-t border-white/[0.08]">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>Últimos Lançamentos de Balcão</span>
            <span className="text-xs font-mono text-zinc-500">({sales.length})</span>
          </h3>
        </div>

        <div className="bg-[#16171B] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#121316] text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Personal</th>
                  <th className="py-3 px-4">Aluno / Cliente</th>
                  <th className="py-3 px-4">Itens</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-center">Pontos</th>
                  <th className="py-3 px-4 text-center">Webhook</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-500 text-xs">
                      Nenhuma venda registrada ainda neste aparelho.
                    </td>
                  </tr>
                ) : (
                  sales.slice(0, 15).map((sale) => {
                    const saleDate = new Date(sale.timestamp);
                    const isSuccess = sale.webhookStatus === 'success';

                    return (
                      <tr key={sale.id} className="hover:bg-white/[0.02] transition">
                        
                        {/* Data / Hora */}
                        <td className="py-3 px-4 text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                          {saleDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}{' '}
                          {saleDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>

                        {/* Personal */}
                        <td className="py-3 px-4 font-semibold text-white">
                          {sale.personalName}
                        </td>

                        {/* Aluno */}
                        <td className="py-3 px-4 text-zinc-300">
                          {sale.clientName}
                        </td>

                        {/* Itens */}
                        <td className="py-3 px-4 text-zinc-400 max-w-[200px] truncate" title={sale.notes}>
                          {sale.notes}
                        </td>

                        {/* Valor */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                          {formatCurrencyBRL(sale.value)}
                        </td>

                        {/* Pontos */}
                        <td className="py-3 px-4 text-center font-mono text-[#F5A623] font-bold">
                          +{sale.pointsAdded}
                        </td>

                        {/* Status Webhook */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                              isSuccess
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-red-500/10 text-red-400 border-red-500/30'
                            }`}
                          >
                            {isSuccess ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Enviado</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3 text-red-400" />
                                <span>Falha</span>
                              </>
                            )}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onResendWebhook(sale)}
                              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-[#F5A623] transition"
                              title="Reenviar Webhook"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`A venda será removida do ranking deste aparelho. Ela continua registrada na planilha do Google — exclua lá também.`)) {
                                  onDeleteSale(sale.id);
                                }
                              }}
                              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400 transition"
                              title="Excluir Venda"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

    </div>
  );
};
