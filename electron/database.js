const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
const os = require('os')

class TimeTrackingDB {
  constructor() {
    this.db = null
    this.init()
  }

  init() {
    const dbDir = path.join(os.homedir(), '.light-tracking')
    const dbPath = path.join(dbDir, 'time_tracking.db')

    // Create directory if it doesn't exist
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')

    // Create table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS time_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_name TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        duration_seconds INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_start_time ON time_slots(start_time);
      CREATE INDEX IF NOT EXISTS idx_task_name ON time_slots(task_name);
    `)
  }

  startTimer(taskName) {
    const stmt = this.db.prepare(`
      INSERT INTO time_slots (task_name, start_time)
      VALUES (?, datetime('now', 'localtime'))
    `)
    const result = stmt.run(taskName)
    return result.lastInsertRowid
  }

  stopTimer() {
    // Find the active timer (end_time is NULL)
    const activeTimer = this.db.prepare(`
      SELECT id, start_time FROM time_slots WHERE end_time IS NULL ORDER BY id DESC LIMIT 1
    `).get()

    if (activeTimer) {
      const stmt = this.db.prepare(`
        UPDATE time_slots
        SET end_time = datetime('now', 'localtime'),
            duration_seconds = CAST((julianday(datetime('now', 'localtime')) - julianday(start_time)) * 86400 AS INTEGER)
        WHERE id = ?
      `)
      stmt.run(activeTimer.id)
      return true
    }
    return false
  }

  getActiveTimer() {
    return this.db.prepare(`
      SELECT id, task_name, start_time
      FROM time_slots
      WHERE end_time IS NULL
      ORDER BY id DESC
      LIMIT 1
    `).get()
  }

  getEntriesByDate(dateStr) {
    // dateStr format: 'YYYY-MM-DD'
    const stmt = this.db.prepare(`
      SELECT id, task_name, start_time, end_time, duration_seconds
      FROM time_slots
      WHERE date(start_time) = ?
      ORDER BY start_time ASC
    `)
    return stmt.all(dateStr)
  }

  getStatsByDate(dateStr) {
    // Aggregate time by task for a given date
    const stmt = this.db.prepare(`
      SELECT task_name, SUM(duration_seconds) as total_seconds, COUNT(*) as entry_count
      FROM time_slots
      WHERE date(start_time) = ? AND end_time IS NOT NULL
      GROUP BY task_name
      ORDER BY total_seconds DESC
    `)
    return stmt.all(dateStr)
  }

  updateTimeSlot(id, taskName, startTime, endTime) {
    // Calculate duration_seconds from startTime and endTime
    const stmt = this.db.prepare(`
      UPDATE time_slots
      SET task_name = ?,
          start_time = ?,
          end_time = ?,
          duration_seconds = CAST((julianday(?) - julianday(?)) * 86400 AS INTEGER)
      WHERE id = ?
    `)
    const result = stmt.run(taskName, startTime, endTime, endTime, startTime, id)
    return result.changes > 0
  }

  deleteTimeSlot(id) {
    const stmt = this.db.prepare(`
      DELETE FROM time_slots
      WHERE id = ?
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

module.exports = TimeTrackingDB

