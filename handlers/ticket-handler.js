const {
  ChannelType, PermissionFlagsBits, MessageFlags,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder,
} = require('discord.js')
const { createTranscript } = require('../utils/transcript')

async function handleTicketButton(interaction) {
  const [action, categoryId, logChannelId, staffRoles] = interaction.customId.split(':')
  if (action === 'ticket_open') return openTicket(interaction, categoryId, logChannelId, staffRoles)
  if (action === 'ticket_close') return closeTicket(interaction)
  if (action === 'ticket_delete') return deleteTicket(interaction)
}

async function openTicket(interaction, categoryId, logChannelId, staffRoles) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  const { guild, user } = interaction

  const category = guild.channels.cache.get(categoryId)
  if (!category || category.type !== ChannelType.GuildCategory) {
    return interaction.editReply('Ticket category not found. Please contact an admin.')
  }

  const staffRoleIds = (staffRoles ?? '').split(',').filter(id => id && guild.roles.cache.has(id))
  if (!staffRoleIds.length) {
    return interaction.editReply('No valid staff roles configured. Please contact an admin.')
  }

  const existing = guild.channels.cache.find(
    c => c.parentId === categoryId && c.topic?.startsWith(`ticket:${user.id}:`),
  )
  if (existing) return interaction.editReply(`Here is your ticket: ${existing}`)

  if (category.children.cache.size >= 50) {
    return interaction.editReply('This category is full, please contact an admin.')
  }

  try {
    const channel = await guild.channels.create({
      name: `ticket-${user.username}`.slice(0, 100),
      type: ChannelType.GuildText,
      parent: categoryId,
      topic: `ticket:${user.id}:${staffRoleIds.join(',')}:${logChannelId}`,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
          ],
        },
        ...staffRoleIds.map(id => ({
          id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
          ],
        })),
        {
          id: interaction.client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
          ],
        },
      ],
      reason: `Ticket by ${user.tag}`,
    })

    const embed = new EmbedBuilder()
      .setTitle('Ticket opened')
      .setDescription(
        `Hello ${user}, please describe your problem. Staff will help you shortly.\n\n` +
        '*This conversation is saved as a transcript when the ticket is closed.*',
      )
      .setColor(0x5865f2)

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger),
    )

    await channel.send({
      content: `${user}`,
      embeds: [embed],
      components: [row],
      allowedMentions: { users: [user.id], roles: staffRoleIds },
    })

    await interaction.editReply(`Ticket created: ${channel}`)
  } catch (err) {
    console.error(err)
    await interaction.editReply('Cannot create a ticket in that category, please check the bot permissions.')
  }
}

async function closeTicket(interaction) {
  const { channel } = interaction

  if (!channel.topic?.startsWith('ticket:')) {
    return interaction.reply({ content: 'This is not an active ticket channel.', flags: MessageFlags.Ephemeral })
  }

  const [, ownerId, staffRoles, logChannelId] = channel.topic.split(':')
  const staffRoleIds = staffRoles.split(',')
  const isOwner = interaction.user.id === ownerId
  const isStaff = interaction.member.roles.cache.some(r => staffRoleIds.includes(r.id))

  if (!isOwner && !isStaff) {
    return interaction.reply({ content: 'You cannot close this ticket.', flags: MessageFlags.Ephemeral })
  }

  await interaction.deferReply()

  try {
    const logChannel = logChannelId
      ? await interaction.guild.channels.fetch(logChannelId).catch(() => null)
      : null
    if (!logChannel) {
      return interaction.editReply('Transcript channel not found. Please contact an admin.')
    }

    const file = await createTranscript(channel)
    await logChannel.send({
      content: `Ticket \`${channel.name}\` (owner: <@${ownerId}>) closed by ${interaction.user}.`,
      files: [file],
      allowedMentions: { parse: [] },
    })

    await channel.permissionOverwrites.edit(ownerId, { ViewChannel: false }).catch(() => {})

    await channel.edit({
      name: `closed-${channel.name.replace(/^ticket-/, '')}`.slice(0, 100),
      topic: `closed:${ownerId}:${staffRoles}:${logChannelId}`,
      reason: `Closed by ${interaction.user.tag}`,
    })

    await interaction.message.edit({ components: [] }).catch(() => {})

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_delete')
        .setLabel('Delete Channel')
        .setStyle(ButtonStyle.Danger),
    )

    await interaction.editReply({
      content: `Ticket closed by ${interaction.user}. Staff can delete this channel.`,
      components: [row],
    })
  } catch (err) {
    console.error(err)
    await interaction.editReply('Failed to close the ticket, please check the bot permissions.')
  }
}

async function deleteTicket(interaction) {
  const { channel } = interaction

  if (!channel.topic?.startsWith('closed:')) {
    return interaction.reply({ content: 'This ticket is not closed yet.', flags: MessageFlags.Ephemeral })
  }

  const staffRoleIds = channel.topic.split(':')[2].split(',')
  if (!interaction.member.roles.cache.some(r => staffRoleIds.includes(r.id))) {
    return interaction.reply({ content: 'Only staff can delete this channel.', flags: MessageFlags.Ephemeral })
  }

  await interaction.reply('Deleting this channel in 5 seconds...')
  setTimeout(
    () => channel.delete(`Deleted by ${interaction.user.tag}`).catch(console.error),
    5000,
  )
}

module.exports = { handleTicketButton }