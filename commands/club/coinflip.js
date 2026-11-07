const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const { onlyIn } = require('../../handlers/command-guard')

const allow_channel = {
  '1494905319690735786': ['1497438284702416907'],
}

module.exports = {
  guilds: ['1494905319690735786'],
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription("Let's play 50:50, are ya winning son?")
    .setContexts(0)
    .addStringOption(o =>
      o.setName('guess')
        .setDescription('Guess the side (Heads or Tails)')
        .setRequired(true)
        .addChoices(
          { name: 'Heads', value: 'heads' },
          { name: 'Tails', value: 'tails' },
        )),

  async execute(interaction) {
    if (!onlyIn(allow_channel, interaction)) return

    const guess = interaction.options.getString('guess', true)
    if (!['heads', 'tails'].includes(guess)) {
      return interaction.reply({ content: 'Invalid guess.', flags: MessageFlags.Ephemeral })
    }

    const result = Math.random() < 0.5 ? 'heads' : 'tails'
    const win = guess === result

    return interaction.reply(
      `🪙 The coin landed on **${result}**!\n` +
      `You guessed **${guess}**, ${win ? 'you win! 🎉' : 'you lose 😢'}`,
    )
  },
}