import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, Lock, RotateCcw, Share, Smartphone, Zap } from 'lucide-react';
import { AppSettings, WebhookLog } from '../types';
import { DEFAULT_WHATSAPP_TEMPLATE } from '../data/mockData';
import { sendSaleWebhook } from '../services/webhookService';
import { Button, Group, IconButton, Row, ScreenHeader, Section, StatusBadge, cx } from '../ui/components';
import { Sheet } from '../ui/Sheet';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { useToast } from '../ui/Toast';
import { useInstallPrompt } from '../pwa';
import { useAppearance, Appearance } from '../appearance';
import { SegmentedControl } from '../ui/components';

interface WebhookSettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  webhookLogs: WebhookLog[];
  onLock?: () => void;
}

const VARIABLES = [
  { tag: '{NOME}', desc: 'Primeiro nome' },
  { tag: '{VALOR}', desc: 'Valor' },
  { tag: '{ALUNO}', desc: 'Aluno' },
  { tag: '{PRODUTOS}', desc: 'Itens' },
  { tag: '{PONTOS}', desc: 'Pontos da venda' },
  { tag: '{RANKING}', desc: 'Posição' },
  { tag: '{TOTAL_PONTOS}', desc: 'Total do mês' },
  { tag: '{CUPOM}', desc: 'Cupom' }
];

const SAMPLE: Record<string, string> = {
  '{NOME}': 'Rodrigo',
  '{NOME_COMPLETO}': 'Rodrigo Silva',
  '{VALOR}': 'R$ 675,80',
  '{ALUNO}': 'Matheus Oliveira',
  '{PRODUTOS}': '2x 100% Whey Dux + Creatina Creapure',
  '{PONTOS}': '676',
  '{RANKING}': '1º lugar',
  '{TOTAL_PONTOS}': '3.450',
  '{ACADEMIA}': 'Coliseu Gym',
  '{CUPOM}': 'RODRIGO10'
};

type TestState = { status: 'idle' } | { status: 'testing' } | { status: 'ok' | 'fail'; message: string };

export const WebhookSettingsView: React.FC<WebhookSettingsViewProps> = ({
  settings,
  onUpdateSettings,
  webhookLogs,
  onLock
}) => {
  const toast = useToast();
  const [url, setUrl] = useState(settings.webhookUrl);
  const [template, setTemplate] = useState(settings.whatsappTemplate);
  const [commission, setCommission] = useState(String(Math.round(settings.commissionRate * 100)));
  const [test, setTest] = useState<TestState>({ status: 'idle' });
  const [confirmReset, setConfirmReset] = useState(false);
  const [openLog, setOpenLog] = useState<WebhookLog | null>(null);
  const templateRef = useRef<HTMLTextAreaElement>(null);
  const install = useInstallPrompt();
  const [appearance, setAppearance] = useAppearance();

  const commissionRate = Math.min(50, Math.max(0, parseFloat(commission.replace(',', '.')) || 0)) / 100;
  const dirty =
    url.trim() !== settings.webhookUrl || template !== settings.whatsappTemplate || commissionRate !== settings.commissionRate;

  const preview = useMemo(
    () => Object.entries(SAMPLE).reduce((txt, [tag, val]) => txt.split(tag).join(val), template),
    [template]
  );

  const save = () => {
    onUpdateSettings({ webhookUrl: url.trim(), whatsappTemplate: template, commissionRate: commissionRate || 0.1 });
    toast.show({ kind: 'success', title: 'Ajustes salvos' });
  };

  const runTest = async () => {
    setTest({ status: 'testing' });
    const res = await sendSaleWebhook({
      webhookUrl: url.trim(),
      payload: {
        event: 'teste_webhook_ping',
        timestamp: new Date().toISOString(),
        store: 'New Fit Suplementos',
        sale: { id: 's_test_' + Date.now(), value: 499.9, notes: 'Teste de conexão', clientName: 'Aluno Teste', pointsAdded: 500 },
        personal: { id: 'test_1', name: 'Teste', firstName: 'Teste', gym: 'New Fit', phone: '', currentMonthPoints: 0, currentRank: 1 },
        whatsappMessagePreview: 'Teste de conexão'
      }
    });
    setTest({ status: res.success ? 'ok' : 'fail', message: res.statusText });
  };

  // Insere a variável onde o cursor está, não no fim do texto
  const insertVariable = (tag: string) => {
    const el = templateRef.current;
    if (!el) return setTemplate((t) => t + tag);
    const start = el.selectionStart ?? template.length;
    const end = el.selectionEnd ?? template.length;
    const next = template.slice(0, start) + tag + template.slice(end);
    setTemplate(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    });
  };

  return (
    <div className="max-w-[720px]">
      <ScreenHeader
        title="Automação"
        subtitle="n8n, planilha e WhatsApp"
        actions={
          onLock && (
            <IconButton label="Bloquear" onClick={onLock} className="lg:hidden">
              <Lock className="w-[18px] h-[18px]" />
            </IconButton>
          )
        }
      />

      <Section
        title="Webhook do n8n"
        footer={
          test.status === 'ok' && url.trim() !== settings.webhookUrl
            ? 'Conexão ok. Toque em Salvar para as vendas usarem este endereço.'
            : 'Recebe cada venda e repassa para a planilha e o WhatsApp do personal.'
        }
      >
        <Group>
          <div className="px-4">
            <label htmlFor="webhook-url" className="sr-only">
              URL do webhook
            </label>
            <textarea
              id="webhook-url"
              rows={2}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value.replace(/\s/g, ''));
                setTest({ status: 'idle' });
              }}
              placeholder="https://seu-n8n.com/webhook/newfit-vendas"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="w-full bg-transparent type-subhead text-label py-3 outline-none resize-none break-all font-[ui-monospace,SFMono-Regular,Menlo,monospace]"
            />
          </div>
          <Row
            onClick={test.status === 'testing' ? undefined : runTest}
            leading={<Zap className="w-5 h-5 text-tint-text" aria-hidden />}
            title={<span className="text-tint-text">Testar conexão</span>}
            trailing={
              test.status === 'testing' ? (
                <span className="type-subhead">Testando…</span>
              ) : test.status === 'ok' ? (
                <StatusBadge ok okLabel="Conectado" />
              ) : test.status === 'fail' ? (
                <StatusBadge ok={false} failLabel="Falhou" />
              ) : undefined
            }
          />
        </Group>
        {test.status === 'fail' && (
          <p className="type-footnote text-red px-4 pt-1.5" role="alert">
            {test.message}
          </p>
        )}
      </Section>

      <Section title="Mensagem do WhatsApp" footer="Toque numa variável para inseri-la onde está o cursor.">
        <Group>
          <div className="px-4">
            <label htmlFor="wa-template" className="sr-only">
              Modelo da mensagem
            </label>
            <textarea
              id="wa-template"
              ref={templateRef}
              rows={10}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full bg-transparent type-subhead text-label py-3 outline-none resize-y"
            />
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-1.5 border-t-[0.5px] border-separator/30">
            {VARIABLES.map((v) => (
              <button
                key={v.tag}
                type="button"
                onClick={() => insertVariable(v.tag)}
                title={v.desc}
                className="pressable h-7 px-2.5 rounded-full bg-tint/15 text-tint-text type-footnote font-semibold"
              >
                {v.desc}
              </button>
            ))}
          </div>
          <Row
            onClick={() => setConfirmReset(true)}
            leading={<RotateCcw className="w-5 h-5 text-label-2" aria-hidden />}
            title="Restaurar mensagem padrão"
          />
        </Group>
      </Section>

      <Section title="Prévia">
        <Group>
          <div className="p-3 bg-chat-bg">
            <div className="ml-auto max-w-[92%] rounded-[14px] rounded-tr-[4px] px-3 py-2 bg-bubble-bg text-bubble-text shadow-[0_1px_0.5px_rgb(0_0_0/0.13)]">
              <p className="type-subhead whitespace-pre-line break-words">{preview}</p>
            </div>
          </div>
        </Group>
      </Section>

      <Section title="Comissão" footer="Usada no resumo do balcão e na planilha de comissões.">
        <Group>
          <div className="ios-row flex items-center pl-4">
            <div className="ios-row-content flex-1 flex items-center gap-3 min-h-[44px] pr-4">
              <label htmlFor="commission" className="type-body text-label flex-1">
                Comissão do personal
              </label>
              <input
                id="commission"
                inputMode="decimal"
                value={commission}
                onChange={(e) => setCommission(e.target.value.replace(/[^\d,.]/g, ''))}
                className="w-14 bg-transparent type-body text-right tabular-nums text-label outline-none"
              />
              <span className="type-body text-label-2">%</span>
            </div>
          </div>
        </Group>
      </Section>

      <div className="mb-8">
        <Button variant="filled" size="lg" fullWidth disabled={!dirty} onClick={save}>
          {dirty ? 'Salvar alterações' : 'Tudo salvo'}
        </Button>
      </div>

      <Section title="Aparência" footer="Automático segue o modo claro ou escuro deste aparelho. O Modo TV é sempre escuro.">
        <SegmentedControl<Appearance>
          label="Aparência"
          value={appearance}
          onChange={setAppearance}
          options={[
            { value: 'auto', label: 'Automático' },
            { value: 'light', label: 'Claro' },
            { value: 'dark', label: 'Escuro' }
          ]}
        />
      </Section>

      <Section title="App" footer={installFooter(install)}>
        <Group>
          {install.installed ? (
            <Row
              leading={<CheckCircle2 className="w-5 h-5 text-green" aria-hidden />}
              title="Instalado neste aparelho"
            />
          ) : install.canPrompt ? (
            <Row
              onClick={() => install.install()}
              leading={<Download className="w-5 h-5 text-tint-text" aria-hidden />}
              title={<span className="text-tint-text">Instalar o app New Fit</span>}
            />
          ) : (
            <Row
              leading={
                install.ios ? (
                  <Share className="w-5 h-5 text-tint-text" aria-hidden />
                ) : (
                  <Smartphone className="w-5 h-5 text-tint-text" aria-hidden />
                )
              }
              title="Adicionar à Tela de Início"
              subtitle={
                install.ios
                  ? 'No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.'
                  : 'Use o menu do navegador e escolha “Instalar app”.'
              }
            />
          )}
        </Group>
      </Section>

      <Section
        title="Últimos envios"
        footer="Registro deste aparelho. Toque para ver os dados enviados."
      >
        <Group>
          {webhookLogs.length === 0 ? (
            <Row title={<span className="text-label-2">Nenhum envio ainda.</span>} />
          ) : (
            webhookLogs.slice(0, 10).map((log) => (
              <Row
                key={log.id}
                onClick={() => setOpenLog(log)}
                title={log.personalName}
                subtitle={`${new Date(log.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · ${
                  log.responsePreview || ''
                }`}
                trailing={<StatusBadge ok={log.status === 'success'} />}
                chevron
              />
            ))
          )}
        </Group>
      </Section>

      <ConfirmSheet
        open={confirmReset}
        title="Restaurar mensagem?"
        message="O texto atual será substituído pela mensagem padrão. Você ainda precisa salvar."
        confirmLabel="Restaurar padrão"
        onConfirm={() => setTemplate(DEFAULT_WHATSAPP_TEMPLATE)}
        onClose={() => setConfirmReset(false)}
      />

      <Sheet open={!!openLog} onClose={() => setOpenLog(null)} title="Envio" size="lg">
        {openLog && (
          <div className="pt-2 space-y-4">
            <Group>
              <Row title="Personal" trailing={<span className="text-label">{openLog.personalName}</span>} />
              <Row title="Status" trailing={<StatusBadge ok={openLog.status === 'success'} />} />
              <Row
                title="Resposta"
                trailing={<span className={cx('type-footnote max-w-[60vw] sm:max-w-[320px] truncate')}>{openLog.responsePreview}</span>}
              />
            </Group>
            <pre className="bg-surface rounded-card p-4 type-caption text-label overflow-x-auto font-[ui-monospace,SFMono-Regular,Menlo,monospace]">
              {JSON.stringify(openLog.payload, null, 2)}
            </pre>
          </div>
        )}
      </Sheet>
    </div>
  );
};

function installFooter(install: ReturnType<typeof useInstallPrompt>) {
  if (install.installed) return 'Abre em tela cheia, como um app, direto da tela de início.';
  return 'Instalado, o New Fit abre em tela cheia e fica a um toque na tela de início.';
}
