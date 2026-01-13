import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { createGmailView, resizeGmailView, getGmailView } from './gmail-view'
import { setupGmailHandlers } from './gmail/gmail-client'
import { setupVertexHandlers } from './llm/executor'
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
  setupVertexHandlers(ipcMain)
  setupPromptsStore(ipcMain)

  // Set up application menu with Cmd+R to refresh Gmail
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload Gmail',
          accelerator: 'CmdOrCtrl+R',
          click: (): void => {
            const gmailView = getGmailView()
            if (gmailView) {
              gmailView.webContents.reload()
            }
          },
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }],
    },
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

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
