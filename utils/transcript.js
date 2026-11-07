const { AttachmentBuilder } = require('discord.js')

async function fetchAllMessages(channel) {
  const all = []
  let before
  while (true) {
    const batch = await channel.messages.fetch({ limit: 100, before })
    if (!batch.size) break
    all.push(...batch.values())
    before = batch.last().id
  }
  return all.reverse() 
}

async function createTranscript(channel) {
  const messages = await fetchAllMessages(channel)

  const lines = messages.map(m => {
    const time = m.createdAt.toISOString().replace('T', ' ').slice(0, 19)
    let line = `[${time}] ${m.author.tag}: ${m.content || ''}`
    if (m.attachments.size) {
      line += '\n    Attachments: ' + m.attachments.map(a => a.url).join(', ')
    }
    if (m.embeds.length && !m.content) line += '(embed)'
    return line
  })

  const header = `Transcript of #${channel.name}\nMessages: ${messages.length}\n${'-'.repeat(40)}\n`
  return new AttachmentBuilder(Buffer.from(header + lines.join('\n'), 'utf8'), {
    name: `transcript-${channel.name}.txt`,
  })
}

module.exports = { createTranscript }