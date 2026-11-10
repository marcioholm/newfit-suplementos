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
import { Navbar } from './components/Navbar';
import { LeaderboardView } from './components/LeaderboardView';
import { LeoCounterView } from './components/LeoCounterView';
import { PersonaisView } from './components/PersonaisView';
import { WebhookSettingsView } from './components/WebhookSettingsView';
import { TvModeView } from './components/TvModeView';
import { PinModal } from './components/PinModal';
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

export function App() {
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
  const [activeTab, setActiveTab] = useState<'ranking' | 'balcao' | 'personais' | 'webhook'>('ranking');
  const [pendingTab, setPendingTab] = useState<'ranking' | 'balcao' | 'personais' | 'webhook'>('balcao');
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [preselectedPersonalId, setPreselectedPersonalId] = useState<string | undefined>(undefined);

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
  const handleNavigateToTab = (tab: 'ranking' | 'balcao' | 'personais' | 'webhook') => {
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

    alert(`Reenvio de webhook: ${res.statusText}`);
  };

  // 5. ACTION: DELETE SALE
  const handleDeleteSale = (saleId: string) => {
    setSales((prev) => prev.filter((s) => s.id !== saleId));
  };

  // 6. ACTION: ADD PERSONAL
  const handleAddPersonal = (newPersonalData: Omit<Personal, 'id' | 'createdAt'>) => {
    const newPersonal: Personal = {
      ...newPersonalData,
      id: 'p_' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setPersonais((prev) => [...prev, newPersonal]);
  };

  // 6b. ACTION: UPDATE PERSONAL (ex.: trocar foto)
  const handleUpdatePersonal = (id: string, changes: Partial<Omit<Personal, 'id' | 'createdAt'>>) => {
    setPersonais((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  };

  // 7. ACTION: TOGGLE ACTIVE
  const handleToggleActivePersonal = (id: string) => {
    setPersonais((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
  };

  // Quick sale shortcut from leaderboard
  const handleSelectPersonalForSale = (pId: string) => {
    setPreselectedPersonalId(pId);
    handleNavigateToTab('balcao');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090A0C] text-zinc-100 antialiased selection:bg-[#F5A623] selection:text-black">
      
      {/* NAVBAR PRINCIPAL */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleNavigateToTab}
        onOpenTvMode={() => {
          setIsUnlocked(false);
          setIsTvMode(true);
        }}
        isUnlocked={isUnlocked}
        onLockClick={() => {
          if (isUnlocked) {
            setIsUnlocked(false);
          } else {
            setPendingTab(activeTab === 'ranking' ? 'balcao' : activeTab);
            setIsPinModalOpen(true);
          }
        }}
        currentMonthSalesTotal={sales.length}
      />

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 pb-12">
        {activeTab === 'ranking' && (
          <LeaderboardView
            personais={personais}
            sales={sales}
            period={period}
            setPeriod={setPeriod}
            onSelectPersonalForSale={handleSelectPersonalForSale}
            onNavigateToPersonais={() => handleNavigateToTab('personais')}
          />
        )}

        {activeTab === 'balcao' && (
          <LeoCounterView
            personais={personais}
            sales={sales}
            settings={settings}
            onAddSale={handleAddSale}
            onResendWebhook={handleResendWebhook}
            onDeleteSale={handleDeleteSale}
            preselectedPersonalId={preselectedPersonalId}
            onNavigateToPersonais={() => handleNavigateToTab('personais')}
          />
        )}

        {activeTab === 'personais' && (
          <PersonaisView
            personais={personais}
            sales={sales}
            onAddPersonal={handleAddPersonal}
            onToggleActive={handleToggleActivePersonal}
            onUpdatePersonal={handleUpdatePersonal}
          />
        )}

        {activeTab === 'webhook' && (
          <WebhookSettingsView
            settings={settings}
            onUpdateSettings={(newVals) => setSettings((prev) => ({ ...prev, ...newVals }))}
            webhookLogs={webhookLogs}
          />
        )}
      </main>

      {/* MODAL MODO TV (TELA CHEIA) */}
      {isTvMode && (
        <TvModeView
          personais={personais}
          sales={sales}
          onClose={() => setIsTvMode(false)}
        />
      )}

      {/* MODAL PIN DO LEO */}
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
  );
}

export default App;
