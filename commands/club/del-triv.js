const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js')
const triviaDb = require('../../handlers/trivia/triviaDB')
const { buildConfirm } = require('../../handlers/trivia/trivia-delete')

module.exports = {
  guilds: ['1299390542630617098'],
  data: new SlashCommandBuilder()
    .setName('deltriv')
    .setDescription('Delete a trivia question by ID (see /listtriv)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setContexts(0)
    .addIntegerOption(o =>
      o.setName('id')
        .setDescription('Trivia ID shown in /listtriv')
        .setRequired(true)
        .setMinValue(1)),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'No permission.', flags: MessageFlags.Ephemeral })
    }

    const id = interaction.options.getInteger('id', true)
    const row = triviaDb.get(id)
    if (!row) {
      return interaction.reply({ content: `Trivia #${id} not found.`, flags: MessageFlags.Ephemeral })
    }

    return interaction.reply({ ...buildConfirm(row), flags: MessageFlags.Ephemeral })
  },
}