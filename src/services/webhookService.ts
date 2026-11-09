import { Personal, Sale } from '../types';

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
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
    return {
      success: true,
      statusText: 'Simulado (Nenhum Webhook configurado nos Ajustes)',
      simulated: true
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

