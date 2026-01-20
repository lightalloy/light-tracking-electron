import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import os from 'os'

class TimeTrackingDB {
  constructor() {
    this.db = null
    this.init()
  }

  init() {
    // Get database path from environment variable or use default
    const dbPath = process.env.TIMETRAP_DB_PATH || path.join(os.homedir(), '.timetrap.db')
    
    // Resolve path (handle both absolute and relative paths)
    const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(dbPath)
    
    // Create directory if it doesn't exist
    const dbDir = path.dirname(resolvedPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    this.db = new Database(resolvedPath)
    this.db.pragma('journal_mode = WAL')

    // Create table if it doesn't exist (timetrap schema)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note VARCHAR(255),
        start TIMESTAMP,
        end TIMESTAMP,
        sheet VARCHAR(255)
      );
      CREATE INDEX IF NOT EXISTS idx_start ON entries(start);
      CREATE INDEX IF NOT EXISTS idx_note ON entries(note);
      CREATE INDEX IF NOT EXISTS idx_sheet ON entries(sheet);
    `)
  }

  startTimer(taskName) {
    const stmt = this.db.prepare(`
      INSERT INTO entries (note, start, sheet)
      VALUES (?, datetime('now', 'localtime'), 'default')
    `)
    const result = stmt.run(taskName)
    return result.lastInsertRowid
  }

  stopTimer() {
    // Find the active timer (end is NULL)
    const activeTimer = this.db.prepare(`
      SELECT id, start FROM entries WHERE end IS NULL AND sheet = 'default' ORDER BY id DESC LIMIT 1
    `).get()

    if (activeTimer) {
      const stmt = this.db.prepare(`
        UPDATE entries
        SET end = datetime('now', 'localtime')
        WHERE id = ?
      `)
      stmt.run(activeTimer.id)
      return true
    }
    return false
  }

  getActiveTimer() {
    return this.db.prepare(`
      SELECT id, note, start
      FROM entries
      WHERE end IS NULL AND sheet = 'default'
      ORDER BY id DESC
      LIMIT 1
    `).get()
  }

  getEntriesByDate(dateStr) {
    // dateStr format: 'YYYY-MM-DD'
    const stmt = this.db.prepare(`
      SELECT id, note, start, end, sheet
      FROM entries
      WHERE date(start) = ? AND sheet = 'default'
      ORDER BY start DESC
    `)
    return stmt.all(dateStr)
  }

  getStatsByDate(dateStr) {
    // Aggregate time by task for a given date
    // Calculate duration dynamically from start and end timestamps
    const stmt = this.db.prepare(`
      SELECT 
        note as task_name,
        SUM(CAST((julianday(end) - julianday(start)) * 86400 AS INTEGER)) as total_seconds,
        COUNT(*) as entry_count
      FROM entries
      WHERE date(start) = ? AND end IS NOT NULL AND sheet = 'default'
      GROUP BY note
      ORDER BY total_seconds DESC
    `)
    return stmt.all(dateStr)
  }

  updateTimeSlot(id, taskName, startTime, endTime) {
    const stmt = this.db.prepare(`
      UPDATE entries
      SET note = ?,
          start = ?,
          end = ?
      WHERE id = ? AND sheet = 'default'
    `)
    const result = stmt.run(
      taskName, 
      startTime, 
      endTime || null,
      id
    )
    return result.changes > 0
  }
  deleteTimeSlot(id) {
    const stmt = this.db.prepare(`
      DELETE FROM entries
      WHERE id = ? AND sheet = 'default'
    `)
    const result = stmt.run(id)
    return result.changes > 0
  }

  close() {
    if (this.db) {
      this.db.close()
    }
  }
}

export default TimeTrackingDB

