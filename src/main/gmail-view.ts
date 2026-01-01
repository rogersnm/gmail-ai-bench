import { BrowserView, BrowserWindow } from 'electron'

const GMAIL_WIDTH_RATIO = 0.65 // Gmail takes 65% of width

export function createGmailView(parentWindow: BrowserWindow): BrowserView {
  const view = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

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
