// ============================================
// VINDRA CODE - SISTEMA DE TICKETS + EMBEDS
// Bot completo com painel, categorias, logs e comandos de embed
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
  // IDs (configure no .env)
  GUILD_ID: process.env.GUILD_ID,
  CATEGORY_ID: process.env.CATEGORY_ID,
  TICKET_PANEL_CHANNEL: process.env.TICKET_PANEL_CHANNEL,
  LOG_CHANNEL: process.env.LOG_CHANNEL,
  STAFF_ROLE_ID: process.env.STAFF_ROLE_ID,
  TICKET_SUPPORTER_ROLE_ID: process.env.TICKET_SUPPORTER_ROLE_ID,

  // Cores da marca
  colors: {
    primary: 0x6C5CE7,      // Roxo Vindra
    success: 0x00B894,     // Verde
    danger: 0xE74C3C,      // Vermelho
    warning: 0xFDCB6E,     // Amarelo
    info: 0x0984E3,        // Azul
  },

  // Categorias de ticket
  ticketTypes: [
    {
      id: 'bug',
      emoji: '🐛',
      name: 'Reportar Bug',
      description: 'Encontrou um bug? Nos conte os detalhes.',
      color: 0xE74C3C,
    },
    {
      id: 'sugestao',
      emoji: '💡',
      name: 'Sugestão',
      description: 'Tem uma ideia para melhorar? Compartilhe!',
      color: 0xFDCB6E,
    },
    {
      id: 'duvida',
      emoji: '❓',
      name: 'Dúvida Técnica',
      description: 'Precisa de ajuda com código ou projeto?',
      color: 0x0984E3,
    },
    {
      id: 'parceria',
      emoji: '🤝',
      name: 'Parceria',
      description: 'Quer fazer uma parceria com a Vindra?',
      color: 0x00B894,
    },
    {
      id: 'vagas',
      emoji: '💼',
      name: 'Vagas',
      description: 'Quer divulgar uma oportunidade de trabalho?',
      color: 0x6C5CE7,
    },
    {
      id: 'outro',
      emoji: '📝',
      name: 'Outro',
      description: 'Algo que não se encaixa nas opções acima.',
      color: 0x636E72,
    },
  ],
};

// ============================================
// CLIENTE DO BOT
// ============================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Armazenamento em memória (use banco de dados em produção)
const ticketData = new Map();

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

  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    reason,
  });
}

async function sendLog(guild, embed) {
  const logChannel = guild.channels.cache.get(CONFIG.LOG_CHANNEL);
  if (logChannel) {
    await logChannel.send({ embeds: [embed] });
  }
}

// Helper para deletar confirmação após 5s
async function deleteAfter(channel, msg, ms = 5000) {
  setTimeout(() => msg.delete().catch(() => {}), ms);
}

// ============================================
// CRIAÇÃO DO PAINEL DE TICKETS
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

  await interaction.channel.send({
    embeds: [embed],
    components: [row, staffRow],
  });

  await interaction.reply({
    content: '✅ Painel de tickets criado com sucesso!',
    ephemeral: true,
  });
}

async function createTicketPanelMessage(channel, guild) {
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

  await channel.send({
    embeds: [embed],
    components: [row],
  });
}

// ============================================
// CRIAÇÃO DO TICKET
// ============================================

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

  const firstActionRow = new ActionRowBuilder().addComponents(descInput);
  modal.addComponents(firstActionRow);

  await interaction.showModal(modal);
}

async function handleTicketModal(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const ticketTypeId = interaction.customId.replace('ticket_desc_', '');
    const ticketType = CONFIG.ticketTypes.find((t) => t.id === ticketTypeId);
    const description = interaction.fields.getTextInputValue('ticket_description');

    if (!ticketType) {
      return interaction.editReply('❌ Tipo de ticket inválido.');
    }

    const guild = interaction.guild;
    const user = interaction.user;
    const ticketId = generateTicketId();

    let category = guild.channels.cache.get(CONFIG.CATEGORY_ID);
    if (!category) {
      category = await getOrCreateCategory(guild, '🎫・tickets');
    }

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
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
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
      .setFields(
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
        await interaction.editReply(`❌ Erro ao criar ticket: ${error.message}`);
      } else {
        await interaction.reply({ content: `❌ Erro: ${error.message}`, ephemeral: true });
      }
    } catch (e) {
      console.error('Não foi possível enviar erro:', e);
    }
  }
}

// ============================================
// GERENCIAMENTO DE TICKETS
// ============================================

async function claimTicket(interaction, ticketId) {
  const ticket = ticketData.get(ticketId);
  if (!ticket) {
    return interaction.reply({
      content: '❌ Ticket não encontrado.',
      ephemeral: true,
    });
  }

  if (ticket.claimedBy) {
    return interaction.reply({
      content: '⚠️ Este ticket já foi reclamado.',
      ephemeral: true,
    });
  }

  ticket.claimedBy = {
    id: interaction.user.id,
    tag: interaction.user.tag,
  };
  ticketData.set(ticketId, ticket);

  const channel = interaction.guild.channels.cache.get(ticket.channelId);
  if (channel) {
    const claimEmbed = new EmbedBuilder()
      .setColor(CONFIG.colors.warning)
      .setDescription(`📌 Este ticket está sendo atendido por ${interaction.user}`);

    await channel.send({ embeds: [claimEmbed] });
  }

  await interaction.reply({
    content: `📌 Você está atendendo o ticket #${ticketId}.`,
    ephemeral: true,
  });

  const logEmbed = new EmbedBuilder()
    .setColor(CONFIG.colors.warning)
    .setTitle('📌 Ticket Reclamado')
    .setFields(
      { name: 'Ticket ID', value: ticketId, inline: true },
      { name: 'Atendente', value: interaction.user.toString(), inline: true }
    )
    .setTimestamp();

  await sendLog(interaction.guild, logEmbed);
}

async function closeTicket(interaction, ticketId) {
  const ticket = ticketData.get(ticketId);
  if (!ticket) {
    return interaction.reply({
      content: '❌ Ticket não encontrado.',
      ephemeral: true,
    });
  }

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
  ticket.closedBy = {
    id: interaction.user.id,
    tag: interaction.user.tag,
  };
  ticket.closedAt = new Date();
  ticket.transcript = transcript;
  ticketData.set(ticketId, ticket);

  if (channel) {
    const transcriptChannel = interaction.guild.channels.cache.get(CONFIG.LOG_CHANNEL);
    if (transcriptChannel && transcript) {
      const transcriptEmbed = new EmbedBuilder()
        .setColor(CONFIG.colors.info)
        .setTitle(`📋 Transcrição - Ticket #${ticketId}`)
        .setFields(
          { name: 'Usuário', value: ticket.userTag, inline: true },
          { name: 'Tipo', value: ticket.typeName, inline: true },
          { name: 'Atendente', value: ticket.claimedBy?.tag || 'Não reclamado', inline: true },
          { name: 'Fechado por', value: interaction.user.tag, inline: true }
        )
        .setDescription(`\`\`\`\n${transcript.slice(0, 4000)}\n\`\`\``)
        .setTimestamp();

      await transcriptChannel.send({ embeds: [transcriptEmbed] });
    }

    await channel.delete(`Ticket ${ticketId} fechado por ${interaction.user.tag}`);
  }

  const ticketRole = interaction.guild.roles.cache.get(ticket.roleId);
  if (ticketRole) {
    await ticketRole.delete('Ticket fechado - limpando cargo temporário');
  }

  await interaction.reply({
    content: `🔒 Ticket #${ticketId} foi fechado.`,
    ephemeral: true,
  });

  const logEmbed = new EmbedBuilder()
    .setColor(CONFIG.colors.danger)
    .setTitle('🔒 Ticket Fechado')
    .setFields(
      { name: 'Ticket ID', value: ticketId, inline: true },
      { name: 'Usuário', value: ticket.userTag, inline: true },
      { name: 'Fechado por', value: interaction.user.toString(), inline: true }
    )
    .setTimestamp();

  await sendLog(interaction.guild, logEmbed);
}

// ============================================
// INTERACTION HANDLERS
// ============================================

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_create') {
      await createTicket(interaction, interaction.values[0]);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_desc_')) {
      await handleTicketModal(interaction);
      return;
    }

    if (interaction.isButton()) {
      const customId = interaction.customId;

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
    }
  } catch (error) {
    console.error('❌ Erro em interactionCreate:', error);

    const errorMsg = `❌ Erro ao processar ação: ${error.message}`;
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: errorMsg, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMsg, ephemeral: true });
      }
    } catch (e) {
      console.error('Não foi possível enviar erro:', e);
    }
  }
});

// ============================================
// COMANDOS DE SLASH
// ============================================

client.once('ready', async () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║                                           ║
  ║   🎫 VINDRA CODE - SISTEMA DE TICKETS     ║
  ║   ✨ Comandos de Embed disponíveis       ║
  ║                                           ║
  ║   Bot conectado e pronto!                 ║
  ║   Servidor: ${client.guilds.cache.first()?.name || 'N/A'}
  ║                                           ║
  ╚═══════════════════════════════════════════╝
  `);

  const commands = [
    {
      name: 'ticket-panel',
      description: 'Cria o painel de tickets',
      defaultMemberPermissions: PermissionFlagsBits.Administrator,
    },
    {
      name: 'ticket-close',
      description: 'Fecha o ticket atual (apenas no canal de ticket)',
      defaultMemberPermissions: PermissionFlagsBits.ManageChannels,
    },
    {
      name: 'ticket-info',
      description: 'Mostra informações do ticket atual',
    },
    {
      name: 'anuncio',
      description: 'Envia um anúncio estilizado',
      options: [
        {
          name: 'titulo',
          type: 3, // STRING
          description: 'Título do anúncio',
          required: true,
        },
        {
          name: 'descricao',
          type: 3,
          description: 'Descrição do anúncio',
          required: true,
        },
      ],
    },
    {
      name: 'vagas',
      description: 'Anuncia uma vaga de emprego',
      options: [
        {
          name: 'titulo',
          type: 3,
          description: 'Título da vaga',
          required: true,
        },
        {
          name: 'descricao',
          type: 3,
          description: 'Descrição da vaga',
          required: true,
        },
      ],
    },
    {
      name: 'helpembed',
      description: 'Mostra todos os comandos de embed disponíveis',
    },
  ];

  try {
    await client.application.commands.set(commands);
    console.log('✅ Comandos de slash registrados!');
  } catch (error) {
    console.log('⚠️ Não foi possível registrar comandos:', error.message);
  }
});

// ============================================
// COMANDOS DE EMBED (mensagens estilizadas)
// ============================================

// !anuncio <titulo> | <descrição> | [cor] | [imagem]
async function handleAnuncio(message, args) {
  const joined = args.join(' ');
  const parts = joined.split('|').map((s) => s.trim());

  if (parts.length < 2) {
    return message.reply(
      '❌ **Uso:** `!anuncio <titulo> | <descrição> | [cor hex] | [url da imagem]`\n' +
      '**Exemplo:** `!anuncio Novidade! | Novo recurso disponível | #6C5CE7`'
    );
  }

  const [title, description, colorHex, imageUrl] = parts;
  const color = colorHex ? parseInt(colorHex.replace('#', ''), 16) : CONFIG.colors.primary;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setImage(imageUrl || null)
    .setFooter({ text: `Vindra Code • Anunciado por ${message.author.tag}` })
    .setTimestamp();

  try {
    await message.delete();
  } catch (e) {}

  const sent = await message.channel.send({ embeds: [embed] });
  const confirm = await message.channel.send('✅ Anúncio enviado!');
  deleteAfter(message.channel, confirm);
  return sent;
}

// !regras - Envia embed de regras
async function handleRegras(message) {
  const embed = new EmbedBuilder()
    .setColor(CONFIG.colors.primary)
    .setTitle('📜 Regras da Vindra Code')
    .setDescription('Para manter a comunidade saudável, siga estas regras:')
    .addFields(
      {
        name: '✅ Comportamento',
        value:
          '• Respeite todos os membros\n' +
          '• Sem spam, flood ou caps lock excessivo\n' +
          '• Sem conteúdo NSFW ou ofensivo',
        inline: false,
      },
      {
        name: '💬 Canais de texto',
        value:
          '• Use o canal correto para cada assunto\n' +
          '• Evite mensagens excessivamente longas\n' +
          '• Sem divulgação sem autorização',
        inline: false,
      },
      {
        name: '🔊 Canais de voz',
        value:
          '• Sem gritos ou sons irritantes\n' +
          '• Respeite quem está falando',
        inline: false,
      },
      {
        name: '⚠️ Punições',
        value: 'O descumprimento das regras resulta em advertência, mute ou ban, dependendo da gravidade.',
        inline: false,
      }
    )
    .setFooter({ text: 'Vindra Code • Leia com atenção' })
    .setTimestamp();

  try {
    await message.delete();
  } catch (e) {}

  const sent = await message.channel.send({ embeds: [embed] });
  const confirm = await message.channel.send('✅ Regras enviadas!');
  deleteAfter(message.channel, confirm);
  return sent;
}

// !vagas <titulo> | <descrição> | [link]
async function handleVagas(message, args) {
  const joined = args.join(' ');
  const parts = joined.split('|').map((s) => s.trim());

  if (parts.length < 2) {
    return message.reply(
      '❌ **Uso:** `!vagas <titulo> | <descrição> | [link]`\n' +
      '**Exemplo:** `!vagas Dev Frontend | Estamos contratando | https://...`'
    );
  }

  const [title, description, link] = parts;

  const embed = new EmbedBuilder()
    .setColor(CONFIG.colors.success)
    .setTitle(`💼 ${title}`)
    .setDescription(description)
    .addFields({
      name: '🔗 Como se candidatar',
      value: link || 'Entre em contato via ticket!',
    })
    .setFooter({ text: `Vindra Code • Postado por ${message.author.tag}` })
    .setTimestamp();

  try {
    await message.delete();
  } catch (e) {}

  const sent = await message.channel.send({ embeds: [embed] });
  const confirm = await message.channel.send('✅ Vaga anunciada!');
  deleteAfter(message.channel, confirm);
  return sent;
}

// !parceria <nome> | <descrição> | [link]
async function handleParceria(message, args) {
  const joined = args.join(' ');
  const parts = joined.split('|').map((s) => s.trim());

  if (parts.length < 2) {
    return message.reply('❌ **Uso:** `!parceria <nome> | <descrição> | [link]`');
  }

  const [title, description, link] = parts;

  const embed = new EmbedBuilder()
    .setColor(CONFIG.colors.info)
    .setTitle(`🤝 ${title}`)
    .setDescription(description)
    .addFields({
      name: '🔗 Mais informações',
      value: link || 'Abra um ticket para saber mais!',
    })
    .setFooter({ text: `Vindra Code • Postado por ${message.author.tag}` })
    .setTimestamp();

  try {
    await message.delete();
  } catch (e) {}

  const sent = await message.channel.send({ embeds: [embed] });
  const confirm = await message.channel.send('✅ Parceria anunciada!');
  deleteAfter(message.channel, confirm);
  return sent;
}

// !boasvindas @user [mensagem]
async function handleBoasVindas(message, args) {
  const user = message.mentions.users.first();
  if (!user) {
    return message.reply('❌ Mencione alguém: `!boasvindas @user [mensagem opcional]`');
  }

  const customMsg = args.slice(1).join(' ') || 'Seja bem-vindo(a) à nossa comunidade!';

  const embed = new EmbedBuilder()
    .setColor(CONFIG.colors.success)
    .setTitle('🎉 Bem-vindo(a)!')
    .setDescription(
      `${user}, ${customMsg}\n\n` +
      `📜 Leia as regras em <#${message.channel.id}>\n` +
      `🎫 Qualquer dúvida, abra um ticket!`
    )
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setFooter({ text: `Vindra Code • Boas-vindas dadas por ${message.author.tag}` })
    .setTimestamp();

  try {
    await message.delete();
  } catch (e) {}

  const sent = await message.channel.send({ content: `${user}`, embeds: [embed] });
  const confirm = await message.channel.send('✅ Boas-vindas enviada!');
  deleteAfter(message.channel, confirm);
  return sent;
}

// !helpembed - Lista os comandos de embed
async function handleHelpEmbed(message) {
  const embed = new EmbedBuilder()
    .setColor(CONFIG.colors.primary)
    .setTitle('📚 Comandos de Embed - Vindra Code')
    .setDescription('Use estes comandos para enviar mensagens estilizadas (sem precisar de Nitro):')
    .addFields(
      {
        name: '📢 !anuncio',
        value: '`!anuncio <titulo> | <descrição> | [cor] | [imagem]`',
      },
      {
        name: '📜 !regras',
        value: '`!regras` (envia embed de regras no canal)',
      },
      {
        name: '💼 !vagas',
        value: '`!vagas <titulo> | <descrição> | [link]`',
      },
      {
        name: '🤝 !parceria',
        value: '`!parceria <nome> | <descrição> | [link]`',
      },
      {
        name: '🎉 !boasvindas',
        value: '`!boasvindas @user [mensagem]`',
      },
      {
        name: '❓ !helpembed',
        value: 'Mostra esta mensagem',
      }
    )
    .setFooter({ text: 'Vindra Code • Apenas staff pode usar estes comandos' })
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

// ============================================
// COMANDOS DE MENSAGEM (texto normal)
// ============================================

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).split(/ +/);
  const command = args.shift().toLowerCase();

  // !painel - Cria o painel de tickets
  if (command === 'painel' || command === 'ticket-panel') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas administradores podem usar este comando.');
    }
    try {
      await message.delete();
    } catch (e) {}
    await createTicketPanelMessage(message.channel, message.guild);
    return;
  }

  // !fechar - Fecha o ticket atual
  if (command === 'fechar' || command === 'ticket-close') {
    const ticket = Array.from(ticketData.values()).find(
      (t) => t.channelId === message.channel.id
    );

    if (!ticket) {
      return message.reply('❌ Este canal não é um ticket.');
    }

    await message.reply('🔒 Fechando ticket...');
    await closeTicket(message, ticket.id);
    return;
  }

  // !info - Mostra info do ticket
  if (command === 'info' || command === 'ticket-info') {
    const ticket = Array.from(ticketData.values()).find(
      (t) => t.channelId === message.channel.id
    );

    if (!ticket) {
      return message.reply('❌ Este canal não é um ticket.');
    }

    const infoEmbed = new EmbedBuilder()
      .setColor(CONFIG.colors.primary)
      .setTitle(`📋 Ticket #${ticket.id}`)
      .addFields(
        { name: 'Tipo', value: ticket.typeName, inline: true },
        { name: 'Status', value: ticket.status === 'open' ? '🟢 Aberto' : '🔴 Fechado', inline: true },
        { name: 'Usuário', value: `<@${ticket.userId}>`, inline: true },
        { name: 'Atendente', value: ticket.claimedBy ? `<@${ticket.claimedBy.id}>` : 'Nenhum', inline: true },
        { name: 'Criado em', value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:F>`, inline: true }
      )
      .setDescription(`📝 **Descrição:**\n${ticket.description}`);

    await message.reply({ embeds: [infoEmbed] });
    return;
  }

  // ===== Comandos de embed (apenas staff) =====
  const embedCommands = ['anuncio', 'regras', 'vagas', 'parceria', 'boasvindas', 'helpembed'];
  if (embedCommands.includes(command)) {
    if (!isStaff(message.member)) {
      return message.reply('❌ Apenas a staff pode usar comandos de embed.');
    }

    try {
      if (command === 'anuncio') await handleAnuncio(message, args);
      else if (command === 'regras') await handleRegras(message);
      else if (command === 'vagas') await handleVagas(message, args);
      else if (command === 'parceria') await handleParceria(message, args);
      else if (command === 'boasvindas') await handleBoasVindas(message, args);
      else if (command === 'helpembed') await handleHelpEmbed(message);
    } catch (error) {
      console.error(`❌ Erro no comando !${command}:`, error);
      try {
        await message.reply(`❌ Erro ao executar comando: ${error.message}`);
      } catch (e) {}
    }
  }
});

// ============================================
// LOGIN
// ============================================

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error('❌ Erro ao conectar:', error.message);
  console.log('\nVerifique se o DISCORD_TOKEN está configurado corretamente no arquivo .env');
});