const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  PermissionFlagsBits, MessageFlags,
} = require('discord.js')
const triviaDb = require('./triviaDB')

const LABELS = { tech: 'Tech/AI', general: 'General' }
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

// customId: trivdel:yes:<id>  |  trivdel:no:<id>
function buildConfirm(row) {
  const embed = new EmbedBuilder()
    .setTitle(`Delete trivia #${row.id}?`)
    .setColor(0xed4245)
    .addFields(
      { name: 'Category', value: LABELS[row.category] ?? row.category },
      { name: 'Question', value: cut(row.question, 1024) },
      { name: 'Answer', value: cut(row.answer, 1024) },
    )

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`trivdel:yes:${row.id}`).setLabel('Delete').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`trivdel:no:${row.id}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  )

  return { embeds: [embed], components: [buttons] }
}

async function handleTriviaDeleteButton(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: 'No permission.', flags: MessageFlags.Ephemeral })
  }

  const [, action, idStr] = interaction.customId.split(':')
  const id = Number(idStr)

  if (action === 'no') {
    return interaction.update({ content: 'Cancelled.', embeds: [], components: [] })
  }

  if (action === 'yes') {
    const ok = triviaDb.remove(id)
    return interaction.update({
      content: ok ? `Trivia #${id} deleted.` : `Trivia #${id} was already gone.`,
      embeds: [],
      components: [],
    })
  }
}

module.exports = { buildConfirm, handleTriviaDeleteButton }