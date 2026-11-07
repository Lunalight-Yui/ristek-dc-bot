const {SlashCommandBuilder, MessageFlags} = require('discord.js')
const channel_id = '1566038113007177798'

module.exports = {
    guilds: ['1494905319690735786'],
    data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Giving any suggestion of whatever you want')
    .addStringOption(o =>
        o.setName('text')
        .setDescription('Input your suggestion in here!')
        .setRequired(true)
        .setMaxLength(1000)
    ),
    async execute(interaction) {
        const suggest = interaction.options.getString('text', true).trim()

        const channel = await interaction.guild.channels.fetch(channel_id).catch(() => null)
        if (!channel?.isTextBased()) {
      return interaction.reply({ content: 'Target channel not found.', flags: MessageFlags.Ephemeral })
    }

    try {
      await channel.send({ //${interaction.user} (\`${interaction.user.id}\`)
        content: `New submission from anonymous:\n>>> ${suggest}`,
        allowedMentions: { parse: [] }, 
      })
    } catch (err) {
      console.error(err)
      return interaction.reply({ content: 'Failed to send. Check bot permissions.', flags: MessageFlags.Ephemeral })
    }

    return interaction.reply({ content: 'Sent!', flags: MessageFlags.Ephemeral })
  },
}
