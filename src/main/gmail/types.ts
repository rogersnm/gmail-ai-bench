export interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload?: {
    headers: Array<{ name: string; value: string }>
    body?: { data?: string }
    parts?: Array<{
      mimeType: string
      body?: { data?: string }
    }>
  }
  internalDate: string
}

export interface ParsedEmail {
  id: string
  threadId: string
  subject: string
  from: string
  to: string
  date: string
  snippet: string
  body: string
  labelIds: string[]
}

export interface GmailLabel {
  id: string
  name: string
  type: string
}

export interface SendEmailParams {
  to: string
  subject: string
  body: string
  cc?: string
  bcc?: string
}
