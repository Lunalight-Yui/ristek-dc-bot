const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js')
const triviaDb = require('../../handlers/trivia/triviaDB')
const { onlyIn } = require('../../handlers/command-guard')

const allow_channel = {
  '1494905319690735786': ['1497438284702416907'],
}

module.exports = {
  guilds: ['1494905319690735786'],
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Get a random trivia question')
    .setContexts(0)
    .addStringOption(o => o.setName('category').setDescription('Category').setRequired(true)
      .addChoices({ name: 'Tech/AI', value: 'tech' }, { name: 'General', value: 'general' })),

  async execute(interaction) {
    if (!onlyIn(allow_channel, interaction)) return;

    const row = triviaDb.random(interaction.options.getString('category', true))
    if (!row) {
      return interaction.reply({ content: 'No trivia in this category yet.', flags: MessageFlags.Ephemeral })
    }

    const embed = new EmbedBuilder()
      .setTitle(`Trivia (${row.category})`)
      .setDescription(row.question)
      .setColor(0xfee75c)

    const button = new ButtonBuilder()
      .setCustomId(`trivia_answer:${row.id}`)
      .setLabel('Answer')
      .setStyle(ButtonStyle.Primary)

    return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] })
  },
}