# ⚡ New Fit Suplementos • Partner Ranking & Balcão do Leo

Plataforma oficial da **New Fit Suplementos** para gestão de indicações de vendas de Personais Parceiros, gamificação via **Ranking ao Vivo (Leaderboard & Modo TV)** e automação de notificações e comissões via **Webhook (n8n -> Google Sheets -> Evolution API/WhatsApp)**.

---

## 🚀 Como Iniciar

Execute no terminal:
```bash
./iniciar.sh
```
Ou manualmente:
```bash
npm run dev
```
O sistema abrirá automaticamente em: **`http://localhost:5173`**.

---

## 👥 Atores e Modos de Uso

| Ator / Modo | Acesso | Objetivo |
| :--- | :--- | :--- |
| **Leo (Proprietário/Balcão)** | Protegido por PIN (variável `VITE_ADMIN_PIN`) | Lançar vendas rápidas no balcão com seleção do personal, aluno, valor em R$ e itens comprados. Dispara o webhook n8n instantaneamente. |
| **Personal Partner** | Aberto / Link direto | Acompanhar sua posição no ranking, volume acumulado, pontuação e meta. |
| **Modo TV (Loja Física)** | Tela cheia (Tecla `Modo TV` ou `ESC`) | Exibir o ranking do mês em um telão na loja física com relógio ao vivo para estimular a competição entre personais e alunos. |

---

## 🎨 Identidade Visual (Diretrizes Estritas)
- **Dark Athletic / Apple Human Interface:** Sóbrio, moderno e esportivo.
- **Paleta de Cores:**
  - Fundo principal: `#090A0C` (Carvão/Preto fosco).
  - Superfícies/Cards: `#16171B` com bordas sutis `border-white/[0.08]`.
  - Cor de Destaque (Accent): `#F5A623` (Amarelo Âmbar clássico da New Fit).
  - Sucesso/Status: Verde esmeralda discreto (`#10B981`).
- **Tipografia:** San Francisco Apple (`-apple-system`), posições com números mono (`01`, `02`, `03`).

---

## 🔌 Arquitetura da Automação (n8n + WhatsApp)

Ao clicar em **"Lançar Venda & Disparar Fluxo"**, o frontend dispara um **HTTP POST** para o Webhook do **n8n**:

```
[Frontend New Fit] 
       │ (HTTP POST com Payload JSON)
       ▼
 [Webhook n8n]
       ├─► 1. Grava Linha no Google Sheets (Histórico e Auditoria)
       │
       └─► 2. Dispara Mensagem via Evolution API no WhatsApp do Personal
```

### Formato do Payload disparado:
```json
{
  "event": "nova_venda_personal",
  "timestamp": "2026-11-09T14:30:00.000Z",
  "sale": {
    "id": "s_1731162600000",
    "value": 675.80,
    "notes": "2x 100% Whey Dux + Creatina Creapure",
    "clientName": "Matheus Oliveira",
    "pointsAdded": 676
  },
  "personal": {
    "id": "1",
    "name": "Rodrigo Silva",
    "firstName": "Rodrigo",
    "gym": "Coliseu Gym",
    "phone": "5543998213344",
    "currentMonthPoints": 3450,
    "currentRank": 1
  },
  "whatsappMessagePreview": "Parabéns, Rodrigo! 🎉\nVenda de R$ 675,80 no seu cupom!..."
}
```

### Template de Mensagem no WhatsApp:
```text
Parabéns, {NOME}! 🎉
Venda de {VALOR} no seu cupom!

👤 Aluno: {ALUNO}
📦 Itens: {PRODUTOS}
⚡ Pontos somados: +{PONTOS} pts

📊 Ranking deste mês:
🏆 Posição: {RANKING}
🎯 Total acumulado: {TOTAL_PONTOS} pts

New Fit Suplementos 👊
```

---

## ⚙️ Configuração em Produção (Vercel)

Defina em **Vercel → Settings → Environment Variables** e faça um **Redeploy** (variáveis `VITE_` só entram no build):

| Variável | Exemplo | Uso |
| :--- | :--- | :--- |
| `VITE_N8N_WEBHOOK_URL` | `https://seu-n8n.com/webhook/newfit-vendas` | URL padrão do webhook em todo aparelho novo |
| `VITE_ADMIN_PIN` | 4 dígitos | Libera Balcão, Personais e Automação. Sem ela, nenhuma área administrativa abre. |

> O PIN fica dentro do JavaScript publicado: ele impede o acesso casual pelo link, mas não é uma proteção forte. Não reutilize uma senha importante.

O fluxo do n8n de referência está em [`n8n/newfit-workflow.json`](n8n/newfit-workflow.json). No nó Webhook, configure **Allowed Origins (CORS)** com o domínio da Vercel.

## 💾 Persistência e Limitações

- Personais (incluindo fotos), vendas e logs ficam salvos no `localStorage` **do navegador de cada aparelho**. Use sempre o mesmo aparelho/navegador para o Balcão; o ranking oficial é a aba **Ranking do Mês** da planilha.
- Limpar os dados do navegador apaga os personais cadastrados nele (as vendas continuam na planilha).
- As fotos dos personais são recortadas em quadrado e comprimidas (~320 px, ~25 KB) antes de salvar.
- Na aba **Automação & n8n**, é possível editar a URL do webhook neste aparelho, o template da mensagem e testar a conexão com um ping.
