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
| **Leo (Proprietário/Balcão)** | Protegido por PIN (`1234`) | Lançar vendas rápidas no balcão com seleção do personal, aluno, valor em R$ e itens comprados. Dispara o webhook n8n instantaneamente. |
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

## ⚙️ Configurações & Persistência
- Todas as vendas, personais cadastrados e logs de webhook são persistidos automaticamente no `localStorage`.
- Na aba **Automação & n8n**, você pode alterar a URL do Webhook, editar o template da mensagem com tags dinâmicas e testar a conexão com um botão de ping.
- PIN padrão de desbloqueio do Balcão: **`1234`**.
