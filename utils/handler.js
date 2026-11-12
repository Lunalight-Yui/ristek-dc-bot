const { Events, MessageFlags, ActivityType } = require('discord.js')
const { handleTicketButton } = require('../handlers/ticket-handler')
const { handleTriviaButton, handleTriviaModal } = require('../handlers/trivia/trivia-handler')
const { handleTriviaListButton } = require('../handlers/trivia/trivia-list')
const { handleTriviaDeleteButton } = require('../handlers/trivia/trivia-delete')
const { handleRoleButton } = require('../handlers/react-role')
const { registerWelcome } = require('../handlers/welcome/welcome')
const eventReminders = require('./event-reminders')

async function replyError(interaction, error) {
    console.error(error)
    const payload = { content: 'Error!', flags: [MessageFlags.Ephemeral] }
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {})
    } else {
        await interaction.reply(payload).catch(() => {})
    }
}

function handler(client) {
    client.once(Events.ClientReady, () => {
        console.log(`login as ${client.user.tag}`);
        eventReminders.start(client)
        registerWelcome(client)

        client.user.setPresence({
            activities: [{
                name: 'Service as always!',
                type: ActivityType.Playing
            }],
            status: 'idle',
        })
    })

    client.on(Events.InteractionCreate, async (interaction) => {

        if (interaction.isButton()) {
            try {
                const id = interaction.customId

                if (id.startsWith('ticket_')) return await handleTicketButton(interaction)
                if (id.startsWith('trivia_')) return await handleTriviaButton(interaction)
                if (id.startsWith('trivlist:')) return await handleTriviaListButton(interaction)
                if (id.startsWith('trivdel:')) return await handleTriviaDeleteButton(interaction)
                if (id.startsWith('rr:')) return await handleRoleButton(interaction)
            } catch (error) {
                await replyError(interaction, error)
            }
            return
        }

        if (interaction.isModalSubmit()) {
            try {
                if (interaction.customId.startsWith('trivia_modal:')) {
                    return await handleTriviaModal(interaction)
                }
            } catch (error) {
                await replyError(interaction, error)
            }
            return
        }

        if (!interaction.isChatInputCommand()) return;
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'Error executing command!', flags: [MessageFlags.Ephemeral] });
            } else {
                await interaction.reply({ content: 'Error executing command!', flags: [MessageFlags.Ephemeral] });
            }
        }
    })
}

module.exports = handler