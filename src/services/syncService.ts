import { useCallback, useEffect, useRef, useState } from 'react';
import { Personal, PodiumPrizes, Sale } from '../types';

/**
 * Sincronização com a planilha via n8n.
 *
 * - POST /newfit-personais: envia cadastros de personais (um ou em lote).
 * - GET  /newfit-dados: devolve personais e vendas públicos (sem telefones e sem nomes de alunos),
 *   usados no portal do personal, no Ranking e no Modo TV de qualquer aparelho.
 *
 * Por padrão os endereços são derivados da URL do webhook de vendas
 * (…/webhook/newfit-vendas → …/webhook/newfit-personais e …/webhook/newfit-dados).
 */

const ENV_SALES = (import.meta.env.VITE_N8N_WEBHOOK_URL || '').trim();
const ENV_PERSONAIS = (import.meta.env.VITE_N8N_PERSONAIS_URL || '').trim();
const ENV_DADOS = (import.meta.env.VITE_N8N_DADOS_URL || '').trim();

function derive(salesUrl: string, path: string): string {
  const base = (salesUrl || ENV_SALES).trim();
  if (!base) return '';
  try {
    const url = new URL(base);
    url.pathname = url.pathname.replace(/\/[^/]+\/?$/, `/${path}`);
    url.search = '';
    return url.toString();
  } catch {
    return '';
  }
}

export const personaisSyncUrl = (salesUrl: string) => ENV_PERSONAIS || derive(salesUrl, 'newfit-personais');
export const dadosUrl = (salesUrl: string) => ENV_DADOS || derive(salesUrl, 'newfit-dados');

/** Só os campos que a planilha precisa; foto grande demais não vai (limite de célula). */
function toPayload(p: Personal) {
  return {
    id: p.id,
    name: p.name,
    firstName: p.firstName,
    gym: p.gym,
    // Sem telefone neste aparelho (veio da planilha): não envia, para não apagar o que está lá
    phone: p.phone || undefined,
    code: p.code,
    active: p.active,
    avatarUrl: p.avatarUrl && p.avatarUrl.length < 45000 ? p.avatarUrl : ''
  };
}

export async function syncPersonais(
  url: string,
  personais: Personal[]
): Promise<{ success: boolean; statusText: string }> {
  if (!url) return { success: false, statusText: 'Webhook do n8n não configurado' };
  if (personais.length === 0) return { success: true, statusText: 'Nada para enviar' };
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'personais_sync', personais: personais.map(toPayload) }),
      signal: controller.signal
    });
    clearTimeout(t);
    return res.ok
      ? { success: true, statusText: `${res.status} OK` }
      : { success: false, statusText: `Erro HTTP ${res.status}` };
  } catch (e: any) {
    return { success: false, statusText: `Falha de rede / CORS: ${e?.message || 'sem resposta'}` };
  }
}

export async function deletePersonalSync(
  url: string,
  personalId: string
): Promise<{ success: boolean; statusText: string }> {
  if (!url) return { success: false, statusText: 'Webhook do n8n não configurado' };
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'personal_delete', id: personalId }),
      signal: controller.signal
    });
    clearTimeout(t);
    return res.ok
      ? { success: true, statusText: `${res.status} OK` }
      : { success: false, statusText: `Erro HTTP ${res.status}` };
  } catch (e: any) {
    return { success: false, statusText: `Falha de rede / CORS: ${e?.message || 'sem resposta'}` };
  }
}

export async function syncPrizes(
  url: string,
  prizes: PodiumPrizes
): Promise<{ success: boolean; statusText: string }> {
  return syncSettings(url, { prizes });
}

export interface SyncedSettingsPayload {
  prizes?: PodiumPrizes;
  whatsappTemplate?: string;
  commissionRate?: number;
  storeName?: string;
}

export async function syncSettings(
  url: string,
  settings: SyncedSettingsPayload
): Promise<{ success: boolean; statusText: string }> {
  if (!url) return { success: false, statusText: 'Webhook do n8n não configurado' };
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'settings_sync', ...settings }),
      signal: controller.signal
    });
    clearTimeout(t);
    return res.ok
      ? { success: true, statusText: `${res.status} OK` }
      : { success: false, statusText: `Erro HTTP ${res.status}` };
  } catch (e: any) {
    return { success: false, statusText: `Falha de rede / CORS: ${e?.message || 'sem resposta'}` };
  }
}

export interface PublicData {
  personais: Personal[];
  sales: Sale[];
  prizes?: PodiumPrizes;
  settings?: Omit<SyncedSettingsPayload, 'prizes'>;
  updatedAt: string;
}

function parsePublicData(json: any): PublicData {
  const personais: Personal[] = (Array.isArray(json?.personais) ? json.personais : [])
    .filter((p: any) => p && p.id && p.name)
    .map((p: any) => ({
      id: String(p.id),
      name: String(p.name),
      firstName: String(p.firstName || String(p.name).split(' ')[0]),
      gym: String(p.gym || ''),
      phone: '',
      code: String(p.code || ''),
      avatarUrl: typeof p.avatarUrl === 'string' && p.avatarUrl.startsWith('data:image/') ? p.avatarUrl : undefined,
      active: p.active !== false,
      createdAt: ''
    }));
  const sales: Sale[] = (Array.isArray(json?.sales) ? json.sales : [])
    .filter((s: any) => s && s.id && s.personalId && s.timestamp)
    .map((s: any) => ({
      id: String(s.id),
      personalId: String(s.personalId),
      personalName: String(s.personalName || ''),
      clientName: '',
      value: Number(s.value) || 0,
      pointsAdded: Math.round(Number(s.pointsAdded) || 0),
      notes: String(s.notes || ''),
      timestamp: String(s.timestamp),
      webhookStatus: 'success' as const
    }));
  const rawPrizes = json?.prizes ?? json?.settings?.prizes;
  const hasRemotePrizes =
    (rawPrizes && typeof rawPrizes === 'object') ||
    json?.premio1 !== undefined ||
    json?.premio2 !== undefined ||
    json?.premio3 !== undefined ||
    json?.premio4 !== undefined ||
    json?.premio5 !== undefined;
  const prizes: PodiumPrizes | undefined = hasRemotePrizes
    ? {
        first: String(rawPrizes?.first ?? rawPrizes?.firstPlace ?? json?.premio1 ?? '').trim(),
        second: String(rawPrizes?.second ?? rawPrizes?.secondPlace ?? json?.premio2 ?? '').trim(),
        third: String(rawPrizes?.third ?? rawPrizes?.thirdPlace ?? json?.premio3 ?? '').trim(),
        fourth: String(rawPrizes?.fourth ?? rawPrizes?.fourthPlace ?? json?.premio4 ?? '').trim(),
        fifth: String(rawPrizes?.fifth ?? rawPrizes?.fifthPlace ?? json?.premio5 ?? '').trim()
      }
    : undefined;

  const rawSettings = json?.settings;
  const rawTemplate = rawSettings?.whatsappTemplate ?? json?.whatsappTemplate;
  const rawCommission = rawSettings?.commissionRate ?? json?.commissionRate;
  const rawStoreName = rawSettings?.storeName ?? json?.storeName;
  const hasRemoteSettings =
    rawTemplate !== undefined || rawCommission !== undefined || rawStoreName !== undefined;
  const settings: PublicData['settings'] = hasRemoteSettings
    ? {
        whatsappTemplate: typeof rawTemplate === 'string' && rawTemplate ? rawTemplate : undefined,
        commissionRate:
          typeof rawCommission === 'number' && !Number.isNaN(rawCommission)
            ? rawCommission
            : typeof rawCommission === 'string' && rawCommission.trim() !== '' && !Number.isNaN(Number(rawCommission))
            ? Number(rawCommission)
            : undefined,
        storeName: typeof rawStoreName === 'string' && rawStoreName.trim() ? rawStoreName.trim() : undefined
      }
    : undefined;

  return {
    personais,
    sales,
    prizes,
    settings,
    updatedAt: String(json?.updatedAt || new Date().toISOString())
  };
}

export type RemoteState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; data: PublicData }
  | { status: 'error'; message: string; data?: PublicData };

/**
 * Busca os dados públicos e atualiza de tempos em tempos (e ao voltar para a aba).
 * Não pré-carrega cache antigo de localStorage para nunca exibir dado desatualizado ao cliente em caso de falha.
 */
export function useRemoteData(url: string, intervalMs = 60000) {
  const [state, setState] = useState<RemoteState>(() => ({
    status: url ? 'loading' : 'idle'
  }));
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!url || inFlight.current) return;
    inFlight.current = true;
    setState((prev) => (prev.status === 'error' && !prev.data ? { status: 'loading' } : prev));
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal
      });
      if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
      const json = await res.json();
      const data = parsePublicData(json);
      setState({ status: 'ready', data });
    } catch (e: any) {
      const msg = e?.name === 'AbortError' ? 'Tempo esgotado ao carregar dados' : e?.message || 'Falha ao carregar';
      setState((prev) => ({
        status: 'error',
        message: msg,
        data: prev.status === 'ready' || prev.status === 'error' ? prev.data : undefined
      }));
    } finally {
      window.clearTimeout(timeoutId);
      inFlight.current = false;
    }
  }, [url]);

  useEffect(() => {
    if (!url) {
      setState({ status: 'idle' });
      return;
    }
    setState({ status: 'loading' });
    refresh();
    const timer = window.setInterval(refresh, intervalMs);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [url, intervalMs, refresh]);

  const data = state.status === 'ready' ? state.data : state.status === 'error' ? state.data : undefined;
  return { state, data, refresh };
}
