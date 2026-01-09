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

function Statistics() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return formatDateForInput(today.toISOString().split('T')[0])
  })
  const [entries, setEntries] = useState([])
  const [stats, setStats] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [editForm, setEditForm] = useState({ taskName: '', startTime: '', endTime: '' })

  useEffect(() => {
    loadData()
  }, [selectedDate])

  const loadData = async () => {
    if (window.electronAPI) {
      const dateForAPI = parseDateInput(selectedDate)
      const [entriesData, statsData] = await Promise.all([
        window.electronAPI.getEntries(dateForAPI),
        window.electronAPI.getStats(dateForAPI)
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
    setEditForm({
      taskName: entry.task_name,
      startTime: formatDateTimeForInput(entry.start_time),
      endTime: formatDateTimeForInput(entry.end_time)
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({ taskName: '', startTime: '', endTime: '' })
  }

  const handleSaveEdit = async () => {
    if (!editForm.taskName.trim()) {
      alert('Task name cannot be empty')
      return
    }

    const startTime = parseDateTimeInput(editForm.startTime)
    const endTime = parseDateTimeInput(editForm.endTime)

    if (!startTime || !endTime) {
      alert('Start time and end time are required')
      return
    }

    if (new Date(endTime) <= new Date(startTime)) {
      alert('End time must be after start time')
      return
    }

    if (window.electronAPI) {
      const result = await window.electronAPI.updateEntry(
        editingId,
        editForm.taskName.trim(),
        startTime,
        endTime
      )

      if (result.success) {
        setEditingId(null)
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

  return (
    <div className="space-y-6">
      {/* Date picker */}
      <div>
        <input
          type="text"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          placeholder="DD.MM.YYYY"
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
              editingId === entry.id ? (
                // Edit form
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
                                 text-neutral-200 focus:outline-none focus:border-accent-lime"
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
                                   text-neutral-200 focus:outline-none focus:border-accent-lime"
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
                                   text-neutral-200 focus:outline-none focus:border-accent-lime"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 bg-accent-green hover:bg-accent-lime text-surface-900 
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
                // Entry display
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
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-center py-8 text-neutral-500">
          No entries for this date
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

