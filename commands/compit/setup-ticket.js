const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder,
} = require('discord.js')

module.exports = {
  guilds: ['1550929122140885105', '1494905319690735786'],
  data: new SlashCommandBuilder()
    .setName('setup-ticket')
    .setDescription('Sending ticket panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator || PermissionFlagsBits.ManageChannels)
    .setContexts(0)
    // ===== required first =====
    .addChannelOption(o =>
      o.setName('category')
        .setDescription('Category where tickets (and the new panel channel) will be')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true))
    .addRoleOption(o =>
      o.setName('staff')
        .setDescription('Staff role that can see tickets')
        .setRequired(true))
    .addChannelOption(o =>
      o.setName('transcript-channel')
        .setDescription('Channel where ticket transcripts are sent')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .addBooleanOption(o =>
      o.setName('create-channel')
        .setDescription('True: create a new channel in the category. False: use this channel')
        .setRequired(true))
    // ===== optional =====
    .addRoleOption(o =>
      o.setName('staff-2')
        .setDescription('Second staff role (optional)'))
    .addStringOption(o =>
      o.setName('channel-name')
        .setDescription('Name of the new channel (only used if create-channel is true)')
        .setMaxLength(100))
    .addStringOption(o =>
      o.setName('title').setDescription('panel title').setMaxLength(100))
    .addStringOption(o =>
      o.setName('description').setDescription('panel description').setMaxLength(1000)),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator || PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: 'You do not have this permission', flags: MessageFlags.Ephemeral })
    }

    const category = interaction.options.getChannel('category')
    const staff = interaction.options.getRole('staff')
    const staff2 = interaction.options.getRole('staff-2')
    const transcriptChannel = interaction.options.getChannel('transcript-channel')
    const createNew = interaction.options.getBoolean('create-channel')
    const channelName = interaction.options.getString('channel-name')
    const title = interaction.options.getString('title') ?? 'Support'
    const description = interaction.options.getString('description')
      ?? 'Click below button to create ticket'

    // Set removes duplicates if the same role is picked twice
    const staffIds = [...new Set([staff.id, staff2?.id].filter(Boolean))].join(',')

    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    try {
      let target

      if (createNew) {
        target = await interaction.guild.channels.create({
          name: (channelName ?? `ticket-${category.name}`).slice(0, 100),
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: [
            {
              id: interaction.guild.id, // everyone: view only
              allow: [PermissionFlagsBits.ReadMessageHistory],
              deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.CreatePrivateThreads, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.ManageThreads],
            },
            {
              id: interaction.client.user.id, // bot can still send
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
              ],
            },
          ],
          reason: `Ticket panel by ${interaction.user.tag}`,
        })
      } else {
        target = interaction.channel
      }

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(0x57f287)

      // format: ticket_open:<categoryId>:<transcriptChannelId>:<roleId>[,<roleId>]
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_open:${category.id}:${transcriptChannel.id}:${staffIds}`)
          .setLabel('Create ticket')
          .setEmoji('📩')
          .setStyle(ButtonStyle.Secondary),
      )

      await target.send({ embeds: [embed], components: [row] })

      await interaction.editReply(
        `Panel sent to ${target}. Tickets will be created in **${category.name}**, ` +
        `transcripts go to ${transcriptChannel}.` +
        (!createNew && channelName ? '\n(`channel-name` was ignored because `create-channel` is false.)' : ''),
      )
    } catch (err) {
      console.error(err)
      await interaction.editReply(
        'Failed to create panel. Check bot permissions (Manage Channels, Send Messages, Embed Links).',
      )
    }
  },
}