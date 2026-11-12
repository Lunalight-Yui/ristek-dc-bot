const Database = require('better-sqlite3')
const fs = require('node:fs')
const path = require('node:path')

const dir = path.join(__dirname, '../../data') 
fs.mkdirSync(dir, { recursive: true })
const db = new Database(path.join(dir, 'welcome.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS welcome (
    guild_id   TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    title      TEXT NOT NULL,
    message    TEXT NOT NULL
  )
`)

module.exports = {
  set: (guildId, channelId, title, message) =>
    db.prepare(`
      INSERT INTO welcome (guild_id, channel_id, title, message) VALUES (?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        channel_id = excluded.channel_id,
        title = excluded.title,
        message = excluded.message
    `).run(guildId, channelId, title, message),

  get: guildId => db.prepare('SELECT * FROM welcome WHERE guild_id = ?').get(guildId),

  remove: guildId => db.prepare('DELETE FROM welcome WHERE guild_id = ?').run(guildId).changes > 0,
}