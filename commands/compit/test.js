const { SlashCommandBuilder } = require('discord.js')

module.exports = {
    guilds: ['1550929122140885105'], 
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('testing'),
    async execute(interaction ) {
		await interaction.reply({ content: 'test', fetchReply: true });
        // interaction.editReply(`Roundtrip latency: ${sent.createdTimestamp - interaction.createdTimestamp}ms`);
	}
}