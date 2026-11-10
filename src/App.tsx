import React, { useState, useEffect } from 'react';
import { 
  Personal, 
  Sale, 
  AppSettings, 
  PeriodFilter, 
  WebhookLog 
} from './types';
import { 
  INITIAL_PERSONAIS, 
  INITIAL_SALES, 
  INITIAL_SETTINGS 
} from './data/mockData';
import { TabBar, Sidebar, TabId } from './components/Navbar';
import { useToast } from './ui/Toast';
import { MotionConfig } from 'motion/react';
import { LeaderboardView } from './components/LeaderboardView';
import { LeoCounterView } from './components/LeoCounterView';
import { PersonaisView } from './components/PersonaisView';
import { WebhookSettingsView } from './components/WebhookSettingsView';
import { TvModeView } from './components/TvModeView';
import { PinModal } from './components/PinModal';
import { PersonalPortalView } from './components/PersonalPortalView';
import { syncPersonais, personaisSyncUrl, dadosUrl, useRemoteData } from './services/syncService';
import { 
  buildWhatsAppMessage, 
  buildWebhookPayload, 
  sendSaleWebhook,
  computeMonthStanding
} from './services/webhookService';

// PIN e URL do webhook vêm das variáveis de ambiente da Vercel (ver README)
const ADMIN_PIN = (import.meta.env.VITE_ADMIN_PIN || '').trim();
const ENV_WEBHOOK_URL = (import.meta.env.VITE_N8N_WEBHOOK_URL || '').trim();
const TEST_PERSONAL_ID = 'p_teste_marcio';
const EXAMPLE_WEBHOOK_URL = 'https://n8n.webhook.newfit.com.br/webhook/venda-personal';

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Grava no localStorage avisando se o armazenamento do navegador encheu (ex.: muitas fotos). */
function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Falha ao salvar ${key} no navegador:`, e);
    alert(
      'Não foi possível salvar no navegador: o armazenamento está cheio. ' +
        'Remova fotos de personais inativos ou use fotos menores.'
    );
  }
}

// Migrações de dados salvos no navegador
if (typeof window !== 'undefined') {
  try {
    const version = localStorage.getItem('newfit_data_version');

    // v2: limpa dados de demonstração antigos
    if (version !== '2' && version !== '3') {
      localStorage.removeItem('newfit_personais');
      localStorage.removeItem('newfit_sales');
      localStorage.removeItem('newfit_webhook_logs');
    }

    // v3: remove o personal de teste, o PIN salvo e a URL de exemplo (preserva o resto)
    if (version !== '3') {
      const personais = readJSON<Personal[]>('newfit_personais', []);
      if (personais.some((p) => p.id === TEST_PERSONAL_ID)) {
        localStorage.setItem(
          'newfit_personais',
          JSON.stringify(personais.filter((p) => p.id !== TEST_PERSONAL_ID))
        );
      }

      const settings = readJSON<Record<string, unknown> | null>('newfit_settings', null);
      if (settings) {
        delete settings.pinCode;
        if (settings.webhookUrl === EXAMPLE_WEBHOOK_URL) settings.webhookUrl = '';
        localStorage.setItem('newfit_settings', JSON.stringify(settings));
      }

      localStorage.setItem('newfit_data_version', '3');
    }
  } catch (e) {
    console.error('Falha na migração de dados locais:', e);
  }
}

/** Portal dos personais: /?portal=personal&code=CUPOM */
function getPortalFromURL() {
  if (typeof window === 'undefined') return { isPortal: false, code: '' };
  const params = new URLSearchParams(window.location.search);
  const isPortal =
    params.get('portal') === 'personal' || params.get('view') === 'personal' || window.location.hash === '#/personal';
  return { isPortal, code: params.get('code') || '' };
}

export function App() {
  const [portalState, setPortalState] = useState(getPortalFromURL);

  useEffect(() => {
    const sync = () => setPortalState(getPortalFromURL());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const openPortal = (code?: string) => {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('portal', 'personal');
    if (code) url.searchParams.set('code', code);
    window.history.pushState({}, '', url.toString());
    setIsUnlocked(false);
    setPortalState({ isPortal: true, code: code || '' });
    window.scrollTo(0, 0);
  };

  const exitPortal = () => {
    window.history.pushState({}, '', window.location.pathname);
    setPortalState({ isPortal: false, code: '' });
    window.scrollTo(0, 0);
  };

  // 1. PERSISTENT STATE (LOCALSTORAGE)
  const [personais, setPersonais] = useState<Personal[]>(() =>
    readJSON<Personal[]>('newfit_personais', INITIAL_PERSONAIS)
  );

  const [sales, setSales] = useState<Sale[]>(() =>
    readJSON<Sale[]>('newfit_sales', INITIAL_SALES)
  );

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = readJSON<Partial<AppSettings>>('newfit_settings', {});
    const merged: AppSettings = { ...INITIAL_SETTINGS, ...saved };
    // Aparelho novo ou URL apagada: usa a URL configurada na Vercel
    if (!merged.webhookUrl?.trim()) merged.webhookUrl = ENV_WEBHOOK_URL;
    return merged;
  });

  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>(() =>
    readJSON<WebhookLog[]>('newfit_webhook_logs', [])
  );

  // Sync with LocalStorage
  useEffect(() => {
    writeJSON('newfit_personais', personais);
  }, [personais]);

  useEffect(() => {
    writeJSON('newfit_sales', sales);
  }, [sales]);

  useEffect(() => {
    writeJSON('newfit_settings', settings);
  }, [settings]);

  useEffect(() => {
    writeJSON('newfit_webhook_logs', webhookLogs);
  }, [webhookLogs]);

  // 2. UI NAVIGATION STATE
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('ranking');
  const [pendingTab, setPendingTab] = useState<TabId>('balcao');
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [preselectedPersonalId, setPreselectedPersonalId] = useState<string | undefined>(undefined);

  // Bloqueado, só o Ranking fica visível (vale para TV, portal e bloqueio manual)
  useEffect(() => {
    if (!isUnlocked && activeTab !== 'ranking') setActiveTab('ranking');
  }, [isUnlocked, activeTab]);

  // Atalhos do app instalado (manifest): /?tab=balcao e /?tv=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as TabId | null;
    if (params.get('tv') === '1') {
      setIsTvMode(true);
    } else if (tab && ['balcao', 'personais', 'webhook'].includes(tab)) {
      setPendingTab(tab);
      setIsPinModalOpen(true);
    }
    if (params.has('tab') || params.has('tv')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // ESC key exits TV Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTvMode) {
        setIsTvMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTvMode]);

  // Navegação com trava de PIN para áreas administrativas
  const handleNavigateToTab = (tab: TabId) => {
    if (tab !== 'ranking' && !isUnlocked) {
      setPendingTab(tab);
      setIsPinModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  // 3. ACTION: ADD SALE & DISPATCH WEBHOOK
  const handleAddSale = async (data: {
    personalId: string;
    clientName: string;
    value: number;
    notes: string;
    timestamp: string;
  }): Promise<{ success: boolean; statusText: string }> => {
    const personal = personais.find((p) => p.id === data.personalId);
    if (!personal) throw new Error('Personal não encontrado');

    const pointsAdded = Math.round(data.value);
    const saleId = 's_' + Date.now();

    const newSaleItem: Sale = {
      id: saleId,
      personalId: personal.id,
      personalName: personal.name,
      clientName: data.clientName,
      value: data.value,
      pointsAdded,
      notes: data.notes,
      timestamp: data.timestamp,
      webhookStatus: 'pending'
    };

    // Calcula posição e total do mês incluindo a nova venda
    const standing = computeMonthStanding([newSaleItem, ...sales], personais, personal.id, newSaleItem.timestamp);

    // Build WhatsApp message
    const whatsappMessagePreview = buildWhatsAppMessage({
      template: settings.whatsappTemplate,
      personal,
      sale: {
        clientName: data.clientName,
        value: data.value,
        notes: data.notes,
        pointsAdded
      },
      currentRank: standing.rank,
      totalPoints: standing.monthPoints
    });

    const payload = buildWebhookPayload({
      sale: newSaleItem,
      personal,
      currentRank: standing.rank,
      currentMonthPoints: standing.monthPoints,
      whatsappMessagePreview
    });

    // Disparar Webhook para o n8n
    const webhookResult = await sendSaleWebhook({
      webhookUrl: settings.webhookUrl,
      payload
    });

    newSaleItem.webhookStatus = webhookResult.success ? 'success' : 'failed';
    newSaleItem.webhookResponse = webhookResult.statusText;

    // Update sales list (newest first)
    setSales((prev) => [newSaleItem, ...prev]);

    // Append to logs
    setWebhookLogs((prev) => [
      {
        id: 'log_' + Date.now(),
        timestamp: new Date().toISOString(),
        saleId: newSaleItem.id,
        personalName: personal.name,
        targetUrl: settings.webhookUrl,
        status: webhookResult.success ? 'success' : 'failed',
        payload,
        responsePreview: webhookResult.statusText
      },
      ...prev.slice(0, 49) // Keep last 50 logs
    ]);

    // O n8n grava na planilha logo depois de responder: atualiza o ranking oficial em seguida
    if (webhookResult.success) window.setTimeout(remote.refresh, 4000);

    return { success: webhookResult.success, statusText: webhookResult.statusText };
  };

  // 4. ACTION: RESEND WEBHOOK
  const handleResendWebhook = async (sale: Sale) => {
    const personal = personais.find((p) => p.id === sale.personalId);
    if (!personal) return;

    // Usa a data da própria venda como referência; a venda já está na lista, não soma pontos de novo
    const standing = computeMonthStanding(sales, personais, personal.id, sale.timestamp);

    const whatsappMessagePreview = buildWhatsAppMessage({
      template: settings.whatsappTemplate,
      personal,
      sale,
      currentRank: standing.rank,
      totalPoints: standing.monthPoints
    });

    const payload = buildWebhookPayload({
      sale,
      personal,
      currentRank: standing.rank,
      currentMonthPoints: standing.monthPoints,
      whatsappMessagePreview
    });

    const res = await sendSaleWebhook({
      webhookUrl: settings.webhookUrl,
      payload
    });

    setSales((prev) =>
      prev.map((s) =>
        s.id === sale.id
          ? { ...s, webhookStatus: res.success ? 'success' : 'failed', webhookResponse: res.statusText }
          : s
      )
    );

    if (res.success) {
      toast.show({ kind: 'success', title: 'Venda reenviada', message: `${personal.firstName} será avisado pelo WhatsApp.` });
    } else {
      toast.show({ kind: 'error', title: 'Reenvio falhou', message: res.statusText });
    }
  };

  // 5. ACTION: DELETE SALE
  const handleDeleteSale = (saleId: string) => {
    setSales((prev) => prev.filter((s) => s.id !== saleId));
  };

  // Envia o cadastro para a planilha (portal e ranking de outros aparelhos)
  const pushPersonais = async (list: Personal[], { silent = true } = {}) => {
    const res = await syncPersonais(personaisSyncUrl(settings.webhookUrl), list);
    const ids = new Set(list.map((p) => p.id));
    // Falhou: marca como pendente para a planilha não sobrescrever a alteração local
    setPersonais((prev) =>
      prev.map((p) => (ids.has(p.id) ? { ...p, pendingSync: res.success ? undefined : true } : p))
    );
    if (!res.success) {
      toast.show({
        kind: 'error',
        title: 'Personal salvo só neste aparelho',
        message: `Não foi enviado ao portal. ${res.statusText}. Use "Enviar personais ao portal" em Personais.`
      });
    } else {
      if (!silent) toast.show({ kind: 'success', title: `${list.length} ${list.length === 1 ? 'personal enviado' : 'personais enviados'} ao portal` });
      window.setTimeout(remote.refresh, 4000);
    }
    return res;
  };

  // 6. ACTION: ADD PERSONAL
  const handleAddPersonal = (newPersonalData: Omit<Personal, 'id' | 'createdAt'>) => {
    const newPersonal: Personal = {
      ...newPersonalData,
      id: 'p_' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setPersonais((prev) => [...prev, newPersonal]);
    pushPersonais([newPersonal]);
  };

  // 6b. ACTION: UPDATE PERSONAL (ex.: trocar foto)
  const handleUpdatePersonal = (id: string, changes: Partial<Omit<Personal, 'id' | 'createdAt'>>) => {
    const current = personais.find((p) => p.id === id);
    setPersonais((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));
    if (current) pushPersonais([{ ...current, ...changes }]);
  };

  // 7. ACTION: TOGGLE ACTIVE
  const handleToggleActivePersonal = (id: string) => {
    const current = personais.find((p) => p.id === id);
    setPersonais((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
    if (current) pushPersonais([{ ...current, active: !current.active }]);
  };

  // Quick sale shortcut from leaderboard
  const handleSelectPersonalForSale = (pId: string) => {
    setPreselectedPersonalId(pId);
    handleNavigateToTab('balcao');
  };

  const lockAdmin = () => {
    setIsUnlocked(false);
    setActiveTab('ranking');
    toast.show({ kind: 'info', title: 'Áreas administrativas bloqueadas' });
  };

  // Dados oficiais da planilha (todas as vendas, todos os aparelhos); sem eles, usa os deste aparelho
  const remote = useRemoteData(dadosUrl(settings.webhookUrl), isTvMode ? 30000 : 60000);
  const shared = remote.data && remote.data.personais.length > 0 ? remote.data : null;
  const rankingPersonais = shared?.personais ?? personais;
  const rankingSales = shared?.sales ?? sales;
  const rankingSource = shared
    ? `Atualizado às ${new Date(shared.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} pela planilha`
    : 'Dados deste aparelho';

  // A planilha é a fonte dos personais: traz os que faltam neste aparelho e atualiza os demais.
  // O telefone só existe localmente (a planilha não o expõe); alterações pendentes não são sobrescritas.
  useEffect(() => {
    const remoteList = remote.data?.personais;
    if (!remoteList || remoteList.length === 0) return;
    setPersonais((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));
      let changed = false;
      const merged = prev.map((local) => {
        const r = remoteList.find((x) => x.id === local.id);
        if (!r || local.pendingSync) return local;
        const next: Personal = {
          ...local,
          name: r.name,
          firstName: r.firstName,
          gym: r.gym,
          code: r.code,
          active: r.active,
          avatarUrl: r.avatarUrl
        };
        if (
          next.name !== local.name ||
          next.firstName !== local.firstName ||
          next.gym !== local.gym ||
          next.code !== local.code ||
          next.active !== local.active ||
          next.avatarUrl !== local.avatarUrl
        ) {
          changed = true;
          return next;
        }
        return local;
      });
      for (const r of remoteList) {
        if (!byId.has(r.id)) {
          merged.push({ ...r, phone: '', createdAt: r.createdAt || new Date().toISOString() });
          changed = true;
        }
      }
      return changed ? merged : prev;
    });
  }, [remote.data]);

  // Nunca renderiza área protegida sem PIN, nem por um quadro
  const visibleTab: TabId = isUnlocked ? activeTab : 'ranking';

  const navProps = {
    activeTab: visibleTab,
    onSelect: handleNavigateToTab,
    isUnlocked,
    onLockClick: () => {
      if (isUnlocked) {
        lockAdmin();
      } else {
        setPendingTab(activeTab === 'ranking' ? 'balcao' : activeTab);
        setIsPinModalOpen(true);
      }
    },
    onOpenTvMode: () => {
      setIsUnlocked(false);
      setIsTvMode(true);
    }
  };

  if (portalState.isPortal) {
    return (
      <MotionConfig reducedMotion="user">
        <PersonalPortalView
          personais={shared ? shared.personais : personais}
          sales={shared ? shared.sales : sales}
          loading={!shared && personais.length === 0 && (remote.state.status === 'loading' || remote.state.status === 'idle')}
          failed={!shared && personais.length === 0 && remote.state.status === 'error'}
          onRetry={remote.refresh}
          sourceNote={rankingSource}
          initialCode={portalState.code}
          onExitPortal={exitPortal}
        />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-[100dvh] bg-bg text-label">
        <Sidebar {...navProps} />

        <main className="lg:pl-[260px] pb-[calc(env(safe-area-inset-bottom)+84px)] lg:pb-16">
          <div className="max-w-[1040px] mx-auto px-4 sm:px-6 lg:px-10">
            {visibleTab === 'ranking' && (
              <LeaderboardView
                personais={rankingPersonais}
                sales={rankingSales}
                sourceNote={rankingSource}
                period={period}
                setPeriod={setPeriod}
                onSelectPersonalForSale={handleSelectPersonalForSale}
                onNavigateToPersonais={() => handleNavigateToTab('personais')}
                onOpenTvMode={navProps.onOpenTvMode}
              />
            )}

            {visibleTab === 'balcao' && (
              <LeoCounterView
                personais={personais}
                sales={sales}
                settings={settings}
                onAddSale={handleAddSale}
                onResendWebhook={handleResendWebhook}
                onDeleteSale={handleDeleteSale}
                preselectedPersonalId={preselectedPersonalId}
                onNavigateToPersonais={() => handleNavigateToTab('personais')}
                onLock={lockAdmin}
              />
            )}

            {visibleTab === 'personais' && (
              <PersonaisView
                personais={personais}
                sales={sales}
                onAddPersonal={handleAddPersonal}
                syncedIds={remote.data ? new Set(remote.data.personais.map((p) => p.id)) : null}
                onSyncAll={() => pushPersonais(personais, { silent: false })}
                onToggleActive={handleToggleActivePersonal}
                onUpdatePersonal={handleUpdatePersonal}
                onLock={lockAdmin}
                onOpenPortal={openPortal}
              />
            )}

            {visibleTab === 'webhook' && (
              <WebhookSettingsView
                settings={settings}
                onUpdateSettings={(newVals) => setSettings((prev) => ({ ...prev, ...newVals }))}
                webhookLogs={webhookLogs}
                onLock={lockAdmin}
              />
            )}
          </div>
        </main>

        <TabBar {...navProps} />

        {isTvMode && <TvModeView personais={rankingPersonais} sales={rankingSales} onClose={() => setIsTvMode(false)} />}

        <PinModal
          correctPin={ADMIN_PIN}
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          onSuccess={() => {
            setIsUnlocked(true);
            setIsPinModalOpen(false);
            setActiveTab(pendingTab);
          }}
        />
      </div>
    </MotionConfig>
  );
}

export default App;
