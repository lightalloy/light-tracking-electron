import { useState, useEffect } from 'react'

function Statistics() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [entries, setEntries] = useState([])
  const [stats, setStats] = useState([])

  useEffect(() => {
    loadData()
  }, [selectedDate])

  const loadData = async () => {
    if (window.electronAPI) {
      const [entriesData, statsData] = await Promise.all([
        window.electronAPI.getEntries(selectedDate),
        window.electronAPI.getStats(selectedDate)
      ])
      setEntries(entriesData || [])
      setStats(statsData || [])
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0m'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return '--:--'
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const totalTime = stats.reduce((sum, s) => sum + (s.total_seconds || 0), 0)

  return (
    <div className="space-y-6">
      {/* Date picker */}
      <div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-surface-700 border border-surface-600 rounded-lg px-4 py-2 
                     text-neutral-200 focus:outline-none focus:border-accent-lime
                     cursor-pointer"
        />
      </div>

      {/* Summary stats */}
      <div className="bg-surface-700 rounded-lg p-4">
        <h3 className="text-sm text-neutral-400 uppercase tracking-wider mb-3">
          Summary
        </h3>
        <div className="text-3xl font-bold text-accent-lime">
          {formatDuration(totalTime)}
        </div>
        <div className="text-sm text-neutral-500 mt-1">
          Total tracked time
        </div>
      </div>

      {/* Stats by task */}
      {stats.length > 0 && (
        <div>
          <h3 className="text-sm text-neutral-400 uppercase tracking-wider mb-3">
            By Task
          </h3>
          <div className="space-y-2">
            {stats.map((stat, i) => (
              <div 
                key={i}
                className="flex items-center justify-between bg-surface-700 rounded-lg px-4 py-3"
              >
                <span className="text-neutral-200">{stat.task_name}</span>
                <span className="text-accent-cyan font-medium">
                  {formatDuration(stat.total_seconds)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {entries.length > 0 && (
        <div>
          <h3 className="text-sm text-neutral-400 uppercase tracking-wider mb-3">
            Timeline
          </h3>
          <div className="space-y-2">
            {entries.map((entry) => (
              <div 
                key={entry.id}
                className="flex items-center gap-4 bg-surface-700 rounded-lg px-4 py-3"
              >
                <div className="text-neutral-500 text-sm font-medium w-24">
                  {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                </div>
                <div className="flex-1 text-neutral-200">
                  {entry.task_name}
                </div>
                <div className="text-accent-green text-sm">
                  {formatDuration(entry.duration_seconds)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-center py-8 text-neutral-500">
          No entries for this date
        </div>
      )}
    </div>
  )
}

export default Statistics

