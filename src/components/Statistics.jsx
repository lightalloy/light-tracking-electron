import { useState, useEffect } from 'react'

const formatDateForInput = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${day}.${month}.${year}`
}

const formatDateTimeForInput = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}.${month}.${year} ${hours}:${minutes}`
}

const parseDateInput = (dateStr) => {
  if (!dateStr) return ''
  // Convert from "DD.MM.YYYY" to "YYYY-MM-DD"
  const parts = dateStr.split('.')
  if (parts.length === 3) {
    const [day, month, year] = parts
    return `${year}-${month}-${day}`
  }
  return dateStr
}

const parseDateTimeInput = (dateTimeStr) => {
  if (!dateTimeStr) return ''
  // Convert from "DD.MM.YYYY HH:mm" to "YYYY-MM-DD HH:mm:ss"
  const [datePart, timePart] = dateTimeStr.split(' ')
  const date = parseDateInput(datePart)
  if (date && timePart) {
    return `${date} ${timePart}:00`
  }
  return ''
}

// Week = Monday–Sunday. Returns DD.MM.YYYY.
const getTodayFormatted = () => {
  const d = new Date()
  return formatDateForInput(d.toISOString().split('T')[0])
}

const getYesterdayFormatted = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return formatDateForInput(d.toISOString().split('T')[0])
}

const getThisWeekRange = () => {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(d)
  monday.setDate(d.getDate() - diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    from: formatDateForInput(monday.toISOString().split('T')[0]),
    to: formatDateForInput(sunday.toISOString().split('T')[0])
  }
}

const getLastWeekRange = () => {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(d)
  monday.setDate(d.getDate() - diff - 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    from: formatDateForInput(monday.toISOString().split('T')[0]),
    to: formatDateForInput(sunday.toISOString().split('T')[0])
  }
}

const formatDurationCompact = (seconds) => {
  if (!seconds) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  return `${m}m`
}

const DEV_TASK_REGEX = /^(DEV-\d{3,6})\s*(.*)$/

const formatTaskSummaryLine = (taskName, totalSeconds) => {
  const match = taskName.match(DEV_TASK_REGEX)
  if (!match) return `${taskName}: ${formatDurationCompact(totalSeconds)}`
  const ticket = match[1]
  const description = match[2].trim()
  const duration = formatDurationCompact(totalSeconds)
  return description ? `${ticket}: ${duration} - ${description}` : `${ticket}: ${duration}`
}

const buildTrackSummary = (entries) => {
  const byDay = {}
  for (const entry of entries) {
    const dayKey = entry.start_time ? entry.start_time.split(' ')[0] : ''
    if (!dayKey) continue
    if (!byDay[dayKey]) byDay[dayKey] = {}
    const taskName = entry.task_name || ''
    const sec = entry.duration_seconds || 0
    byDay[dayKey][taskName] = (byDay[dayKey][taskName] || 0) + sec
  }
  const days = Object.keys(byDay).sort()
  const lines = []
  for (const dayKey of days) {
    if (lines.length) lines.push('')
    const tasks = Object.entries(byDay[dayKey]).sort((a, b) => a[0].localeCompare(b[0]))
    const dayTotalSeconds = tasks.reduce((sum, [, sec]) => sum + sec, 0)
    lines.push(`# ${formatDateForInput(dayKey)} (${formatDurationCompact(dayTotalSeconds)})`)
    for (const [taskName, totalSeconds] of tasks) {
      lines.push(formatTaskSummaryLine(taskName, totalSeconds))
    }
  }
  return lines.join('\n')
}

function Statistics({ currentTask, onSwitchTask }) {
  const [dateFrom, setDateFrom] = useState(() => getTodayFormatted())
  const [dateTo, setDateTo] = useState(() => getTodayFormatted())
  const [entries, setEntries] = useState([])
  const [stats, setStats] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [isActiveSlot, setIsActiveSlot] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [editForm, setEditForm] = useState({ taskName: '', startTime: '', endTime: '' })
  const [showTrackSummary, setShowTrackSummary] = useState(false)
  const [trackSummaryText, setTrackSummaryText] = useState('')

  const isSingleDay = dateFrom === dateTo

  useEffect(() => {
    loadData()
  }, [dateFrom, dateTo])

  const loadData = async () => {
    if (!window.electronAPI) return
    const fromAPI = parseDateInput(dateFrom)
    const toAPI = parseDateInput(dateTo)
    if (!fromAPI || !toAPI) return
    if (toAPI < fromAPI) return

    if (isSingleDay) {
      const [entriesData, statsData] = await Promise.all([
        window.electronAPI.getEntries(fromAPI),
        window.electronAPI.getStats(fromAPI)
      ])
      setEntries(entriesData || [])
      setStats(statsData || [])
    } else {
      const [entriesData, statsData] = await Promise.all([
        window.electronAPI.getEntriesRange(fromAPI, toAPI),
        window.electronAPI.getStatsRange(fromAPI, toAPI)
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

  const handleEdit = (entry) => {
    setEditingId(entry.id)
    setIsActiveSlot(entry.end_time === null)
    setEditForm({
      taskName: entry.task_name,
      startTime: formatDateTimeForInput(entry.start_time),
      endTime: formatDateTimeForInput(entry.end_time)
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setIsActiveSlot(false)
    setEditForm({ taskName: '', startTime: '', endTime: '' })
  }

  const handleSaveEdit = async () => {
    if (!editForm.taskName.trim()) {
      alert('Task name cannot be empty')
      return
    }

    const startTime = parseDateTimeInput(editForm.startTime)
    const endTime = parseDateTimeInput(editForm.endTime)

    if (!startTime) {
      alert('Start time and end time are required')
      return
    }

    if (!isActiveSlot && !endTime) {
      alert('End time is required')
      return
    }

    if (endTime && new Date(endTime) <= new Date(startTime)) {
      alert('End time must be after start time')
      return
    }

    if (window.electronAPI) {
      const result = await window.electronAPI.updateEntry(
        editingId,
        editForm.taskName.trim(),
        startTime,
        endTime || null
      )

      if (result.success) {
        setEditingId(null)
        setIsActiveSlot(false)
        setEditForm({ taskName: '', startTime: '', endTime: '' })
        loadData()
      } else {
        alert('Failed to update entry')
      }
    }
  }

  const handleDelete = (id) => {
    setDeleteConfirmId(id)
  }

  const handleCancelDelete = () => {
    setDeleteConfirmId(null)
  }

  const handleConfirmDelete = async () => {
    if (window.electronAPI && deleteConfirmId) {
      const result = await window.electronAPI.deleteEntry(deleteConfirmId)

      if (result.success) {
        setDeleteConfirmId(null)
        loadData()
      } else {
        alert('Failed to delete entry')
      }
    }
  }

  const totalTime = stats.reduce((sum, s) => sum + (s.total_seconds || 0), 0)

  const setToday = () => {
    const t = getTodayFormatted()
    setDateFrom(t)
    setDateTo(t)
  }

  const setYesterday = () => {
    const t = getYesterdayFormatted()
    setDateFrom(t)
    setDateTo(t)
  }

  const setThisWeek = () => {
    const { from, to } = getThisWeekRange()
    setDateFrom(from)
    setDateTo(to)
  }

  const setLastWeek = () => {
    const { from, to } = getLastWeekRange()
    setDateFrom(from)
    setDateTo(to)
  }

  const handleTrackSummaryToggle = () => {
    if (!showTrackSummary) {
      setTrackSummaryText(buildTrackSummary(entries))
    }
    setShowTrackSummary((v) => !v)
  }

  return (
    <div className="space-y-6">
      {/* Date range picker */}
      <div className="space-y-2">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="DD.MM.YYYY"
              className="bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 w-32
                         text-neutral-200 focus:outline-none focus:border-accent-secondary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-neutral-400">to</label>
            <input
              type="text"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="DD.MM.YYYY"
              className="bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 w-32
                         text-neutral-200 focus:outline-none focus:border-accent-secondary"
            />
          </div>
          <button
            type="button"
            onClick={handleTrackSummaryToggle}
            className="bg-surface-600 hover:bg-surface-500 text-neutral-200 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            {showTrackSummary ? 'Скрыть' : 'Затрекать'}
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={setToday}
            className="bg-surface-600 hover:bg-surface-500 text-neutral-200 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={setYesterday}
            className="bg-surface-600 hover:bg-surface-500 text-neutral-200 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            Yesterday
          </button>
          <button
            type="button"
            onClick={setThisWeek}
            className="bg-surface-600 hover:bg-surface-500 text-neutral-200 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            This week
          </button>
          <button
            type="button"
            onClick={setLastWeek}
            className="bg-surface-600 hover:bg-surface-500 text-neutral-200 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            Last week
          </button>
        </div>
      </div>

      {/* Track summary (затрекать) */}
      {showTrackSummary && (
        <div className="bg-surface-700 rounded-lg p-4">
          <h3 className="text-sm text-neutral-400 uppercase tracking-wider mb-2">
            Сводка для затрекивания
          </h3>
          <textarea
            value={trackSummaryText}
            onChange={(e) => setTrackSummaryText(e.target.value)}
            rows={12}
            className="w-full bg-surface-600 border border-surface-500 rounded-lg px-3 py-2
                       text-neutral-200 font-mono text-sm focus:outline-none focus:border-accent-secondary
                       resize-y min-h-[8rem]"
            placeholder="Сводка по дням появится здесь после нажатия «Затрекать»"
          />
        </div>
      )}

      {/* Summary stats */}
      <div className="bg-surface-700 rounded-lg p-4">
        <h3 className="text-sm text-neutral-400 uppercase tracking-wider mb-3">
          Summary
        </h3>
        <div className="text-3xl font-bold text-accent-secondary">
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
            {stats.map((stat, i) => {
              const isCurrentTask = currentTask?.task_name === stat.task_name
              return (
                <div 
                  key={i}
                  className="flex items-center gap-3 bg-surface-700 rounded-lg px-4 py-3"
                >
                  <button
                    onClick={() => onSwitchTask(stat.task_name)}
                    disabled={isCurrentTask}
                    className={`flex-shrink-0 transition-colors ${
                      isCurrentTask 
                        ? 'text-neutral-600 cursor-not-allowed' 
                        : 'text-neutral-400 hover:text-accent-primary'
                    }`}
                    title={isCurrentTask ? 'Currently tracking' : 'Start this task'}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                  <span className="flex-1 text-neutral-200">{stat.task_name}</span>
                  <span className="text-accent-cyan font-medium">
                    {formatDuration(stat.total_seconds)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Timeline */}
      {entries.length > 0 && (
        <div>
          <h3 className="text-sm text-neutral-400 uppercase tracking-wider mb-3">
            Timeline
          </h3>
          {isSingleDay ? (
            <div className="space-y-2">
              {entries.map((entry) => (
                editingId === entry.id ? (
                  <div 
                    key={entry.id}
                    className="bg-surface-700 rounded-lg px-4 py-3 space-y-3"
                  >
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Task Name</label>
                      <input
                        type="text"
                        value={editForm.taskName}
                        onChange={(e) => setEditForm({ ...editForm, taskName: e.target.value })}
                        className="w-full bg-surface-600 border border-surface-500 rounded-lg px-3 py-2 
                                   text-neutral-200 focus:outline-none focus:border-accent-secondary"
                        autoFocus
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Start Time</label>
                        <input
                          type="text"
                          value={editForm.startTime}
                          onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                          placeholder="DD.MM.YYYY HH:mm"
                          className="w-full bg-surface-600 border border-surface-500 rounded-lg px-3 py-2 
                                     text-neutral-200 focus:outline-none focus:border-accent-secondary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">End Time</label>
                        <input
                          type="text"
                          value={editForm.endTime}
                          onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                          placeholder="DD.MM.YYYY HH:mm"
                          className="w-full bg-surface-600 border border-surface-500 rounded-lg px-3 py-2 
                                     text-neutral-200 focus:outline-none focus:border-accent-secondary"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex-1 bg-accent-primary hover:bg-accent-secondary text-surface-900 
                                   font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 bg-surface-600 hover:bg-surface-500 text-neutral-200 
                                   font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
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
                    <div className="text-accent-primary text-sm">
                      {formatDuration(entry.duration_seconds)}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="text-neutral-400 hover:text-accent-cyan transition-colors px-2 py-1"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-neutral-400 hover:text-red-400 transition-colors px-2 py-1"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              ))}
            </div>
          ) : (
            (() => {
              const byDay = {}
              for (const entry of entries) {
                const dayKey = entry.start_time ? entry.start_time.split(' ')[0] : ''
                if (!byDay[dayKey]) byDay[dayKey] = []
                byDay[dayKey].push(entry)
              }
              const days = Object.keys(byDay).sort()
              return (
                <div className="space-y-4">
                  {days.map((dayKey) => (
                    <div key={dayKey}>
                      <h4 className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
                        {formatDateForInput(dayKey)}
                      </h4>
                      <div className="space-y-2">
                        {byDay[dayKey].map((entry) => (
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
                            <div className="text-accent-primary text-sm">
                              {formatDuration(entry.duration_seconds)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()
          )}
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-center py-8 text-neutral-500">
          {isSingleDay ? 'No entries for this date' : 'No entries for this period'}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-800 rounded-xl p-6 border border-surface-600 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-neutral-200 mb-2">
              Delete Entry
            </h3>
            <p className="text-neutral-400 mb-6">
              Are you sure you want to delete this time entry? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 bg-surface-600 hover:bg-surface-500 text-neutral-200 
                           font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white 
                           font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Statistics

