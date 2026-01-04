import { google, gmail_v1 } from 'googleapis'
import { IpcMain, BrowserWindow } from 'electron'
import { getOAuth2Client, isAuthenticated, authenticate, logout } from '../auth/google-oauth'
import { GmailMessage, ParsedEmail, GmailLabel, SendEmailParams } from './types'
import { IPC_CHANNELS } from '../../shared/types'

let gmail: gmail_v1.Gmail | null = null

function getGmailClient(): gmail_v1.Gmail {
  if (gmail) return gmail

  const auth = getOAuth2Client()
  if (!auth) {
    throw new Error('Not authenticated')
  }

  gmail = google.gmail({ version: 'v1', auth })
  return gmail
}

function parseEmail(message: GmailMessage): ParsedEmail {
  const headers = message.payload?.headers || []
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

  let body = ''
  if (message.payload?.body?.data) {
    body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8')
  } else if (message.payload?.parts) {
    const textPart = message.payload.parts.find(
      (p) => p.mimeType === 'text/plain'
    )
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, 'base64').toString('utf-8')
    }
  }

  return {
    id: message.id,
    threadId: message.threadId,
    subject: getHeader('Subject'),
    from: getHeader('From'),
    to: getHeader('To'),
    date: getHeader('Date'),
    snippet: message.snippet,
    body,
    labelIds: message.labelIds,
  }
}

// Gmail API methods (exported for use by LLM tools)
export async function listEmails(
  query: string = '',
  maxResults: number = 20
): Promise<ParsedEmail[]> {
  const client = getGmailClient()

  const response = await client.users.messages.list({
    userId: 'me',
    q: query,
    maxResults,
  })

  const messages = response.data.messages || []

  const emails = await Promise.all(
    messages.map(async (msg) => {
      const full = await client.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      })
      return parseEmail(full.data as GmailMessage)
    })
  )

  return emails
}

export async function getEmail(id: string): Promise<ParsedEmail> {
  const client = getGmailClient()

  const response = await client.users.messages.get({
    userId: 'me',
    id,
    format: 'full',
  })

  return parseEmail(response.data as GmailMessage)
}

export async function sendEmail(params: SendEmailParams): Promise<string> {
  const client = getGmailClient()

  const emailLines = [
    `To: ${params.to}`,
    params.cc ? `Cc: ${params.cc}` : '',
    params.bcc ? `Bcc: ${params.bcc}` : '',
    `Subject: ${params.subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    params.body,
  ].filter(Boolean)

  const email = emailLines.join('\r\n')
  const encodedEmail = Buffer.from(email).toString('base64url')

  const response = await client.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedEmail,
    },
  })

  return response.data.id!
}

export async function createDraft(params: SendEmailParams): Promise<string> {
  const client = getGmailClient()

  const emailLines = [
    `To: ${params.to}`,
    params.cc ? `Cc: ${params.cc}` : '',
    params.bcc ? `Bcc: ${params.bcc}` : '',
    `Subject: ${params.subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    params.body,
  ].filter(Boolean)

  const email = emailLines.join('\r\n')
  const encodedEmail = Buffer.from(email).toString('base64url')

  const response = await client.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: {
        raw: encodedEmail,
      },
    },
  })

  return response.data.id!
}

export async function archiveEmail(id: string): Promise<void> {
  const client = getGmailClient()

  await client.users.messages.modify({
    userId: 'me',
    id,
    requestBody: {
      removeLabelIds: ['INBOX'],
    },
  })
}

export async function trashEmail(id: string): Promise<void> {
  const client = getGmailClient()

  await client.users.messages.trash({
    userId: 'me',
    id,
  })
}

export async function markAsRead(id: string): Promise<void> {
  const client = getGmailClient()

  await client.users.messages.modify({
    userId: 'me',
    id,
    requestBody: {
      removeLabelIds: ['UNREAD'],
    },
  })
}

export async function markAsUnread(id: string): Promise<void> {
  const client = getGmailClient()

  await client.users.messages.modify({
    userId: 'me',
    id,
    requestBody: {
      addLabelIds: ['UNREAD'],
    },
  })
}

export async function addLabel(id: string, labelId: string): Promise<void> {
  const client = getGmailClient()

  await client.users.messages.modify({
    userId: 'me',
    id,
    requestBody: {
      addLabelIds: [labelId],
    },
  })
}

export async function removeLabel(id: string, labelId: string): Promise<void> {
  const client = getGmailClient()

  await client.users.messages.modify({
    userId: 'me',
    id,
    requestBody: {
      removeLabelIds: [labelId],
    },
  })
}

export async function getLabels(): Promise<GmailLabel[]> {
  const client = getGmailClient()

  const response = await client.users.labels.list({
    userId: 'me',
  })

  return (response.data.labels || []) as GmailLabel[]
}

export async function getThreadMessages(threadId: string): Promise<ParsedEmail[]> {
  const client = getGmailClient()

  const response = await client.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full',
  })

  const messages = response.data.messages || []
  return messages.map((msg) => parseEmail(msg as GmailMessage))
}

// IPC handlers
export function setupGmailHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.GMAIL_AUTH_STATUS, async () => {
    return { authenticated: isAuthenticated() }
  })

  ipcMain.handle(IPC_CHANNELS.GMAIL_LOGIN, async () => {
    await authenticate()
  })

  ipcMain.handle(IPC_CHANNELS.GMAIL_LOGOUT, async () => {
    logout()
    gmail = null
  })
}
