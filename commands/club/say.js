const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js')

module.exports = {
    // guilds: ['YOUR_GUILD_ID'],
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Say whatever you want!!')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setContexts(0)
        .addStringOption(o => o
            .setName('message')
            .setDescription('The message you want the bot to say')
            .setMaxLength(2000)
            .setRequired(true))
        .addChannelOption(o => o
            .setName('channel')
            .setDescription('Channel to send it to (default: this channel)')
            .addChannelTypes(0, 5)), 

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: 'No permission.', flags: MessageFlags.Ephemeral })
        }

        const message = interaction.options.getString('message', true)
        const target = interaction.options.getChannel('channel') ?? interaction.channel

        try {
            await target.send({
                content: message,
                allowedMentions: { parse: [] }, 
            })
        } catch (err) {
            console.error(err)
            return interaction.reply({
                content: `I can't send messages in ${target}. Check my permissions there.`,
                flags: MessageFlags.Ephemeral,
            })
        }

        return interaction.reply({ content: 'Done!', flags: MessageFlags.Ephemeral })
    },
}