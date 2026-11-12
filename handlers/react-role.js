const {
  PermissionFlagsBits, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js')

const DANGEROUS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.MentionEveryone,
]

function roleProblem(role, guild, setupMember = null) {
  if (!role) return 'role no longer exists'
  if (role.id === guild.id) return '@everyone cannot be used'
  if (role.managed) return 'managed by a bot/integration'
  if (role.position >= guild.members.me.roles.highest.position) return 'higher than my top role'
  if (role.permissions.any(DANGEROUS)) return 'has dangerous permissions'
  if (
    setupMember &&
    guild.ownerId !== setupMember.id &&
    role.position >= setupMember.roles.highest.position
  ) return 'higher than your top role'
  return null
}

function buildRoleRows(roles) {
  const buttons = roles.map(role => {
    const b = new ButtonBuilder()
      .setCustomId(`rr:${role.id}`)
      .setLabel(role.name.slice(0, 80))
      .setStyle(ButtonStyle.Secondary)
    if (role.unicodeEmoji) b.setEmoji(role.unicodeEmoji)
    return b
  })

  const rows = []
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)))
  }
  return rows
}

async function handleRoleButton(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const roleId = interaction.customId.split(':')[1]
  const { guild, member } = interaction
  const role = guild.roles.cache.get(roleId)

  const problem = roleProblem(role, guild)
  if (problem) {
    return interaction.editReply(`I can't give you that role right now (${problem}). Please tell an admin.`)
  }

  try {
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(role, 'Role panel')
      return interaction.editReply({ content: `Removed ${role}.`, allowedMentions: { parse: [] } })
    }
    await member.roles.add(role, 'Role panel')
    return interaction.editReply({ content: `You now have ${role}.`, allowedMentions: { parse: [] } })
  } catch (err) {
    console.error(err)
    return interaction.editReply('Something went wrong. Please tell an admin.')
  }
}

module.exports = { roleProblem, buildRoleRows, handleRoleButton }