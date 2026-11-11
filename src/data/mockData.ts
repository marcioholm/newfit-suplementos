import { Personal, Sale, AppSettings } from '../types';

export const DEFAULT_WHATSAPP_TEMPLATE = `Parabéns, {NOME}! 🎉
Venda de {VALOR} no seu cupom!

👤 Aluno: {ALUNO}
📦 Itens: {PRODUTOS}
⚡ Pontos somados: +{PONTOS} pts

📊 Ranking deste mês:
🏆 Posição: {RANKING}
🎯 Total acumulado: {TOTAL_PONTOS} pts

New Fit Suplementos 👊`;

export const INITIAL_SETTINGS: AppSettings = {
  commissionRate: 0.10, // 10%
  webhookUrl: import.meta.env.VITE_N8N_WEBHOOK_URL?.trim() || '',
  whatsappTemplate: DEFAULT_WHATSAPP_TEMPLATE,
  storeName: 'New Fit Suplementos',
  prizes: {
    first: '',
    second: '',
    third: ''
  }
};

export const INITIAL_PERSONAIS: Personal[] = [];

export const INITIAL_SALES: Sale[] = [];
