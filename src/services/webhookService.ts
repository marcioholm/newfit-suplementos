import { Personal, Sale } from '../types';

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Converte input de string de valor monetário (padrão BRL ou US) para number float.
 * Aceita: "675,80" -> 675.8 | "675.80" -> 675.8 | "1.250,00" -> 1250 | "R$ 1.250,90" -> 1250.9 | "1250" -> 1250 | "1,250.90" -> 1250.9 | "" ou "abc" -> 0
 * Regra: se houver vírgula e ponto, o separador que aparece por último é o decimal.
 * Se houver só vírgula, ela é decimal.
 * Se houver só ponto com exatamente 3 dígitos depois (ex.: "1.250"), trate como milhar.
 */
export function parseBRL(input: string): number {
  if (!input) return 0;
  let clean = input.replace(/[^\d.,]/g, '').trim();
  if (!clean) return 0;

  const hasComma = clean.includes(',');
  const hasDot = clean.includes('.');

  if (hasComma && hasDot) {
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Padrão brasileiro: "1.250,90" -> remove pontos e troca vírgula por ponto
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // Padrão americano: "1,250.90" -> remove vírgulas
      clean = clean.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Apenas vírgula: "675,80" -> decimal
    const lastComma = clean.lastIndexOf(',');
    const before = clean.slice(0, lastComma).replace(/,/g, '');
    const after = clean.slice(lastComma + 1);
    clean = `${before}.${after}`;
  } else if (hasDot) {
    // Apenas ponto:
    // Se houver só ponto com exatamente 3 dígitos depois (ex.: "1.250"), trate como milhar.
    const lastDot = clean.lastIndexOf('.');
    const digitsAfterDot = clean.slice(lastDot + 1);
    if (digitsAfterDot.length === 3) {
      clean = clean.replace(/\./g, '');
    }
  }

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Formata um objeto Date para string no formato de input local "yyyy-MM-ddTHH:mm"
 */
export function toLocalDateTimeInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Calcula a posição no ranking e pontos acumulados de um personal para o mês (horário local)
 * da data de referência, considerando apenas personais ativos.
 */
export function computeMonthStanding(
  sales: Sale[],
  personais: Personal[],
  personalId: string,
  referenceDate: Date | string
): { rank: number; monthPoints: number } {
  const ref = typeof referenceDate === 'string' ? new Date(referenceDate) : referenceDate;
  const targetMonth = ref.getMonth();
  const targetYear = ref.getFullYear();

  // Apenas personais ativos
  const activePersonais = personais.filter((p) => p.active);

  const statsMap = new Map<string, { points: number; volume: number }>();
  activePersonais.forEach((p) => {
    statsMap.set(p.id, { points: 0, volume: 0 });
  });

  sales.forEach((s) => {
    if (!statsMap.has(s.personalId)) return;
    const sDate = new Date(s.timestamp);
    if (sDate.getMonth() === targetMonth && sDate.getFullYear() === targetYear) {
      const curr = statsMap.get(s.personalId)!;
      curr.points += s.pointsAdded;
      curr.volume += s.value;
    }
  });

  const sorted = activePersonais
    .map((p) => ({
      id: p.id,
      points: statsMap.get(p.id)?.points || 0,
      volume: statsMap.get(p.id)?.volume || 0
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.volume - a.volume;
    });

  const rankIndex = sorted.findIndex((item) => item.id === personalId);
  const rank = rankIndex >= 0 ? rankIndex + 1 : (activePersonais.length > 0 ? activePersonais.length : 1);
  const monthPoints = statsMap.get(personalId)?.points || 0;

  return { rank, monthPoints };
}

/**
 * Prepara a mensagem do WhatsApp substituindo as variáveis dinâmicas
 */
export function buildWhatsAppMessage({
  template,
  personal,
  sale,
  currentRank,
  totalPoints
}: {
  template: string;
  personal: Personal;
  sale: {
    clientName: string;
    value: number;
    notes: string;
    pointsAdded: number;
  };
  currentRank: number;
  totalPoints: number;
}): string {
  const formattedValue = formatCurrencyBRL(sale.value);
  const formattedRank = currentRank > 0 ? `${currentRank}º lugar` : 'Em apuração';

  return template
    .replace(/{NOME}/g, personal.firstName || personal.name.split(' ')[0])
    .replace(/{NOME_COMPLETO}/g, personal.name)
    .replace(/{VALOR}/g, formattedValue)
    .replace(/{ALUNO}/g, sale.clientName || 'Cliente Balcão')
    .replace(/{PRODUTOS}/g, sale.notes || 'Suplementos New Fit')
    .replace(/{PONTOS}/g, sale.pointsAdded.toLocaleString('pt-BR'))
    .replace(/{RANKING}/g, formattedRank)
    .replace(/{TOTAL_PONTOS}/g, totalPoints.toLocaleString('pt-BR'))
    .replace(/{ACADEMIA}/g, personal.gym || '')
    .replace(/{CUPOM}/g, personal.code || '');
}

/**
 * Cria o payload JSON oficial de acordo com a Seção 5 do Briefing Técnico
 */
export function buildWebhookPayload({
  sale,
  personal,
  currentRank,
  currentMonthPoints,
  whatsappMessagePreview
}: {
  sale: Sale;
  personal: Personal;
  currentRank: number;
  currentMonthPoints: number;
  whatsappMessagePreview: string;
}) {
  return {
    event: 'nova_venda_personal',
    timestamp: sale.timestamp || new Date().toISOString(),
    sale: {
      id: sale.id,
      value: Number(sale.value.toFixed(2)),
      notes: sale.notes,
      clientName: sale.clientName,
      pointsAdded: sale.pointsAdded
    },
    personal: {
      id: personal.id,
      name: personal.name,
      firstName: personal.firstName || personal.name.split(' ')[0],
      gym: personal.gym,
      phone: personal.phone,
      code: personal.code,
      currentMonthPoints: currentMonthPoints,
      currentRank: currentRank
    },
    whatsappMessagePreview
  };
}

/**
 * Dispara o Webhook HTTP POST para o n8n
 */
export async function sendSaleWebhook({
  webhookUrl,
  payload
}: {
  webhookUrl: string;
  payload: any;
}): Promise<{ success: boolean; statusText: string; simulated?: boolean }> {
  // Se não houver webhook configurado ou se for URL padrão não acessível externamente
  if (!webhookUrl || webhookUrl.trim() === '') {
    // Sem URL não há envio: nunca reportar como sucesso
    return {
      success: false,
      statusText: 'Webhook do n8n não configurado neste aparelho (aba Automação & n8n)'
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return {
        success: true,
        statusText: `200 OK (${response.status})`
      };
    } else {
      return {
        success: false,
        statusText: `Erro HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (err: any) {
    console.warn('Webhook dispatch error (possível CORS ou URL offline):', err);
    // Caso seja CORS bloqueado pelo n8n no navegador ou URL não alcançada localmente:
    return {
      success: false,
      statusText: `Falha de rede / CORS: ${err.message || 'Verifique a URL do n8n'}`
    };
  }
}
