const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, RoleSelectMenuBuilder,
} = require('discord.js')
const { roleProblem, buildRoleRows } = require('../../handlers/react-role.js')

const SETUP_TIMEOUT = 5 * 60_000

module.exports = {
  data: new SlashCommandBuilder()
    .setName('react-role')
    .setDescription('Post a role panel: members click a button to get or remove a role')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setContexts(0)
    .addChannelOption(o =>
      o.setName('channel')
        .setDescription('Channel where the panel will be posted')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .addStringOption(o =>
      o.setName('title').setDescription('Panel title').setMaxLength(100))
    .addStringOption(o =>
      o.setName('description').setDescription('Panel description').setMaxLength(1000)),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ content: 'No permission.', flags: MessageFlags.Ephemeral })
    }

    const { guild, member } = interaction
    const target = interaction.options.getChannel('channel', true)
    const title = interaction.options.getString('title') ?? 'Pick your roles'
    const description = interaction.options.getString('description')
      ?? 'Click a button to get a role. Click it again to remove it.'

    if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ content: 'I need the **Manage Roles** permission.', flags: MessageFlags.Ephemeral })
    }
    const needed = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]
    if (!target.permissionsFor(guild.members.me)?.has(needed)) {
      return interaction.reply({
        content: `I can't post in ${target}. I need View Channel, Send Messages and Embed Links there.`,
        flags: MessageFlags.Ephemeral,
      })
    }

    let selected = []

    const problems = () => new Map(
      selected.map(id => [id, roleProblem(guild.roles.cache.get(id), guild, member)]),
    )

    function render() {
      const p = problems()
      const lines = selected.map(id => (p.get(id) ? `<@&${id}> ⚠️ ${p.get(id)}` : `<@&${id}>`))
      const hasProblem = [...p.values()].some(Boolean)

      const menu = new RoleSelectMenuBuilder()
        .setCustomId('rrsetup_roles')
        .setPlaceholder('Select the roles for your panel')
        .setMinValues(1)
        .setMaxValues(25)
      if (selected.length) menu.setDefaultRoles(selected)

      return {
        embeds: [
          new EmbedBuilder()
            .setTitle('Select the roles for this panel')
            .setDescription(
              `The panel will be posted in ${target}.\n\n` +
              'Use the dropdown to pick up to 25 roles.\n' +
              '*Not seeing a role? Try searching for it inside the dropdown.*',
            )
            .setColor(0x5865f2),
          new EmbedBuilder()
            .setTitle('Selected role(s)')
            .setDescription(lines.join('\n') || 'None yet')
            .setColor(hasProblem ? 0xed4245 : 0x57f287),
        ],
        components: [
          new ActionRowBuilder().addComponents(menu),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('rrsetup_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId('rrsetup_save')
              .setLabel('Save & Post')
              .setStyle(ButtonStyle.Success)
              .setDisabled(!selected.length || hasProblem),
          ),
        ],
      }
    }

    await interaction.reply({ ...render(), flags: MessageFlags.Ephemeral })
    const message = await interaction.fetchReply()

    const collector = message.createMessageComponentCollector({
      time: SETUP_TIMEOUT,
      filter: i => i.user.id === interaction.user.id,
    })

    collector.on('collect', async i => {
      if (i.isRoleSelectMenu()) {
        selected = [...i.values]
        return i.update(render())
      }

      if (i.customId === 'rrsetup_cancel') {
        collector.stop('cancel')
        return i.update({ content: 'Cancelled.', embeds: [], components: [] })
      }

      if (i.customId === 'rrsetup_save') {
        if (!selected.length || [...problems().values()].some(Boolean)) return i.update(render())

        const roles = selected
          .map(id => guild.roles.cache.get(id))
          .sort((a, b) => b.position - a.position)

        try {
          await target.send({
            embeds: [new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x5865f2)],
            components: buildRoleRows(roles),
          })
        } catch (err) {
          console.error(err)
          return i.update({ content: `Could not post in ${target}. Check my permissions there.`, ...render() })
        }

        collector.stop('done')
        return i.update({ content: `Panel posted in ${target}.`, embeds: [], components: [] })
      }
    })

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        interaction
          .editReply({ content: 'Timed out. Run `/react-role` again.', embeds: [], components: [] })
          .catch(() => {})
      }
    })
  },
}