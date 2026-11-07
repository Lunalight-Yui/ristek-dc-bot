const Database = require('better-sqlite3')
const fs = require('node:fs')
const path = require('node:path')
const { PermissionFlagsBits } = require('discord.js')

const dataDirectory = path.join(__dirname, '../data')
fs.mkdirSync(dataDirectory, { recursive: true })
const db = new Database(path.join(dataDirectory, 'events.db'))

db.exec(`
    CREATE TABLE IF NOT EXISTS event_reminders (
        event_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        event_name TEXT NOT NULL,
        description TEXT NOT NULL,
        audience TEXT NOT NULL,
        role_ids TEXT NOT NULL,
        starts_at INTEGER NOT NULL,
        remind_at INTEGER NOT NULL,
        interval_minutes INTEGER NOT NULL,
        sent_at INTEGER,
        PRIMARY KEY (event_id, remind_at)
    );
    CREATE INDEX IF NOT EXISTS idx_event_reminders_pending
        ON event_reminders (sent_at, remind_at);
`)

const insertReminders = db.transaction(event => {
    const insert = db.prepare(`
        INSERT INTO event_reminders (
            event_id, guild_id, channel_id, event_name, description,
            audience, role_ids, starts_at, remind_at, interval_minutes
        ) VALUES (
            @eventId, @guildId, @channelId, @name, @description,
            @audience, @roleIds, @startsAt, @remindAt, @intervalMinutes
        )
    `)

    for (const reminder of event.reminders) {
        insert.run({
            ...event,
            roleIds: JSON.stringify(event.roleIds),
            ...reminder,
        })
    }
})

async function sendReminder(client, reminder) {
    const guild = client.guilds.cache.get(reminder.guild_id)
        || await client.guilds.fetch(reminder.guild_id)
    const channel = await guild.channels.fetch(reminder.channel_id)
    if (!channel?.isTextBased() || typeof channel.send !== 'function') {
        throw new Error(`Reminder channel ${reminder.channel_id} is missing or is not text-based.`)
    }

    const permissions = channel.permissionsFor(guild.members.me)
    if (!permissions?.has(PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages)) {
        throw new Error(`Missing permission to send reminders in channel ${reminder.channel_id}.`)
    }

    const roleIds = JSON.parse(reminder.role_ids)
    const roleMentions = roleIds.map(id => `<@&${id}>`).join(' ')
    const timestamp = Math.floor(reminder.starts_at / 1000)
    const description = reminder.description ? `\n${reminder.description}` : ''
    const audience = `Audience: **${reminder.audience}**`
    const message = await channel.send({
        content:
            `${roleMentions}\n⏰ Reminder: **${reminder.event_name}** starts ` +
            `<t:${timestamp}:R> (<t:${timestamp}:F>).\n${audience}${description}\n` +
            `https://discord.com/events/${reminder.guild_id}/${reminder.event_id}`,
        allowedMentions: { parse: [], roles: roleIds },
    })
    return message
}

async function processDueReminders(client) {
    const now = Date.now()
    db.prepare('DELETE FROM event_reminders WHERE sent_at IS NULL AND starts_at <= ?').run(now)
    const due = db.prepare(`
        SELECT * FROM event_reminders
        WHERE sent_at IS NULL AND remind_at <= ? AND starts_at > ?
        ORDER BY remind_at
    `).all(now, now)

    for (const reminder of due) {
        try {
            await sendReminder(client, reminder)
            db.prepare(`
                UPDATE event_reminders
                SET sent_at = ?
                WHERE event_id = ? AND remind_at = ? AND sent_at IS NULL
            `).run(Date.now(), reminder.event_id, reminder.remind_at)
        } catch (error) {
            console.error(
                `[event reminders] Failed reminder for event ${reminder.event_id}:`,
                error
            )
        }
    }
}

let schedulerStarted = false
let processing = false

function start(client) {
    if (schedulerStarted) return
    schedulerStarted = true

    const tick = async () => {
        if (processing) return
        processing = true
        try {
            await processDueReminders(client)
        } catch (error) {
            console.error('[event reminders] Scheduler failed:', error)
        } finally {
            processing = false
        }
    }

    void tick()
    const timer = setInterval(tick, 30_000)
    timer.unref()
}

module.exports = {
    schedule: event => insertReminders(event),
    start,
}
