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
  pinCode: '1234',
  commissionRate: 0.10, // 10%
  webhookUrl: '',
  whatsappTemplate: DEFAULT_WHATSAPP_TEMPLATE,
  storeName: 'New Fit Suplementos'
};

export const INITIAL_PERSONAIS: Personal[] = [
  {
    id: 'p_teste_marcio',
    name: 'Marcio Holm',
    firstName: 'Marcio',
    gym: 'Teste NorthWay',
    phone: '5542999896358',
    code: 'MARCIO10',
    active: true,
    createdAt: '2026-11-09T00:00:00.000Z'
  }
];

export const INITIAL_SALES: Sale[] = [];
