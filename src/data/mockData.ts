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
  webhookUrl: 'https://n8n.webhook.newfit.com.br/webhook/venda-personal',
  whatsappTemplate: DEFAULT_WHATSAPP_TEMPLATE,
  storeName: 'New Fit Suplementos'
};

export const INITIAL_PERSONAIS: Personal[] = [
  {
    id: '1',
    name: 'Rodrigo Silva',
    firstName: 'Rodrigo',
    gym: 'Coliseu Gym',
    phone: '5543998213344',
    code: 'RODRIGO10',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    active: true,
    createdAt: '2026-01-10T10:00:00.000Z'
  },
  {
    id: '2',
    name: 'Amanda Carvalho',
    firstName: 'Amanda',
    gym: 'Ironberg Studio',
    phone: '5543997125588',
    code: 'AMANDA10',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    active: true,
    createdAt: '2026-01-12T14:30:00.000Z'
  },
  {
    id: '3',
    name: 'Lucas Ferreira',
    firstName: 'Lucas',
    gym: 'Studio Prime',
    phone: '5543991238844',
    code: 'LUCAS10',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    active: true,
    createdAt: '2026-01-15T09:15:00.000Z'
  },
  {
    id: '4',
    name: 'Camila Nogueira',
    firstName: 'Camila',
    gym: 'Smart Fit Centro',
    phone: '5543996541122',
    code: 'CAMILA10',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    active: true,
    createdAt: '2026-02-01T11:20:00.000Z'
  },
  {
    id: '5',
    name: 'Bruno Castro',
    firstName: 'Bruno',
    gym: 'Coliseu Gym',
    phone: '5543998877665',
    code: 'BRUNO10',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    active: true,
    createdAt: '2026-02-10T16:00:00.000Z'
  },
  {
    id: '6',
    name: 'Diego Martins',
    firstName: 'Diego',
    gym: 'BioTech Training',
    phone: '5543991122334',
    code: 'DIEGO10',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
    active: true,
    createdAt: '2026-02-18T08:45:00.000Z'
  },
  {
    id: '7',
    name: 'Felipe Albuquerque',
    firstName: 'Felipe',
    gym: 'Vibe Fitness Club',
    phone: '5543994455667',
    code: 'FELIPE10',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80',
    active: true,
    createdAt: '2026-03-01T13:10:00.000Z'
  }
];

export const INITIAL_SALES: Sale[] = [
  {
    id: 's_101',
    personalId: '1',
    personalName: 'Rodrigo Silva',
    clientName: 'Matheus Oliveira',
    value: 675.80,
    pointsAdded: 676,
    notes: '2x 100% Whey Dux + Creatina Creapure',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min atrás
    webhookStatus: 'success',
    webhookResponse: '200 OK (Sheets + Evolution API)'
  },
  {
    id: 's_102',
    personalId: '2',
    personalName: 'Amanda Carvalho',
    clientName: 'Juliana Costa',
    value: 540.00,
    pointsAdded: 540,
    notes: 'Iso Whey Max Titanium + Glutamina 300g',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 horas atrás
    webhookStatus: 'success',
    webhookResponse: '200 OK (Sheets + Evolution API)'
  },
  {
    id: 's_103',
    personalId: '1',
    personalName: 'Rodrigo Silva',
    clientName: 'Eduardo Santos',
    value: 489.90,
    pointsAdded: 490,
    notes: 'Pré-Treino Égide + Pasta Dr. Peanut 600g',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // Ontem
    webhookStatus: 'success',
    webhookResponse: '200 OK'
  },
  {
    id: 's_104',
    personalId: '3',
    personalName: 'Lucas Ferreira',
    clientName: 'Renato Silveira',
    value: 820.50,
    pointsAdded: 821,
    notes: 'Whey Isolado Adaptogen + Creatina Creapure 500g',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    webhookStatus: 'success'
  },
  {
    id: 's_105',
    personalId: '2',
    personalName: 'Amanda Carvalho',
    clientName: 'Patricia Mendes',
    value: 399.00,
    pointsAdded: 399,
    notes: 'Colágeno Verisol + Ômega 3 Ultra Dux',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    webhookStatus: 'success'
  },
  {
    id: 's_106',
    personalId: '4',
    personalName: 'Camila Nogueira',
    clientName: 'Larissa Lima',
    value: 310.00,
    pointsAdded: 310,
    notes: 'Whey Concentrado 900g + Barra de Proteína Caixa',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 60).toISOString(),
    webhookStatus: 'success'
  },
  {
    id: 's_107',
    personalId: '5',
    personalName: 'Bruno Castro',
    clientName: 'Vinicius Rocha',
    value: 450.00,
    pointsAdded: 450,
    notes: 'Creatina Creapure + Beta Alanina Max',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    webhookStatus: 'success'
  },
  {
    id: 's_108',
    personalId: '1',
    personalName: 'Rodrigo Silva',
    clientName: 'Gabriel Pires',
    value: 620.00,
    pointsAdded: 620,
    notes: 'Kit Massa Magra (Whey + Creatina + BCAA)',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    webhookStatus: 'success'
  }
];

