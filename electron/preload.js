const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Timer controls
  startTimer: (taskName) => ipcRenderer.invoke('timer:start', taskName),
  stopTimer: () => ipcRenderer.invoke('timer:stop'),
  getTimerStatus: () => ipcRenderer.invoke('timer:status'),
  
  // Data retrieval
  getEntries: (date) => ipcRenderer.invoke('entries:get', date),
  getStats: (date) => ipcRenderer.invoke('stats:get', date),
  getEntriesRange: (startDate, endDate) => ipcRenderer.invoke('entries:getRange', startDate, endDate),
  getStatsRange: (startDate, endDate) => ipcRenderer.invoke('stats:getRange', startDate, endDate),
  
  // Entry management
  updateEntry: (id, taskName, startTime, endTime) => ipcRenderer.invoke('entries:update', id, taskName, startTime, endTime),
  deleteEntry: (id) => ipcRenderer.invoke('entries:delete', id),
  
  // Task suggestions
  getRecentTasks: () => ipcRenderer.invoke('tasks:getRecent'),
  
  // Events from main process
  onTimerStopped: (callback) => {
    ipcRenderer.on('timer:stopped', () => callback())
  }
})

