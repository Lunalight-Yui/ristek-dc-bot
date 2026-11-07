const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js')
const triviaDb = require('../../handlers/trivia/triviaDB')

module.exports = {
  guilds: ['1299390542630617098'],
  data: new SlashCommandBuilder()
    .setName('addtriv')
    .setDescription('Add a trivia question')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setContexts(0)
    .addStringOption(o => o.setName('category').setDescription('Category').setRequired(true)
      .addChoices({ name: 'Tech/AI', value: 'tech' }, { name: 'General', value: 'general' }))
    .addStringOption(o => o.setName('question').setDescription('Question')
      .setRequired(true).setMinLength(5).setMaxLength(300))
    .addStringOption(o => o.setName('answer').setDescription('Answer (use | for alternatives)')
      .setRequired(true).setMinLength(1).setMaxLength(100)),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'No permission.', flags: MessageFlags.Ephemeral })
    }
    const id = triviaDb.add(
      interaction.options.getString('category', true),
      interaction.options.getString('question', true).trim(),
      interaction.options.getString('answer', true).trim(),
      interaction.user.id,
    )
    return interaction.reply({ content: `Added trivia #${id}.`, flags: MessageFlags.Ephemeral })
  },
}