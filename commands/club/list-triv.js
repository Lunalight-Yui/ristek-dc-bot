const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js')
const { buildListPage } = require('../../handlers/trivia/trivia-list')

module.exports = {
  guilds: ['1299390542630617098'],
  data: new SlashCommandBuilder()
    .setName('listtriv')
    .setDescription('List all trivia questions')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setContexts(0)
    .addStringOption(o =>
      o.setName('category')
        .setDescription('Filter by category (default: all)')
        .addChoices(
          { name: 'Tech/AI', value: 'tech' },
          { name: 'General', value: 'general' },
        )),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'No permission.', flags: MessageFlags.Ephemeral })
    }
    const category = interaction.options.getString('category') ?? 'all'
    return interaction.reply({ ...buildListPage(category, 0), flags: MessageFlags.Ephemeral })
  },
}