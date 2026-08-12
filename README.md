# 🎫 Vindra Code - Sistema de Tickets

Sistema completo de tickets para Discord, com painel interativo, múltiplas categorias e logs.

## ✨ Funcionalidades

- **📋 Painel Interativo** - Menu dropdown para criar tickets
- **🏷️ 6 Categorias de Ticket:**
  - 🐛 Reportar Bug
  - 💡 Sugestão
  - ❓ Dúvida Técnica
  - 🤝 Parceria
  - 💼 Vagas
  - 📝 Outro
- **📌 Sistema de Claim** - Atendente pode reclamar o ticket
- **📝 Transcrição** - Salva o histórico ao fechar
- **📊 Logs** - Canal dedicado para auditoria
- **🔐 Segurança** - Cada ticket tem cargo único
- **⚡ Modo Moderno** - Usa botões, modals e selects (discord.js v14)

## 🚀 Instalação

### 1. Pré-requisitos

- Node.js 18+ (veja `nvm` para gerenciar versões)
- npm ou yarn
- Um bot criado no [Discord Developer Portal](https://discord.com/developers/applications)

### 2. Clone e instale

```bash
cd vindra-tickets
npm install
```

### 3. Configure o ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas configurações:

```env
# Token do bot (obtenha em https://discord.com/developers/applications)
DISCORD_TOKEN=seu_token_aqui

# IDs do Discord (clique com botão direito no canal/servidor para copiar ID)
GUILD_ID=123456789012345678
CATEGORY_ID=123456789012345678      # Categoria onde tickets serão criados
TICKET_PANEL_CHANNEL=123456789012345678  # Canal para enviar o painel
LOG_CHANNEL=123456789012345678      # Canal para logs
STAFF_ROLE_ID=123456789012345678   # Cargo com permissões de staff
TICKET_SUPPORTER_ROLE_ID=123456789012345678  # Cargo de suporte
```

### 4. Configure o bot no Discord Developer Portal

1. Acesse https://discord.com/developers/applications
2. Selecione seu bot
3. Vá em **Bot** → **Privileged Gateway Intents**
4. Ative:
   - ✅ **PRESENCE INTENT**
   - ✅ **SERVER MEMBERS INTENT**
   - ✅ **MESSAGE CONTENT INTENT** (importante!)
5. Em **OAuth2** → **URL Generator**:
   - Marque `bot` e `applications.commands`
   - Nos Permissions, marque: `Administrator` ou especificamente:
     - `Manage Channels`
     - `Manage Roles`
     - `Send Messages`
     - `Attach Files`
     - `View Channels`
     - `Create Public Threads`
     - `Create Private Threads`
6. Use a URL gerada para adicionar o bot ao servidor

### 5. Ative o Developer Mode

Para copiar IDs:
1. Vá nas configurações do Discord
2. Advanced → Developer Mode → **ON**
3. Agora clique com botão direito em qualquer item para ver a opção "Copy ID"

### 6. Execute

```bash
# Desenvolvimento (com hot-reload)
npm run dev

# Produção
npm start
```

## 📖 Como Usar

### Para Usuários

1. Vá ao canal onde está o **Painel de Tickets**
2. Selecione o tipo de atendimento no menu dropdown
3. Preencha a descrição do problema
4. Seu canal de ticket será criado automaticamente!
5. Aguarde um staff atender

### Para Staff

| Comando | Descrição |
|---------|-----------|
| `!painel` | Cria o painel de tickets |
| `!fechar` | Fecha o ticket atual |
| `!info` | Mostra informações do ticket |
| `!anuncio` | Envia mensagem estilizada com cor e imagem |
| `!regras` | Envia embed de regras pronto |
| `!vagas` | Anuncia vaga de emprego |
| `!parceria` | Anuncia parceria |
| `!boasvindas` | Dá boas-vindas a um novo membro |
| `!helpembed` | Lista todos os comandos de embed |

**Comandos de Embed (apenas staff):**
- `!anuncio <titulo> | <descrição> | [cor hex] | [url imagem]`
- `!regras` — embed pronto de regras
- `!vagas <titulo> | <descrição> | [link]`
- `!parceria <nome> | <descrição> | [link]`
- `!boasvindas @user [mensagem]`
- `!portfolio <titulo> | <descrição> | <url imagem> | <url site>` — card de projeto com imagem e botão

**Dentro do Ticket:**
- **📌 Claim** - Reivindicar o ticket para atendimento
- **🔒 Fechar** - Fecha o ticket e salva transcrição

## 🔧 Personalização

### Adicionar/Remover Categorias

Edite o array `ticketTypes` em `src/index.js`:

```javascript
ticketTypes: [
  {
    id: 'novo',
    emoji: '🆕',
    name: 'Novo Tipo',
    description: 'Descrição do tipo.',
    color: 0xFF6B6B,
  },
  // ... outras categorias
]
```

### Alterar Cores

```javascript
colors: {
  primary: 0xSUA_COR_HEX,
  // ...
}
```

### Adicionar mais campos no modal

```javascript
const descInput = new TextInputBuilder()
  .setCustomId('ticket_description')
  // ...

// Adicione mais campos:
const priorityInput = new TextInputBuilder()
  .setCustomId('ticket_priority')
  .setLabel('Prioridade')
  // ...

const secondActionRow = new ActionRowBuilder().addComponents(priorityInput);
modal.addComponents(firstActionRow, secondActionRow);
```

## 📁 Estrutura de Arquivos

```
vindra-tickets/
├── src/
│   └── index.js        # Código principal do bot
├── .env.example        # Template de configuração
├── package.json         # Dependências
└── README.md            # Este arquivo
```

## 🛡️ Segurança

- Cada ticket cria um cargo temporário único
- Apenas o autor e staff podem ver o ticket
- Transcrições são salvas antes de fechar
- Logs de todas as ações

## ❓ FAQ

**Como configurar o cargo de staff?**
O cargo configurado em `STAFF_ROLE_ID` terá acesso a todos os tickets.

**Posso ter múltiplos atendentes por ticket?**
Sim! Use o botão "Adicionar" no ticket para incluir mais pessoas.

**O que acontece com tickets abertos se o bot reiniciar?**
Tickets em andamento são mantidos (em memória). Para produção, considere usar um banco de dados.

## 📝 Licença

MIT - Use, modifique e distribua livremente.

---

Feito com 💜 para Vindra Code
