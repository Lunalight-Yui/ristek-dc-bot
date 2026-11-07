const {
    SlashCommandBuilder,
    ChannelType,
    GuildScheduledEventEntityType,
    GuildScheduledEventPrivacyLevel,
    MessageFlags,
    PermissionFlagsBits,
} = require('discord.js')
const eventReminders = require('../../utils/event-reminders')

const TIMEZONES = {
    wib: { label: 'WIB (Jakarta)', zone: 'Asia/Jakarta' },
    wita: { label: 'WITA (Makassar)', zone: 'Asia/Makassar' },
    wit: { label: 'WIT (Jayapura)', zone: 'Asia/Jayapura' },
}

const AUDIENCES = {
    everyone: 'Public / Everyone',
    cysec: 'CySec Only',
    ai: 'AI Only',
    staff: 'Internal Staff Only',
}

function parseStartTime(dateInput, timeInput, timeZone) {
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput)
    const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeInput)
    if (!dateMatch || !timeMatch) {
        throw new Error('Use date format YYYY-MM-DD and 24-hour time format HH:mm.')
    }

    const [, year, month, day] = dateMatch.map(Number)
    const [, hour, minute] = timeMatch.map(Number)
    const desiredLocalTime = Date.UTC(year, month - 1, day, hour, minute)
    const dateCheck = new Date(desiredLocalTime)
    if (
        dateCheck.getUTCFullYear() !== year ||
        dateCheck.getUTCMonth() !== month - 1 ||
        dateCheck.getUTCDate() !== day
    ) {
        throw new Error('That date is not valid.')
    }

    let timestamp = desiredLocalTime
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    })

    for (let attempt = 0; attempt < 4; attempt++) {
        const parts = Object.fromEntries(
            formatter.formatToParts(new Date(timestamp))
                .filter(part => part.type !== 'literal')
                .map(part => [part.type, Number(part.value)])
        )
        const actualLocalTime = Date.UTC(
            parts.year, parts.month - 1, parts.day, parts.hour, parts.minute
        )
        const difference = desiredLocalTime - actualLocalTime
        if (difference === 0) return new Date(timestamp)
        timestamp += difference
    }

    throw new Error(`The selected local time does not exist in timezone "${timeZone}".`)
}

function parseReminders(input) {
    if (!input) return [24 * 60, 3 * 60]

    const values = input.split(',').map(value => value.trim().toLowerCase())
    const minutes = values.map(value => {
        const match = /^(\d+)(m|h|d)$/.exec(value)
        if (!match) {
            throw new Error('Reminder intervals must look like 15m, 1h, or 1d, separated by commas.')
        }

        const amount = Number(match[1])
        const multiplier = { m: 1, h: 60, d: 1440 }[match[2]]
        const total = amount * multiplier
        if (!Number.isSafeInteger(total) || total < 1 || total > 30 * 24 * 60) {
            throw new Error('Reminder intervals must be between 1 minute and 30 days.')
        }
        return total
    })

    return [...new Set(minutes)].sort((a, b) => b - a)
}

function formatReminder(minutes) {
    if (minutes % (24 * 60) === 0) return `${minutes / (24 * 60)}d`
    if (minutes % 60 === 0) return `${minutes / 60}h`
    return `${minutes}m`
}

async function getAnnouncementsChannel(guild) {
    const configuredId = process.env.EVENT_ANNOUNCEMENTS_CHANNEL_ID
    const channel = configuredId
        ? await guild.channels.fetch(configuredId)
        : guild.channels.cache.find(
            candidate => candidate.name === 'announcements' && candidate.isTextBased()
        )

    if (!channel?.isTextBased() || typeof channel.send !== 'function') {
        throw new Error(
            'Could not find a text #announcements channel. Set EVENT_ANNOUNCEMENTS_CHANNEL_ID or create that channel.'
        )
    }

    const permissions = channel.permissionsFor(guild.members.me)
    if (!permissions?.has(PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages)) {
        throw new Error('The bot needs View Channel and Send Messages permissions in #announcements.')
    }

    return channel
}

const createSubcommand = subcommand => subcommand
        .setName('create')
        .setDescription('Create a Discord server event with scheduled reminders')
        .addStringOption(option => option
            .setName('name')
            .setDescription('Event title')
            .setMaxLength(100)
            .setRequired(true))
        .addStringOption(option => option
            .setName('description')
            .setDescription('What the event is about')
            .setMaxLength(800)
            .setRequired(true))
        .addStringOption(option => option
            .setName('date')
            .setDescription('Event date (YYYY-MM-DD)')
            .setRequired(true))
        .addStringOption(option => option
            .setName('time')
            .setDescription('Event start time in 24-hour HH:mm format')
            .setRequired(true))
        .addStringOption(option => option
            .setName('audience')
            .setDescription('Who the announcement and role pings target')
            .addChoices(
                { name: 'Public / Everyone', value: 'everyone' },
                { name: 'CySec Only', value: 'cysec' },
                { name: 'AI Only', value: 'ai' },
                { name: 'Internal Staff Only', value: 'staff' },
            )
            .setRequired(true))
        .addStringOption(option => option
            .setName('timezone')
            .setDescription('Timezone of the date and time (default: WIB)')
            .addChoices(
                { name: 'WIB (Jakarta)', value: 'wib' },
                { name: 'WITA (Makassar)', value: 'wita' },
                { name: 'WIT (Jayapura)', value: 'wit' },
            )
            .setRequired(false))
        .addStringOption(option => option
            .setName('location')
            .setDescription('Room, address or meeting link (use this OR voice-channel)')
            .setMaxLength(100)
            .setRequired(false))
        .addChannelOption(option => option
            .setName('voice-channel')
            .setDescription('Discord voice/stage channel (use this OR location)')
            .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
            .setRequired(false))
        .addIntegerOption(option => option
            .setName('duration')
            .setDescription('Event duration in minutes (15-1440; default 60)')
            .setMinValue(15)
            .setMaxValue(1440)
            .setRequired(false))
        .addStringOption(option => option
            .setName('reminders')
            .setDescription('Custom reminder intervals, e.g. 1h,15m (replaces 24h/3h)')
            .setMaxLength(100)
            .setRequired(false))
        .addRoleOption(option => option.setName('role-1').setDescription('Role to ping in announcements').setRequired(false))
        .addRoleOption(option => option.setName('role-2').setDescription('Additional role to ping').setRequired(false))
        .addRoleOption(option => option.setName('role-3').setDescription('Additional role to ping').setRequired(false))
        .addRoleOption(option => option.setName('role-4').setDescription('Additional role to ping').setRequired(false))
        .addRoleOption(option => option.setName('role-5').setDescription('Additional role to ping').setRequired(false))
        .addRoleOption(option => option.setName('role-6').setDescription('Additional role to ping').setRequired(false))
        .addRoleOption(option => option.setName('role-7').setDescription('Additional role to ping').setRequired(false))
        .addRoleOption(option => option.setName('role-8').setDescription('Additional role to ping').setRequired(false))
        .addRoleOption(option => option.setName('role-9').setDescription('Additional role to ping').setRequired(false))
        .addRoleOption(option => option.setName('role-10').setDescription('Additional role to ping').setRequired(false))

module.exports = {
    guilds: ['1299390542630617098'],
    data: new SlashCommandBuilder()
        .setName('event')
        .setDescription('Create and manage Discord server events')
        .setContexts(0)
        .addSubcommand(createSubcommand)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

    async execute(interaction) {
        if (!interaction.inGuild() || !interaction.guild) {
            return interaction.reply({
                content: 'This command can only be used in a server.',
                flags: MessageFlags.Ephemeral,
            })
        }

        const name = interaction.options.getString('name', true).trim()
        const description = interaction.options.getString('description', true).trim()
        const date = interaction.options.getString('date', true)
        const time = interaction.options.getString('time', true)
        const tzKey = interaction.options.getString('timezone') ?? 'wib'
        const timeZone = (TIMEZONES[tzKey] ?? TIMEZONES.wib).zone
        const location = interaction.options.getString('location')?.trim()
        const voiceChannel = interaction.options.getChannel('voice-channel')
        const audience = interaction.options.getString('audience', true)
        const selectedRoles = Array.from({ length: 10 }, (_, index) =>
            interaction.options.getRole(`role-${index + 1}`)
        ).filter(Boolean)
        const roleIds = selectedRoles.map(role => role.id)

        if (Boolean(location) === Boolean(voiceChannel)) {
            return interaction.reply({
                content:
                    'Fill in exactly one of these:\n' +
                    '- `voice-channel`: the event happens in a Discord voice/stage channel\n' +
                    '- `location`: anywhere else, e.g. `Room B201` or a Google Meet / Zoom link',
                flags: MessageFlags.Ephemeral,
            })
        }
        if (audience !== 'everyone' && roleIds.length === 0) {
            return interaction.reply({
                content: 'Select at least one role to notify for the chosen audience.',
                flags: MessageFlags.Ephemeral,
            })
        }
        const botPermissions = interaction.guild.members.me?.permissions
        if (!botPermissions?.has(PermissionFlagsBits.ManageEvents)) {
            return interaction.reply({
                content: 'I need the **Manage Events** permission to create events.',
                flags: MessageFlags.Ephemeral,
            })
        }
        // pinging a non-mentionable role needs "Mention @everyone, @here and All Roles"
        const canPingAllRoles = botPermissions.has(PermissionFlagsBits.MentionEveryone)
        const unmentionableRoles = selectedRoles.filter(role => !role.mentionable)
        if (unmentionableRoles.length && !canPingAllRoles) {
            return interaction.reply({
                content:
                    `The bot cannot ping these roles because they are not mentionable: ` +
                    `${unmentionableRoles.map(role => `@${role.name}`).join(', ')}. ` +
                    'Make them mentionable, or give the bot the "Mention @everyone, @here and All Roles" permission.',
                flags: MessageFlags.Ephemeral,
            })
        }

        let startsAt
        let reminderMinutes
        let announcements
        try {
            startsAt = parseStartTime(date, time, timeZone)
            if (startsAt.getTime() <= Date.now()) {
                throw new Error('The event start time must be in the future.')
            }
            reminderMinutes = parseReminders(interaction.options.getString('reminders'))
            announcements = await getAnnouncementsChannel(interaction.guild)
        } catch (error) {
            return interaction.reply({
                content: error.message,
                flags: MessageFlags.Ephemeral,
            })
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        let event
        try {
            const duration = interaction.options.getInteger('duration') || 60
            const eventOptions = {
                name,
                description: `${description}\n\nTarget audience for announcements: ${AUDIENCES[audience]}. The Discord event itself is visible to all server members.`,
                scheduledStartTime: startsAt,
                scheduledEndTime: new Date(startsAt.getTime() + duration * 60_000),
                privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
                entityType: voiceChannel
                    ? GuildScheduledEventEntityType.Voice
                    : GuildScheduledEventEntityType.External,
                ...(voiceChannel
                    ? { channel: voiceChannel.id }
                    : { entityMetadata: { location } }),
            }
            event = await interaction.guild.scheduledEvents.create(eventOptions)
        } catch (error) {
            console.error('[event-create] Failed to create Discord event:', error)
            const reason =
                error.code === 50013 ? 'I am missing permissions (Manage Events, and View/Connect on the voice channel).'
                : error.code === 50035 ? 'Discord rejected some input. Check the name, description and location length.'
                : 'Something unexpected happened. Please try again.'
            return interaction.editReply(`Could not create the event. ${reason}`)
        }

        const now = Date.now()
        const reminders = reminderMinutes
            .map(minutes => ({
                remindAt: startsAt.getTime() - minutes * 60_000,
                intervalMinutes: minutes,
            }))
            .filter(reminder => reminder.remindAt > now)

        try {
            eventReminders.schedule({
                eventId: event.id,
                guildId: interaction.guildId,
                channelId: announcements.id,
                name,
                description,
                audience: AUDIENCES[audience],
                roleIds,
                startsAt: startsAt.getTime(),
                reminders,
            })
        } catch (error) {
            console.error('[event-create] Reminders could not be saved, rolling back event:', error)
            const rolledBack = await event.delete().then(() => true).catch(() => false)
            return interaction.editReply(
                rolledBack
                    ? 'Could not save the reminders, so the event was not created. Please try again.'
                    : `The event was created but its reminders could not be saved. Event ID: ${event.id}`
            )
        }

        const reminderSummary = reminders.length
            ? reminders.map(reminder => formatReminder(reminder.intervalMinutes)).join(', ')
            : 'No selected reminder interval remains before the start time.'
        return interaction.editReply(
            `Created [${name}](${event.url || `https://discord.com/events/${interaction.guildId}/${event.id}`}). ` +
            `Time: <t:${Math.floor(startsAt.getTime() / 1000)}:F> (${timeZone}). ` +
            `Reminders: ${reminderSummary}.`
        )
    },
}