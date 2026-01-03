// Gmail BrowserView preload script - exposes DOM interaction capabilities
import { contextBridge, ipcRenderer } from 'electron'

// Gmail DOM helper functions

function waitForElement(
  selector: string,
  timeout = 3000
): Promise<Element | null> {
  return new Promise((resolve) => {
    const element = document.querySelector(selector)
    if (element) {
      resolve(element)
      return
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector)
      if (el) {
        observer.disconnect()
        resolve(el)
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    setTimeout(() => {
      observer.disconnect()
      resolve(null)
    }, timeout)
  })
}

async function findEmailRows(): Promise<Element[]> {
  // Wait for at least one email row to appear
  await waitForElement('tr[role="row"]', 2000)

  // Gmail uses table rows with role="row" for email items
  // The main email list is typically in a table with role="grid"
  const rows = document.querySelectorAll('tr[role="row"]')
  // Filter to only include actual email rows (they have checkboxes)
  return Array.from(rows).filter((row) => {
    return row.querySelector('[role="checkbox"]') !== null
  })
}

interface EmailInfo {
  index: number
  threadId: string | null
  sender: string
  subject: string
  snippet: string
  isSelected: boolean
  isRead: boolean
  isStarred: boolean
}

function getEmailInfo(row: Element, index: number): EmailInfo {
  // Gmail structure varies but generally:
  // - Checkbox is [role="checkbox"]
  // - Star button has aria-label containing "Star" or "Starred"
  // - Sender is usually in a span with email attribute or class
  // - Subject is in a span, often the largest text element

  const checkbox = row.querySelector('[role="checkbox"]')
  const isSelected = checkbox?.getAttribute('aria-checked') === 'true'

  // Check if read - unread emails typically have a specific class or bold text
  const isRead = !row.classList.contains('zE') // Gmail uses 'zE' for unread

  // Star button
  const starButton = row.querySelector('[aria-label*="Star"]')
  const isStarred = starButton?.getAttribute('aria-label')?.includes('Starred') ?? false

  // Sender - look for email attribute or specific structure
  let sender = ''
  const senderEl = row.querySelector('[email]') || row.querySelector('.yW span')
  if (senderEl) {
    sender = senderEl.getAttribute('email') || senderEl.textContent || ''
  }

  // Subject - typically in a span with class 'bog' or similar
  let subject = ''
  const subjectEl = row.querySelector('.bog') || row.querySelector('[data-thread-id] span')
  if (subjectEl) {
    subject = subjectEl.textContent || ''
  }

  // Snippet - preview text, usually in span with class 'y2'
  let snippet = ''
  const snippetEl = row.querySelector('.y2')
  if (snippetEl) {
    snippet = snippetEl.textContent || ''
  }

  return { index, sender, subject, snippet, isSelected, isRead, isStarred }
}

function clickCheckbox(row: Element): boolean {
  const checkbox = row.querySelector('[role="checkbox"]')
  if (checkbox instanceof HTMLElement) {
    checkbox.click()
    return true
  }
  return false
}

function clickToolbarButton(action: string): boolean {
  // Map actions to Gmail's aria-labels
  const ariaLabelMap: Record<string, string[]> = {
    archive: ['Archive'],
    delete: ['Delete'],
    spam: ['Report spam', 'Report as spam'],
    not_spam: ['Not spam'],
    mark_read: ['Mark as read'],
    mark_unread: ['Mark as unread'],
    star: ['Star'],
    unstar: ['Not starred', 'Remove star'],
  }

  const labels = ariaLabelMap[action]
  if (!labels) return false

  for (const label of labels) {
    // Try exact match first
    let button = document.querySelector(`[aria-label="${label}"]`)
    // Try contains match
    if (!button) {
      button = document.querySelector(`[aria-label*="${label}"]`)
    }
    if (button instanceof HTMLElement) {
      button.click()
      return true
    }
  }

  return false
}

// IPC handlers for main process communication

interface SelectEmailsParams {
  by: 'all' | 'none' | 'read' | 'unread' | 'sender' | 'subject' | 'index'
  value?: string
}

interface SelectEmailsResult {
  success: boolean
  selectedCount?: number
  error?: string
}

async function handleSelectEmails(params: SelectEmailsParams): Promise<SelectEmailsResult> {
  const rows = await findEmailRows()

  if (rows.length === 0) {
    return { success: false, error: 'No emails visible in the current view' }
  }

  let selectedCount = 0

  switch (params.by) {
    case 'all':
      for (const row of rows) {
        const checkbox = row.querySelector('[role="checkbox"]')
        if (checkbox?.getAttribute('aria-checked') !== 'true') {
          clickCheckbox(row)
          selectedCount++
        }
      }
      break

    case 'none':
      for (const row of rows) {
        const checkbox = row.querySelector('[role="checkbox"]')
        if (checkbox?.getAttribute('aria-checked') === 'true') {
          clickCheckbox(row)
        }
      }
      selectedCount = 0
      break

    case 'read':
      for (const row of rows) {
        const isRead = !row.classList.contains('zE')
        const checkbox = row.querySelector('[role="checkbox"]')
        const isChecked = checkbox?.getAttribute('aria-checked') === 'true'
        if (isRead && !isChecked) {
          clickCheckbox(row)
          selectedCount++
        }
      }
      break

    case 'unread':
      for (const row of rows) {
        const isUnread = row.classList.contains('zE')
        const checkbox = row.querySelector('[role="checkbox"]')
        const isChecked = checkbox?.getAttribute('aria-checked') === 'true'
        if (isUnread && !isChecked) {
          clickCheckbox(row)
          selectedCount++
        }
      }
      break

    case 'sender':
      if (!params.value) {
        return { success: false, error: 'Sender value required for sender selection' }
      }
      for (const row of rows) {
        const info = getEmailInfo(row, 0)
        if (info.sender.toLowerCase().includes(params.value.toLowerCase())) {
          const checkbox = row.querySelector('[role="checkbox"]')
          if (checkbox?.getAttribute('aria-checked') !== 'true') {
            clickCheckbox(row)
            selectedCount++
          }
        }
      }
      break

    case 'subject':
      if (!params.value) {
        return { success: false, error: 'Subject value required for subject selection' }
      }
      for (const row of rows) {
        const info = getEmailInfo(row, 0)
        if (info.subject.toLowerCase().includes(params.value.toLowerCase())) {
          const checkbox = row.querySelector('[role="checkbox"]')
          if (checkbox?.getAttribute('aria-checked') !== 'true') {
            clickCheckbox(row)
            selectedCount++
          }
        }
      }
      break

    case 'index':
      if (!params.value) {
        return { success: false, error: 'Index value required for index selection' }
      }
      const indices = params.value.split(',').map((s) => parseInt(s.trim(), 10))
      for (const idx of indices) {
        if (idx >= 0 && idx < rows.length) {
          const checkbox = rows[idx].querySelector('[role="checkbox"]')
          if (checkbox?.getAttribute('aria-checked') !== 'true') {
            clickCheckbox(rows[idx])
            selectedCount++
          }
        }
      }
      break

    default:
      return { success: false, error: `Unknown selection method: ${params.by}` }
  }

  return { success: true, selectedCount }
}

interface BulkActionResult {
  success: boolean
  error?: string
}

async function handleBulkAction(action: string): Promise<BulkActionResult> {
  // First check if any emails are selected
  const rows = await findEmailRows()
  const selectedCount = rows.filter((row) => {
    const checkbox = row.querySelector('[role="checkbox"]')
    return checkbox?.getAttribute('aria-checked') === 'true'
  }).length

  if (selectedCount === 0) {
    return { success: false, error: 'No emails selected. Use select_emails first.' }
  }

  const clicked = clickToolbarButton(action)
  if (!clicked) {
    return {
      success: false,
      error: `Could not find toolbar button for "${action}". Gmail UI may have changed.`,
    }
  }

  return { success: true }
}

async function handleGetVisibleEmails(): Promise<{ success: boolean; emails?: EmailInfo[]; error?: string }> {
  const rows = await findEmailRows()

  if (rows.length === 0) {
    return { success: true, emails: [] }
  }

  const emails = rows.map((row, index) => getEmailInfo(row, index))
  return { success: true, emails }
}

// Expose API to main process via IPC
ipcRenderer.on('gmail:select-emails', async (_event, params: SelectEmailsParams) => {
  const result = await handleSelectEmails(params)
  ipcRenderer.send('gmail:select-emails-result', result)
})

ipcRenderer.on('gmail:bulk-action', async (_event, action: string) => {
  const result = await handleBulkAction(action)
  ipcRenderer.send('gmail:bulk-action-result', result)
})

ipcRenderer.on('gmail:get-visible', async () => {
  const result = await handleGetVisibleEmails()
  ipcRenderer.send('gmail:get-visible-result', result)
})

// Also expose via contextBridge for potential direct use
contextBridge.exposeInMainWorld('gmailTools', {
  selectEmails: handleSelectEmails,
  bulkAction: handleBulkAction,
  getVisibleEmails: handleGetVisibleEmails,
})
