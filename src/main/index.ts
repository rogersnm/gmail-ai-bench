import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { createGmailView, resizeGmailView } from './gmail-view'
import { setupGmailHandlers } from './gmail/gmail-client'
import { setupBedrockHandlers } from './llm/executor'
import { setupPromptsStore } from './storage/prompts-store'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Create Gmail BrowserView (left 65% of window)
  const gmailView = createGmailView(mainWindow)

  // Handle window resize
  mainWindow.on('resize', () => {
    if (mainWindow) {
      resizeGmailView(mainWindow, gmailView)
    }
  })

  // Load the prompt bench UI (right 35% of window)
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  // Set up IPC handlers
  setupGmailHandlers(ipcMain)
  setupBedrockHandlers(ipcMain)
  setupPromptsStore(ipcMain)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
