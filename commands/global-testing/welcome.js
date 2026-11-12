const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags,
} = require('discord.js')
const welcomeDb = require('../../handlers/welcome/welcome-db')
const { buildWelcome, DEFAULT_TITLE, DEFAULT_MESSAGE } = require('../../handlers/welcome/welcome')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure the welcome message for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setContexts(0)
    .addSubcommand(s => s
      .setName('set')
      .setDescription('Set the welcome channel and message')
      .addChannelOption(o => o
        .setName('channel')
        .setDescription('Where welcome messages are sent')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
      .addStringOption(o => o
        .setName('title')
        .setDescription('Title. Placeholders: {server} {count}')
        .setMaxLength(200))
      .addStringOption(o => o
        .setName('message')
        .setDescription('Message. Placeholders: {user} {server} {count} {joined} {joined_ago}')
        .setMaxLength(1000))
      .addStringOption(o => o
        .setName('footer')
        .setDescription('Footer (join time is shown next to it). Default: Member #{count}')
        .setMaxLength(200)))
    .addSubcommand(s => s
      .setName('test')
      .setDescription('Preview the welcome message as if you just joined'))
    .addSubcommand(s => s
      .setName('off')
      .setDescription('Turn off the welcome message for this server')),
 
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: 'No permission.', flags: MessageFlags.Ephemeral })
    }
 
    const { guild } = interaction
    const sub = interaction.options.getSubcommand()
 
    if (sub === 'set') {
      const channel = interaction.options.getChannel('channel', true)
      const title = interaction.options.getString('title') ?? DEFAULT_TITLE
      const message = interaction.options.getString('message') ?? DEFAULT_MESSAGE
      const footer = interaction.options.getString('footer') ?? DEFAULT_FOOTER
 
      const needed = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]
      if (!channel.permissionsFor(guild.members.me)?.has(needed)) {
        return interaction.reply({
          content: `I can't post in ${channel}. I need View Channel, Send Messages and Embed Links there.`,
          flags: MessageFlags.Ephemeral,
        })
      }
 
      welcomeDb.set(guild.id, channel.id, title, message, footer)
      return interaction.reply({
        content: `Welcome messages will be sent to ${channel}. Use \`/welcome test\` to preview.`,
        flags: MessageFlags.Ephemeral,
      })
    }
 
    const cfg = welcomeDb.get(guild.id)
 
    if (sub === 'off') {
      welcomeDb.remove(guild.id)
      return interaction.reply({
        content: cfg ? 'Welcome message turned off.' : 'Welcome message was not set up.',
        flags: MessageFlags.Ephemeral,
      })
    }
 
    if (sub === 'test') {
      if (!cfg) {
        return interaction.reply({ content: 'Not set up yet. Use `/welcome set` first.', flags: MessageFlags.Ephemeral })
      }
      const { content, embeds } = buildWelcome(interaction.member, cfg)
      return interaction.reply({ content, embeds, allowedMentions: { parse: [] }, flags: MessageFlags.Ephemeral })
    }
  },
}