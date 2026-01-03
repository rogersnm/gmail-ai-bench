import { BrowserView, BrowserWindow } from 'electron'
import { join } from 'path'

const GMAIL_WIDTH_RATIO = 0.65 // Gmail takes 65% of width

// Module-level reference for access from other modules
let gmailViewInstance: BrowserView | null = null

export function getGmailView(): BrowserView | null {
  return gmailViewInstance
}

export function createGmailView(parentWindow: BrowserWindow): BrowserView {
  const view = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, '../preload/gmail-preload.js'),
    },
  })

  // Store reference for other modules
  gmailViewInstance = view

  parentWindow.addBrowserView(view)

  const bounds = parentWindow.getBounds()
  view.setBounds({
    x: 0,
    y: 0,
    width: Math.floor(bounds.width * GMAIL_WIDTH_RATIO),
    height: bounds.height,
  })

  view.setAutoResize({
    width: false,
    height: true,
  })

  // Load Gmail
  view.webContents.loadURL('https://mail.google.com')

  return view
}

export function resizeGmailView(
  parentWindow: BrowserWindow,
  view: BrowserView
): void {
  const bounds = parentWindow.getBounds()
  view.setBounds({
    x: 0,
    y: 0,
    width: Math.floor(bounds.width * GMAIL_WIDTH_RATIO),
    height: bounds.height,
  })
}
