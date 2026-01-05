// DOM tools for interacting with Gmail BrowserView
import { BrowserView, ipcMain } from 'electron'
import { getGmailView } from '../gmail-view'

interface SelectEmailsParams {
  by: 'all' | 'none' | 'read' | 'unread' | 'sender' | 'subject' | 'index'
  value?: string
}

interface SelectEmailsResult {
  success: boolean
  selectedCount?: number
  error?: string
}

interface BulkActionResult {
  success: boolean
  error?: string
}

interface EmailInfo {
  index: number
  threadId: string | null
  sender: string
  subject: string
  snippet: string
  messageCount: number
  isSelected: boolean
  isRead: boolean
  isStarred: boolean
}

interface GetVisibleResult {
  success: boolean
  emails?: EmailInfo[]
  error?: string
}

interface OpenEmailInfo {
  threadId: string | null
  messageId: string | null
  subject: string
  from: string
  to: string
  cc: string
  date: string
  body: string
  isExpanded: boolean
}

interface GetOpenEmailResult {
  success: boolean
  email?: OpenEmailInfo
  error?: string
}

function sendAndWait<T>(
  view: BrowserView,
  channel: string,
  resultChannel: string,
  data?: unknown,
  timeout = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      ipcMain.removeAllListeners(resultChannel)
      reject(new Error(`Timeout waiting for ${resultChannel}`))
    }, timeout)

    // One-time listener for the result
    ipcMain.once(resultChannel, (_event, result: T) => {
      clearTimeout(timeoutId)
      resolve(result)
    })

    // Send the request
    view.webContents.send(channel, data)
  })
}

export async function selectEmails(
  params: SelectEmailsParams
): Promise<SelectEmailsResult> {
  const view = getGmailView()
  if (!view) {
    return { success: false, error: 'Gmail view not available' }
  }

  try {
    return await sendAndWait<SelectEmailsResult>(
      view,
      'gmail:select-emails',
      'gmail:select-emails-result',
      params
    )
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function bulkAction(action: string): Promise<BulkActionResult> {
  const view = getGmailView()
  if (!view) {
    return { success: false, error: 'Gmail view not available' }
  }

  try {
    return await sendAndWait<BulkActionResult>(
      view,
      'gmail:bulk-action',
      'gmail:bulk-action-result',
      action
    )
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function getVisibleEmails(): Promise<GetVisibleResult> {
  const view = getGmailView()
  if (!view) {
    return { success: false, error: 'Gmail view not available' }
  }

  try {
    return await sendAndWait<GetVisibleResult>(
      view,
      'gmail:get-visible',
      'gmail:get-visible-result',
      undefined
    )
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function getOpenEmail(): Promise<GetOpenEmailResult> {
  const view = getGmailView()
  if (!view) {
    return { success: false, error: 'Gmail view not available' }
  }

  try {
    return await sendAndWait<GetOpenEmailResult>(
      view,
      'gmail:get-open-email',
      'gmail:get-open-email-result',
      undefined
    )
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
