const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  PermissionFlagsBits, MessageFlags,
} = require('discord.js')
const triviaDb = require('./triviaDB')

const PAGE_SIZE = 5
const LABELS = { tech: 'Tech/AI', general: 'General', all: 'All' }
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

function buildListPage(category, page) {
  const total = triviaDb.count(category)
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  page = Math.min(Math.max(page, 0), pages - 1) 

  const rows = triviaDb.list(category, PAGE_SIZE, page * PAGE_SIZE)

  const embed = new EmbedBuilder()
    .setTitle(`Trivia list (${LABELS[category] ?? category})`)
    .setColor(0xfee75c)
    .setFooter({ text: `Page ${page + 1}/${pages} • ${total} total` })

  if (!rows.length) {
    embed.setDescription('No trivia yet. Add one with `/addtriv`.')
  } else {
    embed.addFields(rows.map(r => ({
      name: `#${r.id} • ${LABELS[r.category] ?? r.category}`,
      value: cut(`**Q:** ${r.question}\n**A:** ${r.answer}`, 1024),
    })))
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`trivlist:${category}:${page - 1}`)
      .setLabel('Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`trivlist:${category}:${page + 1}`)
      .setLabel('Next')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= pages - 1),
  )

  return { embeds: [embed], components: [row] }
}

async function handleTriviaListButton(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: 'No permission.', flags: MessageFlags.Ephemeral })
  }
  const [, category, page] = interaction.customId.split(':')
  return interaction.update(buildListPage(category, Number(page)))
}

module.exports = { buildListPage, handleTriviaListButton }