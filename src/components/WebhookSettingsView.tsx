import React, { useState } from 'react';
import { 
  Webhook, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  RotateCcw, 
  Code2, 
  ExternalLink,
  Layers
} from 'lucide-react';
import { AppSettings, WebhookLog } from '../types';
import { DEFAULT_WHATSAPP_TEMPLATE } from '../data/mockData';
import { sendSaleWebhook } from '../services/webhookService';

interface WebhookSettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  webhookLogs: WebhookLog[];
}

export const WebhookSettingsView: React.FC<WebhookSettingsViewProps> = ({
  settings,
  onUpdateSettings,
  webhookLogs
}) => {
  const [urlInput, setUrlInput] = useState(settings.webhookUrl);
  const [templateInput, setTemplateInput] = useState(settings.whatsappTemplate);
  const [commissionRate, setCommissionRate] = useState(String(settings.commissionRate * 100));
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [activeLogPayload, setActiveLogPayload] = useState<any | null>(null);

  const handleSave = () => {
    onUpdateSettings({
      webhookUrl: urlInput.trim(),
      whatsappTemplate: templateInput,
      commissionRate: (parseFloat(commissionRate) || 10) / 100
    });
    alert('Configurações de Webhook e Automação salvas com sucesso!');
  };

  const handleTestPing = async () => {
    setIsTesting(true);
    setTestResult(null);

    const testPayload = {
      event: 'teste_webhook_ping',
      timestamp: new Date().toISOString(),
      store: 'New Fit Suplementos',
      sale: {
        id: 's_test_' + Date.now(),
        value: 499.90,
        notes: '2x 100% Whey Dux + Creatina Creapure (TESTE)',
        clientName: 'Aluno Teste',
        pointsAdded: 500
      },
      personal: {
        id: 'test_1',
        name: 'Rodrigo Silva',
        firstName: 'Rodrigo',
        gym: 'Coliseu Gym',
        phone: '5543998213344',
        currentMonthPoints: 3450,
        currentRank: 1
      },
      whatsappMessagePreview: 'Mensagem de teste de automação New Fit Suplementos'
    };

    try {
      const res = await sendSaleWebhook({
        webhookUrl: urlInput.trim(),
        payload: testPayload
      });

      setTestResult({
        success: res.success,
        msg: res.success
          ? `Sucesso: ${res.statusText}`
          : `Aviso/Erro: ${res.statusText}`
      });
    } catch (e: any) {
      setTestResult({
        success: false,
        msg: `Falha na requisição: ${e.message}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const insertVariable = (varName: string) => {
    setTemplateInput((prev) => prev + varName);
  };

  const resetTemplate = () => {
    if (confirm('Deseja restaurar o template de mensagem para o padrão do briefing?')) {
      setTemplateInput(DEFAULT_WHATSAPP_TEMPLATE);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="border-b border-white/[0.08] pb-5">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Webhook className="w-6 h-6 text-[#F5A623]" />
          <span>Configuração da Automação (n8n & WhatsApp)</span>
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Integração HTTP POST com fluxo n8n para inserção no Google Sheets e disparo via Evolution API
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LADO ESQUERDO: CONFIGURAÇÃO DE URL & TEMPLATE */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card Webhook URL */}
          <div className="bg-[#16171B] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <span>Webhook Endpoint (n8n)</span>
              </label>
              <span className="text-[10px] font-mono text-zinc-500">HTTP POST • JSON</span>
            </div>

            <div className="space-y-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://seu-n8n.com/webhook/newfit-vendas"
                className="w-full bg-[#0D0E11] border border-white/[0.12] focus:border-[#F5A623] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none font-mono"
              />
              <p className="text-[11px] text-zinc-400">
                URL do nó de webhook do n8n que recebe o payload com a venda, dados do personal e o texto da mensagem.
              </p>
            </div>

            {/* Botões de Ação do Webhook */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestPing}
                disabled={isTesting}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold border border-white/[0.1] transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5 text-[#F5A623]" />
                <span>{isTesting ? 'Disparando Ping...' : 'Testar Conexão (Ping)'}</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 bg-[#F5A623] hover:bg-[#e5971a] text-black rounded-xl text-xs font-bold transition shadow"
              >
                Salvar Alterações
              </button>
            </div>

            {/* Feedback do Teste */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span className="font-mono">{testResult.msg}</span>
              </div>
            )}
          </div>

          {/* Card Template da Mensagem */}
          <div className="bg-[#16171B] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <label className="text-xs font-bold uppercase tracking-wider text-white">
                  Template de Mensagem (WhatsApp)
                </label>
              </div>
              <button
                onClick={resetTemplate}
                className="text-[11px] text-zinc-500 hover:text-[#F5A623] flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                Restaurar Padrão
              </button>
            </div>

            <textarea
              rows={8}
              value={templateInput}
              onChange={(e) => setTemplateInput(e.target.value)}
              className="w-full bg-[#0D0E11] border border-white/[0.12] focus:border-[#F5A623] rounded-xl p-3.5 text-xs text-zinc-200 font-mono leading-relaxed focus:outline-none select-text"
            />

            {/* Variáveis Dinâmicas Clicáveis */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-mono uppercase text-zinc-400 block font-semibold">
                Variáveis Dinâmicas (Clique para inserir):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: '{NOME}', desc: 'Primeiro nome' },
                  { tag: '{VALOR}', desc: 'Valor R$' },
                  { tag: '{ALUNO}', desc: 'Nome do Aluno' },
                  { tag: '{PRODUTOS}', desc: 'Itens' },
                  { tag: '{PONTOS}', desc: 'Pontos da venda' },
                  { tag: '{RANKING}', desc: 'Posição (Ex: 1º)' },
                  { tag: '{TOTAL_PONTOS}', desc: 'Acumulado no mês' },
                  { tag: '{CUPOM}', desc: 'Código do personal' }
                ].map((v) => (
                  <button
                    key={v.tag}
                    type="button"
                    onClick={() => insertVariable(v.tag)}
                    className="text-[11px] font-mono bg-zinc-800 hover:bg-zinc-700 text-[#F5A623] border border-white/[0.08] px-2 py-1 rounded-lg transition"
                    title={v.desc}
                  >
                    {v.tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Taxa de Comissão Padrão */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">Taxa de Comissão Estimada</span>
                <span className="text-[10px] text-zinc-500">Usada nos cálculos de repasse do balcão</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-16 bg-[#0D0E11] border border-white/[0.12] rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-white text-center focus:outline-none"
                />
                <span className="text-xs font-mono text-zinc-400">%</span>
              </div>
            </div>

          </div>

        </div>

        {/* LADO DIREITO: PREVIEW EM TEMPO REAL & ESPECIFICAÇÃO DO PAYLOAD */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card de Visualização do WhatsApp */}
          <div className="bg-[#16171B] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Simulação de Mensagem no WhatsApp</span>
            </h4>

            <div className="bg-[#0b141a] border border-[#202c33] rounded-2xl p-4 shadow-inner">
              <div className="bg-[#005c4b] text-white p-3.5 rounded-2xl rounded-tl-none text-xs leading-relaxed font-sans shadow-md whitespace-pre-line select-text border border-[#02735e]/30">
                {templateInput
                  .replace(/{NOME}/g, 'Rodrigo')
                  .replace(/{VALOR}/g, 'R$ 675,80')
                  .replace(/{ALUNO}/g, 'Matheus Oliveira')
                  .replace(/{PRODUTOS}/g, '2x 100% Whey Dux + Creatina Creapure')
                  .replace(/{PONTOS}/g, '676')
                  .replace(/{RANKING}/g, '1º lugar')
                  .replace(/{TOTAL_PONTOS}/g, '3.450')
                  .replace(/{CUPOM}/g, 'RODRIGO10')}
              </div>
              <div className="flex justify-between items-center mt-2 px-1 text-[10px] text-zinc-500 font-mono">
                <span>Evolution API</span>
                <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>

          {/* Card Arquitetura do n8n */}
          <div className="bg-[#16171B] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-3 text-xs">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-[11px]">
              <Layers className="w-4 h-4 text-[#F5A623]" />
              <span>Fluxo no n8n Recomendado</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-zinc-400 text-[11px]">
              <li><strong className="text-zinc-200">Webhook Node:</strong> Recebe o POST em modo JSON.</li>
              <li><strong className="text-zinc-200">Google Sheets Node:</strong> Salva timestamp, personal, aluno e valor.</li>
              <li><strong className="text-zinc-200">Evolution API Node:</strong> Envia <code className="text-[#F5A623]">whatsappMessagePreview</code> para o telefone <code className="text-emerald-400">personal.phone</code>.</li>
            </ol>
          </div>

        </div>

      </div>

    </div>
  );
};

