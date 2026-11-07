const {
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags,
} = require('discord.js')
const triviaDb = require('./triviaDB')

const attempted = new Map() 
const solved = new Set()    

async function handleTriviaButton(interaction) {
  const id = interaction.customId.split(':')[1]

  if (solved.has(interaction.message.id)) {
    return interaction.reply({ content: 'Already solved!', flags: MessageFlags.Ephemeral })
  }
  if (attempted.get(interaction.message.id)?.has(interaction.user.id)) {
    return interaction.reply({ content: 'You already tried this one.', flags: MessageFlags.Ephemeral })
  }

  const modal = new ModalBuilder()
    .setCustomId(`trivia_modal:${id}`)
    .setTitle('Your answer')
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('answer')
        .setLabel('Answer')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setRequired(true),
    ))

  return interaction.showModal(modal)
}

async function handleTriviaModal(interaction) {
  const row = triviaDb.get(Number(interaction.customId.split(':')[1]))
  if (!row) {
    return interaction.reply({ content: 'Question not found.', flags: MessageFlags.Ephemeral })
  }

  const msgId = interaction.message?.id
  if (solved.has(msgId)) {
    return interaction.reply({ content: 'Someone already solved it.', flags: MessageFlags.Ephemeral })
  }

  const input = interaction.fields.getTextInputValue('answer')

  if (triviaDb.isCorrect(row, input)) {
    solved.add(msgId)
    await interaction.message.edit({ components: [] }).catch(() => {}) // remove the button
    return interaction.reply({
      content: `${interaction.user} got it right! The answer was **${row.answer.split('|')[0]}** 🎉`,
      allowedMentions: { parse: [] },
    })
  }

  if (!attempted.has(msgId)) attempted.set(msgId, new Set())
  attempted.get(msgId).add(interaction.user.id)
  return interaction.reply({ content: 'Not quite, better luck next time!', flags: MessageFlags.Ephemeral })
}

module.exports = { handleTriviaButton, handleTriviaModal }