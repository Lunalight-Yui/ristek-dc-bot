const Database = require('better-sqlite3')
const fs = require('node:fs')
const path = require('node:path')

const dir = path.join(__dirname, '../../data')
fs.mkdirSync(dir, { recursive: true })
const db = new Database(path.join(dir, 'trivia.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS trivia (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    added_by TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  )
`)

const normalize = s =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
   .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()

module.exports = {
  add: (category, question, answer, userId) =>
    db.prepare('INSERT INTO trivia (category, question, answer, added_by) VALUES (?, ?, ?, ?)')
      .run(category, question, answer, userId).lastInsertRowid,

  random: category =>
    db.prepare('SELECT * FROM trivia WHERE category = ? ORDER BY RANDOM() LIMIT 1').get(category),

  get: id => db.prepare('SELECT * FROM trivia WHERE id = ?').get(id),

  // jumlah soal ('all' = semua kategori)
  count: category =>
    category === 'all'
      ? db.prepare('SELECT COUNT(*) AS n FROM trivia').get().n
      : db.prepare('SELECT COUNT(*) AS n FROM trivia WHERE category = ?').get(category).n,

  // daftar soal per halaman ('all' = semua kategori)
  list: (category, limit, offset) =>
    category === 'all'
      ? db.prepare('SELECT * FROM trivia ORDER BY id LIMIT ? OFFSET ?').all(limit, offset)
      : db.prepare('SELECT * FROM trivia WHERE category = ? ORDER BY id LIMIT ? OFFSET ?').all(category, limit, offset),

  // hapus soal berdasarkan id, return true kalau ada yang terhapus
  remove: id => db.prepare('DELETE FROM trivia WHERE id = ?').run(id).changes > 0,

  // jawaban boleh banyak alias, dipisah "|"  (contoh: "js|javascript")
  isCorrect: (row, input) =>
    row.answer.split('|').map(normalize).includes(normalize(input)),
}