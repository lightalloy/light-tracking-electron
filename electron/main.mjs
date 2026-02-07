import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import TimeTrackingDB from './database.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow = null
let tray = null
let db = null
let isQuitting = false

const isDev = !app.isPackaged

function createTrayIcon(isActive) {
  const iconName = isActive ? 'icon-active.png' : 'icon-inactive.png'
  const iconPath = isDev
    ? path.join(__dirname, '..', 'assets', iconName)
    : path.join(app.getAppPath(), 'assets', iconName)

  return nativeImage.createFromPath(iconPath)
}

function updateTray() {
  if (!tray) return

  const activeTimer = db.getActiveTimer()
  const isActive = !!activeTimer

  tray.setImage(createTrayIcon(isActive))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: activeTimer ? `Tracking: ${activeTimer.task_name}` : 'No active timer',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Stop Timer',
      enabled: isActive,
      click: () => {
        db.stopTimer()
        updateTray()
        if (mainWindow) {
          mainWindow.webContents.send('timer:stopped')
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
  tray.setToolTip(isActive ? `Tracking: ${activeTimer.task_name}` : 'Light Tracking')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 700,
    minWidth: 400,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: createTrayIcon(false),
    backgroundColor: '#0d0d0d',
    show: false,
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

function createTray() {
  tray = new Tray(createTrayIcon(false))
  tray.setToolTip('Light Tracking')

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus()
      } else {
        mainWindow.show()
      }
    }
  })

  updateTray()
}

function setupIPC() {
  ipcMain.handle('timer:start', async (event, taskName) => {
    const id = db.startTimer(taskName)
    updateTray()
    return { id, success: true }
  })

  ipcMain.handle('timer:stop', async () => {
    const result = db.stopTimer()
    updateTray()
    return { success: result }
  })

  ipcMain.handle('timer:status', async () => {
    const activeTimer = db.getActiveTimer()
    return {
      isRunning: !!activeTimer,
      currentTask: activeTimer || null
    }
  })

  ipcMain.handle('entries:get', async (event, date) => {
    return db.getEntriesByDate(date)
  })

  ipcMain.handle('entries:update', async (event, id, taskName, startTime, endTime) => {
    const success = db.updateTimeSlot(id, taskName, startTime, endTime)
    return { success }
  })

  ipcMain.handle('entries:delete', async (event, id) => {
    const success = db.deleteTimeSlot(id)
    return { success }
  })

  ipcMain.handle('stats:get', async (event, date) => {
    return db.getStatsByDate(date)
  })

  ipcMain.handle('entries:getRange', async (event, startDate, endDate) => {
    return db.getEntriesByDateRange(startDate, endDate)
  })

  ipcMain.handle('stats:getRange', async (event, startDate, endDate) => {
    return db.getStatsByDateRange(startDate, endDate)
  })

  ipcMain.handle('tasks:getRecent', async () => {
    return db.getRecentTaskNames(14)
  })
}

app.whenReady().then(() => {
  db = new TimeTrackingDB()
  createWindow()
  createTray()
  setupIPC()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Don't quit on macOS
  if (process.platform !== 'darwin') {
    // Actually, don't quit at all - we want to stay in tray
    // The app will quit when user clicks "Quit" in tray menu
  }
})

app.on('before-quit', () => {
  isQuitting = true
  if (db) {
    db.close()
  }
})

