const { SlashCommandBuilder, MessageFlags } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
    .setName('malas')
    .setDescription('Allowing you to command malas on bot and do some lazy stuff'),

    async execute(interaction) {
        interaction.channel.send('malas')
        return interaction.reply({ content:'done', flags: MessageFlags.Ephemeral})
        
    }
}