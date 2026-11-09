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
  sendSaleWebhook 
} from './services/webhookService';

export function App() {
  // 1. PERSISTENT STATE (LOCALSTORAGE)
  const [personais, setPersonais] = useState<Personal[]>(() => {
    const saved = localStorage.getItem('newfit_personais');
    return saved ? JSON.parse(saved) : INITIAL_PERSONAIS;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('newfit_sales');
    return saved ? JSON.parse(saved) : INITIAL_SALES;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('newfit_settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>(() => {
    const saved = localStorage.getItem('newfit_webhook_logs');
    return saved ? JSON.parse(saved) : [];
  });

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem('newfit_personais', JSON.stringify(personais));
  }, [personais]);

  useEffect(() => {
    localStorage.setItem('newfit_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('newfit_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('newfit_webhook_logs', JSON.stringify(webhookLogs));
  }, [webhookLogs]);

  // 2. UI NAVIGATION STATE
  const [activeTab, setActiveTab] = useState<'ranking' | 'balcao' | 'personais' | 'webhook'>('ranking');
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

  // 3. ACTION: ADD SALE & DISPATCH WEBHOOK
  const handleAddSale = async (data: {
    personalId: string;
    clientName: string;
    value: number;
    notes: string;
    timestamp: string;
  }) => {
    const personal = personais.find((p) => p.id === data.personalId);
    if (!personal) throw new Error('Personal não encontrado');

    const pointsAdded = Math.round(data.value);
    const saleId = 's_' + Date.now();

    // Compute updated month points and ranking
    const now = new Date();
    const currentMonthSales = sales.filter((s) => {
      const d = new Date(s.timestamp);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const pointsMap = new Map<string, number>();
    personais.forEach((p) => pointsMap.set(p.id, 0));
    currentMonthSales.forEach((s) => {
      pointsMap.set(s.personalId, (pointsMap.get(s.personalId) || 0) + s.pointsAdded);
    });

    // Add new points
    const newTotalPoints = (pointsMap.get(personal.id) || 0) + pointsAdded;
    pointsMap.set(personal.id, newTotalPoints);

    // Sort to get ranking
    const sorted = Array.from(pointsMap.entries()).sort((a, b) => b[1] - a[1]);
    const currentRank = sorted.findIndex(([id]) => id === personal.id) + 1;

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
      currentRank,
      totalPoints: newTotalPoints
    });

    // Build official webhook payload
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

    const payload = buildWebhookPayload({
      sale: newSaleItem,
      personal,
      currentRank,
      currentMonthPoints: newTotalPoints,
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
  };

  // 4. ACTION: RESEND WEBHOOK
  const handleResendWebhook = async (sale: Sale) => {
    const personal = personais.find((p) => p.id === sale.personalId);
    if (!personal) return;

    const payload = buildWebhookPayload({
      sale,
      personal,
      currentRank: 1,
      currentMonthPoints: sale.pointsAdded,
      whatsappMessagePreview: buildWhatsAppMessage({
        template: settings.whatsappTemplate,
        personal,
        sale,
        currentRank: 1,
        totalPoints: sale.pointsAdded
      })
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

  // 7. ACTION: TOGGLE ACTIVE
  const handleToggleActivePersonal = (id: string) => {
    setPersonais((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
  };

  // Quick sale shortcut from leaderboard
  const handleSelectPersonalForSale = (pId: string) => {
    setPreselectedPersonalId(pId);
    setActiveTab('balcao');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090A0C] text-zinc-100 antialiased selection:bg-[#F5A623] selection:text-black">
      
      {/* NAVBAR PRINCIPAL */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'balcao' && !isUnlocked) {
            setIsPinModalOpen(true);
            return;
          }
          setActiveTab(tab);
        }}
        onOpenTvMode={() => setIsTvMode(true)}
        isUnlocked={isUnlocked}
        onLockClick={() => {
          if (isUnlocked) {
            setIsUnlocked(false);
          } else {
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
          />
        )}

        {activeTab === 'personais' && (
          <PersonaisView
            personais={personais}
            sales={sales}
            onAddPersonal={handleAddPersonal}
            onToggleActive={handleToggleActivePersonal}
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
        correctPin={settings.pinCode || '1234'}
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => {
          setIsUnlocked(true);
          setIsPinModalOpen(false);
          setActiveTab('balcao');
        }}
      />

    </div>
  );
}

export default App;
