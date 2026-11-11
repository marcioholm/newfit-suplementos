export type PeriodFilter = '7d' | 'month' | 'all';

export interface Personal {
  id: string;
  name: string;
  firstName: string;
  gym: string;
  phone: string; // E.g. "5543998213344"
  code: string;  // E.g. "RODRIGO10"
  avatarUrl?: string;
  active: boolean;
  createdAt: string;
  /** Alteração local que ainda não chegou à planilha (não é sobrescrita por ela) */
  pendingSync?: boolean;
}

export interface Sale {
  id: string;
  personalId: string;
  personalName: string;
  clientName: string;
  value: number; // Em R$ (Ex: 675.80)
  pointsAdded: number; // Pontos (Ex: 676)
  notes: string; // Ex: "2x 100% Whey Dux + Creatina Creapure"
  timestamp: string; // ISO string
  webhookStatus: 'success' | 'failed' | 'pending' | 'simulated';
  webhookResponse?: string;
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  saleId: string;
  personalName: string;
  targetUrl: string;
  status: 'success' | 'failed' | 'simulated';
  payload: any;
  responsePreview?: string;
}

export interface LeaderboardEntry {
  rank: number;
  personal: Personal;
  salesCount: number;
  totalVolume: number;
  points: number;
}

export interface PodiumPrizes {
  first: string;
  second: string;
  third: string;
  fourth?: string;
  fifth?: string;
}

export interface AppSettings {
  commissionRate: number; // 0.10 para 10%
  webhookUrl: string; // URL do n8n
  whatsappTemplate: string;
  storeName: string;
  prizes?: PodiumPrizes;
}
