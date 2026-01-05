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
  messageCount: number
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
  // - Thread ID is in data-thread-id attribute or legacy-thread-id

  // Extract thread ID from various possible locations
  let threadId: string | null = null
  const threadIdEl = row.querySelector('[data-thread-id]')
  if (threadIdEl) {
    threadId = threadIdEl.getAttribute('data-thread-id')
  }
  // Try legacy attribute
  if (!threadId) {
    const legacyEl = row.querySelector('[data-legacy-thread-id]')
    if (legacyEl) {
      threadId = legacyEl.getAttribute('data-legacy-thread-id')
    }
  }
  // Try on the row itself
  if (!threadId && row.hasAttribute('data-thread-id')) {
    threadId = row.getAttribute('data-thread-id')
  }
  // Clean up thread ID - strip "#thread-f:" or "#thread-a:" prefix and convert to hex
  if (threadId) {
    const match = threadId.match(/#thread-[a-z]:(\d+)/)
    if (match) {
      // DOM uses decimal, but Gmail API expects hex
      threadId = BigInt(match[1]).toString(16)
    }
  }

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

  // Message count - shown as a number next to sender names for multi-message threads
  // Gmail uses span.bx0 for the count (e.g., "2" for 2 messages)
  let messageCount = 1
  const countEl = row.querySelector('span.bx0')
  if (countEl) {
    const countText = countEl.textContent?.trim()
    if (countText && /^\d+$/.test(countText)) {
      messageCount = parseInt(countText, 10)
    }
  }

  return { index, threadId, sender, subject, snippet, messageCount, isSelected, isRead, isStarred }
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
  if (!labels) {
    console.error(`[gmail-preload] Unknown bulk action: ${action}`)
    return false
  }

  // Gmail toolbar is typically within div[role="toolbar"] or the main header area
  // We want to click buttons in the toolbar, not random elements with matching aria-label
  const toolbarSelectors = [
    '[role="toolbar"]',
    '[gh="mtb"]', // Gmail's main toolbar marker
    '.G-atb', // Gmail toolbar class
    'header',
  ]

  for (const label of labels) {
    // First try to find the button within a toolbar context
    for (const toolbarSelector of toolbarSelectors) {
      const toolbar = document.querySelector(toolbarSelector)
      if (toolbar) {
        // Try exact match within toolbar
        let button = toolbar.querySelector(`[aria-label="${label}"]`)
        if (!button) {
          // Try case-insensitive match
          button = toolbar.querySelector(`[aria-label="${label}" i]`)
        }
        if (button instanceof HTMLElement) {
          console.log(`[gmail-preload] Found button "${label}" in ${toolbarSelector}`)
          simulateClick(button)
          return true
        }
      }
    }

    // Fallback: search globally but only for visible, enabled buttons
    const buttons = document.querySelectorAll(`[aria-label="${label}"], [aria-label*="${label}"]`)
    for (const button of buttons) {
      if (button instanceof HTMLElement && isClickableButton(button)) {
        console.log(`[gmail-preload] Found button "${label}" globally`)
        simulateClick(button)
        return true
      }
    }
  }

  console.error(`[gmail-preload] Could not find toolbar button for action: ${action}`)
  console.log(`[gmail-preload] Tried labels: ${labels.join(', ')}`)
  return false
}

function isClickableButton(element: HTMLElement): boolean {
  // Check if the element is visible and not disabled
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false
  }
  if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
    return false
  }
  // Check if element has reasonable dimensions
  const rect = element.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) {
    return false
  }
  return true
}

function simulateClick(element: HTMLElement): void {
  // Some Gmail buttons need proper mouse events, not just click()
  const rect = element.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2

  // Dispatch a full sequence of mouse events
  const mousedownEvent = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: x,
    clientY: y,
  })
  const mouseupEvent = new MouseEvent('mouseup', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: x,
    clientY: y,
  })
  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: x,
    clientY: y,
  })

  element.dispatchEvent(mousedownEvent)
  element.dispatchEvent(mouseupEvent)
  element.dispatchEvent(clickEvent)
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

  // Handle confirmation dialogs that may appear after certain actions
  if (action === 'spam') {
    // Wait a moment for the "Block sender?" dialog to appear, then auto-confirm
    await handleSpamBlockDialog()
  }

  return { success: true }
}

async function handleSpamBlockDialog(): Promise<void> {
  // Wait for the spam block confirmation dialog to appear
  // Dialog has role="alertdialog" and contains "Yes, block" button with data-mdc-dialog-action="blockSender"
  const maxWait = 2000
  const pollInterval = 100
  let elapsed = 0

  while (elapsed < maxWait) {
    // Look for the dialog
    const dialog = document.querySelector('[role="alertdialog"]')
    if (dialog) {
      // Find and click the "Yes, block" button
      const blockButton = dialog.querySelector('[data-mdc-dialog-action="blockSender"]')
      if (blockButton instanceof HTMLElement) {
        console.log('[gmail-preload] Found spam block dialog, clicking "Yes, block"')
        simulateClick(blockButton)
        return
      }
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval))
    elapsed += pollInterval
  }

  // Dialog didn't appear - that's fine, spam was still reported
  console.log('[gmail-preload] No spam block dialog appeared (this is normal for some cases)')
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
