const { Events, EmbedBuilder } = require('discord.js')
const welcomeDb = require('./welcome-db')

const DEFAULT_TITLE = 'Welcome to {server}!'
const DEFAULT_MESSAGE = "Hi {user}, glad you're here!"
const DEFAULT_FOOTER = 'Member #{count}'

function fill(text, member, rich = true) {
  const ts = Math.floor((member.joinedTimestamp ?? Date.now()) / 1000)
  const plain = new Date(ts * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
  return text
    .replaceAll('{user}', rich ? `${member}` : member.user.username)
    .replaceAll('{server}', member.guild.name)
    .replaceAll('{count}', String(member.guild.memberCount))
    .replaceAll('{joined_ago}', rich ? `<t:${ts}:R>` : plain)
    .replaceAll('{joined}', rich ? `<t:${ts}:F>` : plain)
}

function buildWelcome(member, cfg) {
  return {
    content: `${member}`,
    embeds: [
      new EmbedBuilder()
        .setTitle(fill(cfg.title, member, false).slice(0, 256))
        .setDescription(fill(cfg.message, member).slice(0, 4000))
        .setThumbnail(member.user.displayAvatarURL())
        .setColor(0x57f287)
        .setFooter({ text: fill(cfg.footer ?? DEFAULT_FOOTER, member, false).slice(0, 2048) })
        .setTimestamp(member.joinedTimestamp ?? Date.now()), 
    ],
    allowedMentions: { users: [member.id] }, 
  }
}

function registerWelcome(client) {
  client.on(Events.GuildMemberAdd, async member => {
    if (member.user.bot) return

    const cfg = welcomeDb.get(member.guild.id) 
    if (!cfg) return

    const channel = await member.guild.channels.fetch(cfg.channel_id).catch(() => null)
    if (!channel?.isTextBased()) {
      return console.warn(`[welcome] channel ${cfg.channel_id} not found in ${member.guild.name}`)
    }

    await channel
      .send(buildWelcome(member, cfg))
      .catch(err => console.error('[welcome] failed to send:', err))
  })
}

module.exports = { registerWelcome, buildWelcome, DEFAULT_TITLE, DEFAULT_MESSAGE, DEFAULT_FOOTER }