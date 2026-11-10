/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL de produção do webhook do n8n (ex.: https://seu-n8n.com/webhook/newfit-vendas) */
  readonly VITE_N8N_WEBHOOK_URL?: string;
  /** PIN de 4 dígitos que libera Balcão, Personais e Automação */
  readonly VITE_ADMIN_PIN?: string;
  /** Opcional: endereço do fluxo que grava personais (padrão: derivado do webhook de vendas) */
  readonly VITE_N8N_PERSONAIS_URL?: string;
  /** Opcional: endereço do fluxo de dados públicos (padrão: derivado do webhook de vendas) */
  readonly VITE_N8N_DADOS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
