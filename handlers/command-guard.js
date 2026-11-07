const { MessageFlags } = require('discord.js')

function onlyIn(allowed, interaction, { denyUnlisted = true } = {}) {
  const channels = allowed[interaction.guildId]

  if (!channels) {
    if (!denyUnlisted) return true 
    interaction.reply({ content: 'This command is not available in this server.', flags: MessageFlags.Ephemeral })
    return false
  }

  if (channels.includes(interaction.channelId)) return true

  interaction.reply({
    content: `Use this command in ${channels.map(id => `<#${id}>`).join(', ')} instead.`,
    flags: MessageFlags.Ephemeral,
  })
  return false
}

module.exports = { onlyIn }