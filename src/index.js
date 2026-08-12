// ============================================
// VINDRA CODE - SISTEMA DE TICKETS + EMBEDS
// Bot completo com painel de tickets, categorias, logs
// e painel interativo de mensagens estilizadas
// ============================================

import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';

// ============================================
// CONFIGURAÇÃO
// ============================================

const CONFIG = {
  GUILD_ID: process.env.GUILD_ID,
  CATEGORY_ID: process.env.CATEGORY_ID,
  TICKET_PANEL_CHANNEL: process.env.TICKET_PANEL_CHANNEL,
  LOG_CHANNEL: process.env.LOG_CHANNEL,
  STAFF_ROLE_ID: process.env.STAFF_ROLE_ID,
  TICKET_SUPPORTER_ROLE_ID: process.env.TICKET_SUPPORTER_ROLE_ID,
  WELCOME_CHANNEL: process.env.WELCOME_CHANNEL,

  colors: {
    primary: 0x6C5CE7,
    success: 0x00B894,
    danger: 0xE74C3C,
    warning: 0xFDCB6E,
    info: 0x0984E3,
  },

  // Cores pré-definidas para escolha rápida nos painéis
  colorPresets: [
    { id: 'primary', name: '🟣 Roxo Vindra', hex: '6C5CE7' },
    { id: 'success', name: '🟢 Verde', hex: '00B894' },
    { id: 'info', name: '🔵 Azul', hex: '0984E3' },
    { id: 'warning', name: '🟡 Amarelo', hex: 'FDCB6E' },
    { id: 'danger', name: '🔴 Vermelho', hex: 'E74C3C' },
  ],

  ticketTypes: [
    { id: 'bug', emoji: '🐛', name: 'Reportar Bug', description: 'Encontrou um bug? Nos conte os detalhes.', color: 0xE74C3C },
    { id: 'sugestao', emoji: '💡', name: 'Sugestão', description: 'Tem uma ideia para melhorar? Compartilhe!', color: 0xFDCB6E },
    { id: 'duvida', emoji: '❓', name: 'Dúvida Técnica', description: 'Precisa de ajuda com código ou projeto?', color: 0x0984E3 },
    { id: 'parceria', emoji: '🤝', name: 'Parceria', description: 'Quer fazer uma parceria com a Vindra?', color: 0x00B894 },
    { id: 'vagas', emoji: '💼', name: 'Vagas', description: 'Quer divulgar uma oportunidade de trabalho?', color: 0x6C5CE7 },
    { id: 'outro', emoji: '📝', name: 'Outro', description: 'Algo que não se encaixa nas opções acima.', color: 0x636E72 },
  ],
};

// ============================================
// CLIENTE
// ============================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const ticketData = new Map();

// Armazena previews pendentes de confirmação
// chave: messageId do preview, valor: { embed, channelId, authorId }
const pendingPreviews = new Map();

// ============================================
// UTILITÁRIOS
// ============================================

function generateTicketId() {
  return `VND-${Date.now().toString(36).toUpperCase()}`;
}

function isStaff(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (CONFIG.STAFF_ROLE_ID && member.roles.cache.has(CONFIG.STAFF_ROLE_ID)) return true;
  return false;
}

async function getOrCreateCategory(guild, name, reason = 'Sistema de Tickets') {
  const existing = guild.channels.cache.find(
    (c) => c.name === name && c.type === ChannelType.GuildCategory
  );
  if (existing) return existing;
  return guild.channels.create({ name, type: ChannelType.GuildCategory, reason });
}

async function sendLog(guild, embed) {
  const logChannel = guild.channels.cache.get(CONFIG.LOG_CHANNEL);
  if (logChannel) {
    await logChannel.send({ embeds: [embed] });
  }
}

function deleteAfter(channel, msg, ms = 5000) {
  setTimeout(() => msg.delete().catch(() => {}), ms);
}

// Converte hex (com ou sem #) pra número
function parseColor(hex) {
  if (!hex) return null;
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return null;
  return parseInt(clean, 16);
}

// ============================================
// SISTEMA DE TICKETS
// ============================================

async function createTicketPanel(interaction) {
  const guild = interaction.guild;

  const embed = new EmbedBuilder()
    .setColor(CONFIG.colors.primary)
    .setTitle('🎫 Central de Atendimento - Vindra Code')
    .setDescription(
      `Bem-vindo ao sistema de tickets da **Vindra Code**!\n\n` +
      `Selecione abaixo o tipo de atendimento que você precisa.\n\n` +
      `**Como funciona:**\n` +
      `1️⃣ Clique no tipo de ticket desejado\n` +
      `2️⃣ Descreva seu problema ou solicitação\n` +
      `3️⃣ Nossa equipe responderá o mais rápido possível\n\n` +
      `⚠️ **Atenção:** Tickets falsos ou abusivos podem resultar em ban.`
    )
    .setFooter({
      text: 'Vindra Code • Seu ticket será respondido em breve',
      iconURL: guild ? guild.iconURL() : undefined,
    })
    .setTimestamp();

  const selectOptions = CONFIG.ticketTypes.map((type) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(type.name)
      .setDescription(type.description)
      .setValue(type.id)
      .setEmoji(type.emoji)
  );

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('ticket_create')
      .setPlaceholder('Selecione o tipo de atendimento...')
      .addOptions(selectOptions)
  );

  const staffRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_panel_refresh')
      .setLabel('🔄 Painel de Tickets')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.channel.send({ embeds: [embed], components: [row, staffRow] });
  await interaction.reply({ content: '✅ Painel de tickets criado!', ephemeral: true });
}

async function createTicketPanelMessage(channel, guild) {
  const embed = new EmbedBuilder()
    .setColor(CONFIG.colors.primary)
    .setTitle('🎫 Central de Atendimento - Vindra Code')
    .setDescription(
      `Bem-vindo ao sistema de tickets da **Vindra Code**!\n\n` +
      `Selecione abaixo o tipo de atendimento que você precisa.`
    )
    .setFooter({
      text: 'Vindra Code • Seu ticket será respondido em breve',
      iconURL: guild ? guild.iconURL() : undefined,
    })
    .setTimestamp();

  const selectOptions = CONFIG.ticketTypes.map((type) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(type.name)
      .setDescription(type.description)
      .setValue(type.id)
      .setEmoji(type.emoji)
  );

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('ticket_create')
      .setPlaceholder('Selecione o tipo de atendimento...')
      .addOptions(selectOptions)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

async function createTicket(interaction, ticketType) {
  const guild = interaction.guild;
  const user = interaction.user;
  const type = CONFIG.ticketTypes.find((t) => t.id === ticketType);
  if (!type) return;

  const existingTicket = Array.from(ticketData.values()).find(
    (t) => t.userId === user.id && t.status === 'open'
  );

  if (existingTicket) {
    const existingChannel = guild.channels.cache.get(existingTicket.channelId);
    return interaction.reply({
      content: `⚠️ Você já tem um ticket aberto: ${existingChannel?.toString() || 'canal não encontrado'}`,
      ephemeral: true,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(`ticket_desc_${ticketType}`)
    .setTitle(`${type.emoji} ${type.name}`);

  const descInput = new TextInputBuilder()
    .setCustomId('ticket_description')
    .setLabel('Descreva seu problema/solicitação')
    .setPlaceholder('Seja detalhado para receber ajuda mais rápido...')
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(10)
    .setMaxLength(1000)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(descInput));
  await interaction.showModal(modal);
}

async function handleTicketModal(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const ticketTypeId = interaction.customId.replace('ticket_desc_', '');
    const ticketType = CONFIG.ticketTypes.find((t) => t.id === ticketTypeId);
    const description = interaction.fields.getTextInputValue('ticket_description');

    if (!ticketType) return interaction.editReply('❌ Tipo de ticket inválido.');

    const guild = interaction.guild;
    const user = interaction.user;
    const ticketId = generateTicketId();

    let category = guild.channels.cache.get(CONFIG.CATEGORY_ID);
    if (!category) category = await getOrCreateCategory(guild, '🎫・tickets');

    const ticketRole = await guild.roles.create({
      name: `🎫 │ ${user.username}`,
      color: ticketType.color,
      mentionable: false,
      reason: `Ticket ${ticketId} - ${user.tag}`,
    });

    const ticketChannel = await guild.channels.create({
      name: `${ticketType.id}-${user.username}`,
      type: ChannelType.GuildText,
      parent: category,
      topic: `Ticket ${ticketId} | Usuário: ${user.tag} (${user.id}) | Tipo: ${ticketType.name}`,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: ticketRole.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
          ],
        },
        {
          id: CONFIG.STAFF_ROLE_ID,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
          ],
        },
        ...(CONFIG.TICKET_SUPPORTER_ROLE_ID ? [{
          id: CONFIG.TICKET_SUPPORTER_ROLE_ID,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.SendMessages,
          ],
        }] : []),
      ],
    });

    const ticketInfo = {
      id: ticketId,
      userId: user.id,
      userTag: user.tag,
      channelId: ticketChannel.id,
      roleId: ticketRole.id,
      type: ticketType.id,
      typeName: ticketType.name,
      description,
      status: 'open',
      createdAt: new Date(),
      claimedBy: null,
    };

    ticketData.set(ticketId, ticketInfo);

    const ticketEmbed = new EmbedBuilder()
      .setColor(ticketType.color)
      .setTitle(`${ticketType.emoji} Ticket #${ticketId}`)
      .setDescription(
        `**Tipo:** ${ticketType.name}\n` +
        `**Usuário:** ${user}\n` +
        `**Criado em:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
        `📝 **Descrição:**\n${description}`
      )
      .setFooter({ text: `ID: ${ticketId}` })
      .setTimestamp();

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_claim_${ticketId}`)
        .setLabel('📌 Claim')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`ticket_close_${ticketId}`)
        .setLabel('🔒 Fechar')
        .setStyle(ButtonStyle.Danger),
    );

    const notifyMsg = await ticketChannel.send({
      content: `${user} ${guild.roles.cache.get(CONFIG.STAFF_ROLE_ID)}`,
      embeds: [ticketEmbed],
      components: [actionRow],
    });
    await notifyMsg.pin();

    const logEmbed = new EmbedBuilder()
      .setColor(CONFIG.colors.success)
      .setTitle('🎫 Ticket Criado')
      .addFields(
        { name: 'Ticket ID', value: ticketId, inline: true },
        { name: 'Tipo', value: ticketType.name, inline: true },
        { name: 'Usuário', value: user.toString(), inline: true },
        { name: 'Canal', value: ticketChannel.toString(), inline: true }
      )
      .setTimestamp();

    await sendLog(guild, logEmbed);

    await interaction.editReply({
      content: `✅ Seu ticket foi criado! Acesse aqui: ${ticketChannel.toString()}`,
    });
  } catch (error) {
    console.error('❌ Erro ao criar ticket:', error);
    try {
      if (interaction.deferred) {
        await interaction.editReply(`❌ Erro: ${error.message}`);
      } else {
        await interaction.reply({ content: `❌ Erro: ${error.message}`, ephemeral: true });
      }
    } catch (e) {}
  }
}

async function claimTicket(interaction, ticketId) {
  const ticket = ticketData.get(ticketId);
  if (!ticket) return interaction.reply({ content: '❌ Ticket não encontrado.', ephemeral: true });
  if (ticket.claimedBy) return interaction.reply({ content: '⚠️ Já foi reclamado.', ephemeral: true });

  ticket.claimedBy = { id: interaction.user.id, tag: interaction.user.tag };
  ticketData.set(ticketId, ticket);

  const channel = interaction.guild.channels.cache.get(ticket.channelId);
  if (channel) {
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(CONFIG.colors.warning)
          .setDescription(`📌 Este ticket está sendo atendido por ${interaction.user}`),
      ],
    });
  }

  await interaction.reply({ content: `📌 Você está atendendo o ticket #${ticketId}.`, ephemeral: true });

  await sendLog(interaction.guild,
    new EmbedBuilder()
      .setColor(CONFIG.colors.warning)
      .setTitle('📌 Ticket Reclamado')
      .addFields(
        { name: 'Ticket ID', value: ticketId, inline: true },
        { name: 'Atendente', value: interaction.user.toString(), inline: true }
      )
      .setTimestamp()
  );
}

async function closeTicket(interaction, ticketId) {
  const ticket = ticketData.get(ticketId);
  if (!ticket) return interaction.reply({ content: '❌ Ticket não encontrado.', ephemeral: true });

  const channel = interaction.guild.channels.cache.get(ticket.channelId);
  let transcript = [];

  if (channel) {
    const messages = await channel.messages.fetch({ limit: 100 });
    transcript = messages
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .map((m) => {
        const time = new Date(m.createdTimestamp).toLocaleString('pt-BR');
        const content = m.content || '[mensagem sem texto]';
        const attachments = m.attachments.size > 0
          ? `\n[Anexos: ${m.attachments.map((a) => a.name).join(', ')}]`
          : '';
        return `**[${time}]** ${m.author.tag}: ${content}${attachments}`;
      })
      .join('\n');
  }

  ticket.status = 'closed';
  ticket.closedBy = { id: interaction.user.id, tag: interaction.user.tag };
  ticket.closedAt = new Date();
  ticket.transcript = transcript;
  ticketData.set(ticketId, ticket);

  if (channel) {
    const transcriptChannel = interaction.guild.channels.cache.get(CONFIG.LOG_CHANNEL);
    if (transcriptChannel && transcript) {
      await transcriptChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(CONFIG.colors.info)
            .setTitle(`📋 Transcrição - Ticket #${ticketId}`)
            .addFields(
              { name: 'Usuário', value: ticket.userTag, inline: true },
              { name: 'Tipo', value: ticket.typeName, inline: true },
              { name: 'Atendente', value: ticket.claimedBy?.tag || 'Não reclamado', inline: true },
              { name: 'Fechado por', value: interaction.user.tag, inline: true }
            )
            .setDescription(`\`\`\`\n${transcript.slice(0, 4000)}\n\`\`\``)
            .setTimestamp(),
        ],
      });
    }
    await channel.delete(`Ticket ${ticketId} fechado por ${interaction.user.tag}`);
  }

  const ticketRole = interaction.guild.roles.cache.get(ticket.roleId);
  if (ticketRole) await ticketRole.delete('Ticket fechado');

  await interaction.reply({ content: `🔒 Ticket #${ticketId} fechado.`, ephemeral: true });

  await sendLog(interaction.guild,
    new EmbedBuilder()
      .setColor(CONFIG.colors.danger)
      .setTitle('🔒 Ticket Fechado')
      .addFields(
        { name: 'Ticket ID', value: ticketId, inline: true },
        { name: 'Usuário', value: ticket.userTag, inline: true },
        { name: 'Fechado por', value: interaction.user.toString(), inline: true }
      )
      .setTimestamp()
  );
}

// ============================================
// PAINEL DE MENSAGENS INTERATIVO
// ============================================

// Cria o painel com botões para cada tipo de embed
async function createEmbedPanel(channel, guild) {
  const embed = new EmbedBuilder()
    .setColor(CONFIG.colors.primary)
    .setTitle('📨 Painel de Mensagens - Vindra Code')
    .setDescription(
      'Clique em um botão abaixo para criar uma mensagem estilizada.\n' +
      'Você poderá revisar antes de postar no canal.\n\n' +
      '**Tipos disponíveis:**\n' +
      '📢 **Anúncio** — Comunicado importante para o servidor\n' +
      '💼 **Vaga** — Divulgar oportunidade de trabalho\n' +
      '🤝 **Parceria** — Anunciar parceria com outra empresa/projeto\n' +
      '🎉 **Boas-vindas** — Dar boas-vindas a um novo membro\n' +
      '📜 **Regras** — Enviar embed pronto de regras\n' +
      '🖼️ **Portfolio** — Card de projeto com imagem e botão de link'
    )
    .setFooter({ text: 'Vindra Code • Apenas staff pode usar' })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('embed_anuncio')
      .setLabel('📢 Anúncio')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('embed_vagas')
      .setLabel('💼 Vaga')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('embed_parceria')
      .setLabel('🤝 Parceria')
      .setStyle(ButtonStyle.Success),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('embed_boasvindas')
      .setLabel('🎉 Boas-vindas')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('embed_regras')
      .setLabel('📜 Regras')
      .setStyle(ButtonStyle.Secondary),
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('embed_portfolio')
      .setLabel('🖼️ Portfolio')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('embed_personalizado')
      .setLabel('✨ Personalizado')
      .setStyle(ButtonStyle.Secondary),
  );

  await channel.send({ embeds: [embed], components: [row1, row2, row3] });
}

// Abre modal para ANÚNCIO
function buildAnuncioModal() {
  const modal = new ModalBuilder()
    .setCustomId('modal_anuncio')
    .setTitle('📢 Novo Anúncio');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('titulo')
        .setLabel('Título do anúncio')
        .setPlaceholder('Ex: Nova atualização do servidor!')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('descricao')
        .setLabel('Descrição')
        .setPlaceholder('Escreva os detalhes do anúncio...')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(2000)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('cor')
        .setLabel('Cor (hex) - opcional')
        .setPlaceholder('Ex: 6C5CE7 (roxo Vindra). Deixe vazio para padrão.')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(7)
        .setRequired(false)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('imagem')
        .setLabel('URL da imagem - opcional')
        .setPlaceholder('https://i.imgur.com/... (banner do anúncio)')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(500)
        .setRequired(false)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('ping')
        .setLabel('Mencionar @everyone? (sim/não)')
        .setPlaceholder('Digite "sim" para mencionar @everyone')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(3)
        .setRequired(false)
    ),
  );

  return modal;
}

// Abre modal para VAGAS
function buildVagasModal() {
  const modal = new ModalBuilder()
    .setCustomId('modal_vagas')
    .setTitle('💼 Nova Vaga');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('titulo')
        .setLabel('Título da vaga')
        .setPlaceholder('Ex: Desenvolvedor Front-end')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('descricao')
        .setLabel('Descrição da vaga')
        .setPlaceholder('Requisitos, responsabilidades, benefícios...')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(2000)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('link')
        .setLabel('Link para candidatura - opcional')
        .setPlaceholder('https://... ou #canal')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(500)
        .setRequired(false)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('cor')
        .setLabel('Cor (hex) - opcional')
        .setPlaceholder('Ex: 00B894 (verde). Vazio = padrão.')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(7)
        .setRequired(false)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('ping')
        .setLabel('Mencionar @everyone? (sim/não)')
        .setPlaceholder('Digite "sim" para mencionar')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(3)
        .setRequired(false)
    ),
  );

  return modal;
}

// Abre modal para PARCERIA
function buildParceriaModal() {
  const modal = new ModalBuilder()
    .setCustomId('modal_parceria')
    .setTitle('🤝 Nova Parceria');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('titulo')
        .setLabel('Nome da empresa/projeto')
        .setPlaceholder('Ex: Logo Studio')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('descricao')
        .setLabel('Descrição da parceria')
        .setPlaceholder('O que a empresa faz, como será a parceria...')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(2000)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('link')
        .setLabel('Link - opcional')
        .setPlaceholder('Site, Discord, rede social...')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(500)
        .setRequired(false)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('cor')
        .setLabel('Cor (hex) - opcional')
        .setPlaceholder('Vazio = padrão (azul)')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(7)
        .setRequired(false)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('ping')
        .setLabel('Mencionar @everyone? (sim/não)')
        .setPlaceholder('Digite "sim" para mencionar')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(3)
        .setRequired(false)
    ),
  );

  return modal;
}

// Modal para BOAS-VINDAS
function buildBoasVindasModal() {
  const modal = new ModalBuilder()
    .setCustomId('modal_boasvindas')
    .setTitle('🎉 Boas-vindas');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('user_id')
        .setLabel('ID do usuário')
        .setPlaceholder('Cole o ID do Discord do usuário (clique direito no perfil com Dev Mode ativo)')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(25)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('mensagem')
        .setLabel('Mensagem personalizada')
        .setPlaceholder('Ex: Bem-vindo à Vindra Code! Esperamos você no servidor.')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(500)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('cor')
        .setLabel('Cor (hex) - opcional')
        .setPlaceholder('Vazio = verde padrão')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(7)
        .setRequired(false)
    ),
  );

  return modal;
}

// Modal de PORTFOLIO
function buildPortfolioModal() {
  const modal = new ModalBuilder()
    .setCustomId('modal_portfolio')
    .setTitle('🖼️ Card de Portfolio');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('titulo')
        .setLabel('Título do projeto')
        .setPlaceholder('Ex: Meu Site Incrível')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('descricao')
        .setLabel('Descrição')
        .setPlaceholder('Descreva o projeto em poucas palavras...')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(500)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('imagem')
        .setLabel('URL da imagem')
        .setPlaceholder('https://i.imgur.com/foto.png')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(500)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('site_url')
        .setLabel('URL do site')
        .setPlaceholder('https://meusite.com')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(500)
        .setRequired(true)
    ),
  );

  return modal;
}

// Modal PERSONALIZADO (controle total)
function buildPersonalizadoModal() {
  const modal = new ModalBuilder()
    .setCustomId('modal_personalizado')
    .setTitle('✨ Embed Personalizado');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('titulo')
        .setLabel('Título')
        .setPlaceholder('Título do embed')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('descricao')
        .setLabel('Descrição')
        .setPlaceholder('Texto principal do embed (suporta markdown)')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(2000)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('cor')
        .setLabel('Cor (hex) - opcional')
        .setPlaceholder('Ex: 6C5CE7. Vazio = roxo padrão.')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(7)
        .setRequired(false)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('imagem')
        .setLabel('URL da imagem grande - opcional')
        .setPlaceholder('https://...')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(500)
        .setRequired(false)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('thumbnail')
        .setLabel('URL do thumbnail (canto) - opcional')
        .setPlaceholder('https://... (ícone pequeno no canto)')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(500)
        .setRequired(false)
    ),
  );

  return modal;
}

// Envia preview com botões de confirmação
async function sendPreview(interaction, embed, pingEveryone = false, customPing = '') {
  // Ping (opcional): @everyone, @here, ou vazio
  const ping = pingEveryone ? '@everyone' : (customPing || '');

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`preview_post_${interaction.id}`)
      .setLabel('✅ Postar no canal')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`preview_cancel_${interaction.id}`)
      .setLabel('❌ Cancelar')
      .setStyle(ButtonStyle.Danger),
  );

  const previewEmbed = new EmbedBuilder()
    .setColor(CONFIG.colors.warning)
    .setTitle('👀 Preview - Revise antes de postar')
    .setDescription('Confira o embed abaixo e clique em **Postar** para enviar no canal.');

  // Mensagem ephemeral de preview (só o autor vê os botões)
  await interaction.editReply({
    content: ping || null,
    embeds: [previewEmbed, embed],
    components: [actionRow],
  });

  // Salva o embed + interactionId pra usar no botão
  // Truque: usamos o id da própria reply
  // Mas ephemeral replies só vivem 15min; vamos usar a mensagem ephemeral como referência
  // Solução: guardar no Map com interaction.id
  pendingPreviews.set(interaction.id, {
    embed,
    userId: interaction.user.id,
  });
}

// ============================================
// INTERACTION HANDLERS
// ============================================

client.on('interactionCreate', async (interaction) => {
  try {
    // ========== SELECT MENU / TICKETS ==========
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_create') {
      await createTicket(interaction, interaction.values[0]);
      return;
    }

    // ========== MODAL DE TICKET ==========
    if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_desc_')) {
      await handleTicketModal(interaction);
      return;
    }

    // ========== MODAIS DE EMBED ==========
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_')) {
      await handleEmbedModal(interaction);
      return;
    }

    // ========== BOTÕES ==========
    if (interaction.isButton()) {
      const customId = interaction.customId;

      // Botões de ticket
      if (customId.startsWith('ticket_claim_')) {
        const ticketId = customId.replace('ticket_claim_', '');
        await claimTicket(interaction, ticketId);
        return;
      }
      if (customId.startsWith('ticket_close_')) {
        const ticketId = customId.replace('ticket_close_', '');
        await closeTicket(interaction, ticketId);
        return;
      }
      if (customId === 'ticket_panel_refresh') {
        await createTicketPanel(interaction);
        return;
      }

      // Botões do painel de embeds (abre modal)
      if (customId === 'embed_anuncio') {
        if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Apenas staff.', ephemeral: true });
        await interaction.showModal(buildAnuncioModal());
        return;
      }
      if (customId === 'embed_vagas') {
        if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Apenas staff.', ephemeral: true });
        await interaction.showModal(buildVagasModal());
        return;
      }
      if (customId === 'embed_parceria') {
        if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Apenas staff.', ephemeral: true });
        await interaction.showModal(buildParceriaModal());
        return;
      }
      if (customId === 'embed_boasvindas') {
        if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Apenas staff.', ephemeral: true });
        await interaction.showModal(buildBoasVindasModal());
        return;
      }
      if (customId === 'embed_portfolio') {
        if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Apenas staff.', ephemeral: true });
        await interaction.showModal(buildPortfolioModal());
        return;
      }
      if (customId === 'embed_personalizado') {
        if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Apenas staff.', ephemeral: true });
        await interaction.showModal(buildPersonalizadoModal());
        return;
      }
      if (customId === 'embed_regras') {
        if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Apenas staff.', ephemeral: true });
        await sendRegrasEmbed(interaction);
        return;
      }

      // Botões de preview (postar/cancelar)
      if (customId.startsWith('preview_post_')) {
        await handlePreviewPost(interaction);
        return;
      }
      if (customId.startsWith('preview_cancel_')) {
        await handlePreviewCancel(interaction);
        return;
      }
    }
  } catch (error) {
    console.error('❌ Erro em interactionCreate:', error);
    try {
      const errorMsg = `❌ Erro: ${error.message}`;
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: errorMsg, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMsg, ephemeral: true });
      }
    } catch (e) {}
  }
});

// Handler genérico dos modais de embed
async function handleEmbedModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const type = interaction.customId.replace('modal_', '');
  let embed;
  let pingEveryone = false;
  let customPing = '';

  const get = (id) => interaction.fields.getTextInputValue(id) || '';

  if (type === 'anuncio') {
    const titulo = get('titulo');
    const descricao = get('descricao');
    const cor = parseColor(get('cor')) || CONFIG.colors.primary;
    const imagem = get('imagem');
    const ping = get('ping').toLowerCase().trim();

    pingEveryone = ping === 'sim';

    embed = new EmbedBuilder()
      .setColor(cor)
      .setTitle(`📢 ${titulo}`)
      .setDescription(descricao)
      .setFooter({ text: `Vindra Code • Anunciado por ${interaction.user.tag}` })
      .setTimestamp();
    if (imagem) embed.setImage(imagem);
  }

  else if (type === 'vagas') {
    const titulo = get('titulo');
    const descricao = get('descricao');
    const link = get('link');
    const cor = parseColor(get('cor')) || CONFIG.colors.success;
    const ping = get('ping').toLowerCase().trim();

    pingEveryone = ping === 'sim';

    embed = new EmbedBuilder()
      .setColor(cor)
      .setTitle(`💼 ${titulo}`)
      .setDescription(descricao)
      .addFields({ name: '🔗 Candidatar-se', value: link || 'Abra um ticket!' })
      .setFooter({ text: `Vindra Code • Postado por ${interaction.user.tag}` })
      .setTimestamp();
  }

  else if (type === 'parceria') {
    const titulo = get('titulo');
    const descricao = get('descricao');
    const link = get('link');
    const cor = parseColor(get('cor')) || CONFIG.colors.info;
    const ping = get('ping').toLowerCase().trim();

    pingEveryone = ping === 'sim';

    embed = new EmbedBuilder()
      .setColor(cor)
      .setTitle(`🤝 ${titulo}`)
      .setDescription(descricao)
      .addFields({ name: '🔗 Mais informações', value: link || 'Abra um ticket!' })
      .setFooter({ text: `Vindra Code • Postado por ${interaction.user.tag}` })
      .setTimestamp();
  }

  else if (type === 'boasvindas') {
    const userId = get('user_id');
    const mensagem = get('mensagem');
    const cor = parseColor(get('cor')) || CONFIG.colors.success;

    let user;
    try {
      user = await client.users.fetch(userId);
    } catch (e) {
      return interaction.editReply('❌ ID de usuário inválido. Verifique se digitou certo e se o Dev Mode tá ativo.');
    }

    embed = new EmbedBuilder()
      .setColor(cor)
      .setTitle('🎉 Bem-vindo(a)!')
      .setDescription(
        `${user}, ${mensagem}\n\n` +
        `📜 Leia as regras em <#${interaction.channel.id}>\n` +
        `🎫 Dúvidas? Abra um ticket!`
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setFooter({ text: `Vindra Code • Boas-vindas por ${interaction.user.tag}` })
      .setTimestamp();

    // Pra boas-vindas, menciona o user no content
    customPing = `${user}`;
  }

  else if (type === 'personalizado') {
    const titulo = get('titulo');
    const descricao = get('descricao');
    const cor = parseColor(get('cor')) || CONFIG.colors.primary;
    const imagem = get('imagem');
    const thumbnail = get('thumbnail');

    embed = new EmbedBuilder()
      .setColor(cor)
      .setTitle(titulo)
      .setDescription(descricao)
      .setFooter({ text: `Vindra Code • Enviado por ${interaction.user.tag}` })
      .setTimestamp();
    if (imagem) embed.setImage(imagem);
    if (thumbnail) embed.setThumbnail(thumbnail);
  }

  else if (type === 'portfolio') {
    const titulo = get('titulo');
    const descricao = get('descricao');
    const imagem = get('imagem');
    const siteUrl = get('site_url');

    // Portfolio vai direto com botão (não usa preview)
    const portfolioEmbed = new EmbedBuilder()
      .setColor(CONFIG.colors.primary)
      .setTitle(`🖼️ ${titulo}`)
      .setDescription(descricao)
      .setImage(imagem)
      .setFooter({ text: 'Vindra Code • Portfolio' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('🚀 Ir para o Site')
        .setStyle(ButtonStyle.Link)
        .setURL(siteUrl)
    );

    await interaction.channel.send({
      content: '💼 **Novo Projeto no Portfolio!**',
      embeds: [portfolioEmbed],
      components: [row]
    });

    return interaction.editReply({ content: '✅ Card de portfolio enviado!' });
  }

  if (!embed) return interaction.editReply('❌ Tipo desconhecido.');

  await sendPreview(interaction, embed, pingEveryone, customPing);
}

// Envia embed pronto de regras (sem preview, manda direto)
async function sendRegrasEmbed(interaction) {
  const embed = new EmbedBuilder()
    .setColor(CONFIG.colors.primary)
    .setTitle('📜 Regras da Vindra Code')
    .setDescription('Para manter a comunidade saudável, siga estas regras:')
    .addFields(
      {
        name: '✅ Comportamento',
        value: '• Respeite todos os membros\n• Sem spam, flood ou caps lock excessivo\n• Sem conteúdo NSFW ou ofensivo',
        inline: false,
      },
      {
        name: '💬 Canais de texto',
        value: '• Use o canal correto para cada assunto\n• Evite mensagens excessivamente longas\n• Sem divulgação sem autorização',
        inline: false,
      },
      {
        name: '🔊 Canais de voz',
        value: '• Sem gritos ou sons irritantes\n• Respeite quem está falando',
        inline: false,
      },
      {
        name: '⚠️ Punições',
        value: 'O descumprimento resulta em advertência, mute ou ban conforme a gravidade.',
        inline: false,
      }
    )
    .setFooter({ text: 'Vindra Code • Leia com atenção' })
    .setTimestamp();

  await interaction.channel.send({ embeds: [embed] });
  await interaction.reply({ content: '✅ Regras enviadas!', ephemeral: true });
}

// Confirma e posta o embed no canal
async function handlePreviewPost(interaction) {
  const interactionId = interaction.customId.replace('preview_post_', '');
  const pending = pendingPreviews.get(interactionId);

  if (!pending) {
    return interaction.update({
      embeds: [new EmbedBuilder().setColor(CONFIG.colors.danger).setDescription('❌ Preview expirou.')],
      components: [],
    });
  }

  if (pending.userId !== interaction.user.id) {
    return interaction.reply({ content: '❌ Apenas o autor do preview pode postar.', ephemeral: true });
  }

  // Recupera o ping do embed original (guardamos junto)
  // Truque: re-envia direto sem ping (mais seguro)
  await interaction.channel.send({ embeds: [pending.embed] });

  pendingPreviews.delete(interactionId);

  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setColor(CONFIG.colors.success)
        .setDescription('✅ Mensagem postada com sucesso!'),
    ],
    components: [],
  });
}

async function handlePreviewCancel(interaction) {
  const interactionId = interaction.customId.replace('preview_cancel_', '');
  pendingPreviews.delete(interactionId);

  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setColor(CONFIG.colors.danger)
        .setDescription('❌ Envio cancelado.'),
    ],
    components: [],
  });
}

// ============================================
// READY
// ============================================

client.once('ready', async () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║                                           ║
  ║   🎫 VINDRA CODE - TICKETS + EMBEDS       ║
  ║                                           ║
  ║   Bot conectado e pronto!                 ║
  ║   Servidor: ${client.guilds.cache.first()?.name || 'N/A'}
  ║                                           ║
  ╚═══════════════════════════════════════════╝
  `);

  const commands = [
    { name: 'ticket-panel', description: 'Cria painel de tickets', defaultMemberPermissions: PermissionFlagsBits.Administrator },
    { name: 'ticket-close', description: 'Fecha ticket atual', defaultMemberPermissions: PermissionFlagsBits.ManageChannels },
    { name: 'ticket-info', description: 'Info do ticket atual' },
    { name: 'painel-embeds', description: 'Abre painel interativo de mensagens' },
    { name: 'help', description: 'Lista comandos do bot' },
  ];

  try {
    await client.application.commands.set(commands);
    console.log('✅ Comandos slash registrados!');
  } catch (error) {
    console.log('⚠️ Erro ao registrar comandos:', error.message);
  }
});

// ============================================
// COMANDOS DE MENSAGEM
// ============================================

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).split(/ +/);
  const command = args.shift().toLowerCase();

  // !painel - Painel de tickets
  if (command === 'painel' || command === 'ticket-panel') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas administradores.');
    }
    try { await message.delete(); } catch (e) {}
    await createTicketPanelMessage(message.channel, message.guild);
    return;
  }

  // !painel-embeds - Abre painel interativo de mensagens
  if (command === 'painel-embeds' || command === 'painel-mensagens') {
    if (!isStaff(message.member)) return message.reply('❌ Apenas staff.');
    try { await message.delete(); } catch (e) {}
    await createEmbedPanel(message.channel, message.guild);
    return;
  }

  // !fechar - Fecha ticket
  if (command === 'fechar' || command === 'ticket-close') {
    const ticket = Array.from(ticketData.values()).find(
      (t) => t.channelId === message.channel.id
    );
    if (!ticket) return message.reply('❌ Este canal não é um ticket.');
    await message.reply('🔒 Fechando...');
    await closeTicket(message, ticket.id);
    return;
  }

  // !info - Info do ticket
  if (command === 'info' || command === 'ticket-info') {
    const ticket = Array.from(ticketData.values()).find(
      (t) => t.channelId === message.channel.id
    );
    if (!ticket) return message.reply('❌ Este canal não é um ticket.');

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(CONFIG.colors.primary)
          .setTitle(`📋 Ticket #${ticket.id}`)
          .addFields(
            { name: 'Tipo', value: ticket.typeName, inline: true },
            { name: 'Status', value: ticket.status === 'open' ? '🟢 Aberto' : '🔴 Fechado', inline: true },
            { name: 'Usuário', value: `<@${ticket.userId}>`, inline: true },
            { name: 'Atendente', value: ticket.claimedBy ? `<@${ticket.claimedBy.id}>` : 'Nenhum', inline: true },
            { name: 'Criado em', value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:F>`, inline: true }
          )
          .setDescription(`📝 **Descrição:**\n${ticket.description}`),
      ],
    });
    return;
  }

  // !help - Lista todos os comandos
  if (command === 'help' || command === 'ajuda') {
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(CONFIG.colors.primary)
          .setTitle('📚 Comandos do Vindra Bot')
          .addFields(
            { name: '🎫 Tickets', value: '`!painel` `!fechar` `!info`' },
            { name: '📨 Mensagens', value: '`!painel-embeds` (abre painel com botões)' },
            { name: '💼 Portfolio', value: '`!portfolio` (cria card de projeto)' },
            { name: '❓ Ajuda', value: '`!help`' }
          )
          .setFooter({ text: 'Vindra Code • Apenas staff usa os comandos de embed' }),
      ],
    });
    return;
  }

  // !portfolio - Cria card de projeto com imagem e botão de link
  if (command === 'portfolio' || command === 'projeto') {
    if (!isStaff(message.member)) return message.reply('❌ Apenas staff pode usar este comando.');

    // Formato: !portfolio <titulo> | <descricao> | <url da imagem> | <url do site>
    const fullText = args.join(' ');
    const parts = fullText.split('|').map(p => p.trim());

    if (parts.length < 3) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(CONFIG.colors.warning)
            .setTitle('💼 Criar Card de Portfolio')
            .setDescription('**Como usar:**\n```\n!portfolio <titulo> | <descricao> | <url da imagem> | <url do site>\n```\n\n**Exemplo:**\n```\n!portfolio Meu Site | Um site incrível que fiz | https://i.imgur.com/foto.png | https://meusite.com\n```')
            .addFields(
              { name: '📌 Passo a passo:', value: '1. Cole a URL da imagem (termina em .png, .jpg, etc)\n2. Cole a URL do site\n3. Separe tudo com `|` (pipe)' }
            )
        ]
      });
    }

    const [title, description, imageUrl, siteUrl] = parts;

    if (!imageUrl.startsWith('http')) {
      return message.reply('❌ A URL da imagem precisa começar com http:// ou https://');
    }
    if (!siteUrl.startsWith('http')) {
      return message.reply('❌ A URL do site precisa começar com http:// ou https://');
    }

    const portfolioEmbed = new EmbedBuilder()
      .setColor(CONFIG.colors.primary)
      .setTitle(`💼 ${title}`)
      .setDescription(description)
      .setImage(imageUrl)
      .setFooter({ text: 'Vindra Code • Portfolio' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('🚀 Ir para o Site')
        .setStyle(ButtonStyle.Link)
        .setURL(siteUrl)
    );

    await message.channel.send({
      content: '💼 **Novo Projeto no Portfolio!**',
      embeds: [portfolioEmbed],
      components: [row]
    });

    await message.reply('✅ Card de portfolio enviado!');
    return;
  }
});

// ============================================
// SISTEMA DE BOAS-VINDAS AUTOMÁTICAS
// ============================================

client.on('guildMemberAdd', async (member) => {
  const welcomeChannel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL);
  if (!welcomeChannel) return;

  const embed = new EmbedBuilder()
    .setColor(CONFIG.colors.success)
    .setTitle('🎉 Bem-vindo(a) à Vindra Code!')
    .setDescription(`Olá ${member}, seja muito bem-vindo(a) ao nosso servidor!\n\nLeia as regras e aproveite o ambiente. 🚀`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: '👥 Membro', value: `**#${member.guild.memberCount}**`, inline: true },
      { name: '📅 Conta criada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
    )
    .setFooter({ text: 'Vindra Code • Vamos codar juntos!' })
    .setTimestamp();

  await welcomeChannel.send({
    content: `${member} 👋`,
    embeds: [embed]
  });
});

// ============================================
// LOGIN
// ============================================

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error('❌ Erro ao conectar:', error.message);
  console.log('\nVerifique se o DISCORD_TOKEN está configurado corretamente.');
});