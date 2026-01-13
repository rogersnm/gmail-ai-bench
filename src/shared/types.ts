// Shared types between main and renderer processes

export interface Email {
  id: string
  threadId: string
  subject: string
  from: string
  to: string
  date: string
  snippet: string
  body?: string
  labelIds: string[]
}

export interface SavedPrompt {
  id: string
  name: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface ToolCall {
  name: string
  input: Record<string, unknown>
}

// Conversation history for multi-turn conversations
export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: unknown[] // ContentBlock array from Vertex
}

export interface ExecutionStep {
  type: 'user' | 'thinking' | 'tool_call' | 'tool_result' | 'response'
  content: string
  toolCall?: ToolCall
  timestamp: number
}

export interface PromptExecution {
  id: string
  prompt: string
  steps: ExecutionStep[]
  status: 'running' | 'completed' | 'error'
  startedAt: number
  completedAt?: number
  error?: string
}

// IPC channel names
export const IPC_CHANNELS = {
  // Prompt execution
  EXECUTE_PROMPT: 'execute-prompt',
  EXECUTION_UPDATE: 'execution-update',
  CANCEL_EXECUTION: 'cancel-execution',

  // Saved prompts
  GET_SAVED_PROMPTS: 'get-saved-prompts',
  SAVE_PROMPT: 'save-prompt',
  DELETE_PROMPT: 'delete-prompt',

  // Gmail
  GMAIL_AUTH_STATUS: 'gmail-auth-status',
  GMAIL_LOGIN: 'gmail-login',
  GMAIL_LOGOUT: 'gmail-logout',

  // Gmail DOM tools
  GMAIL_SELECT_EMAILS: 'gmail:select-emails',
  GMAIL_SELECT_EMAILS_RESULT: 'gmail:select-emails-result',
  GMAIL_BULK_ACTION: 'gmail:bulk-action',
  GMAIL_BULK_ACTION_RESULT: 'gmail:bulk-action-result',
  GMAIL_GET_VISIBLE: 'gmail:get-visible',
  GMAIL_GET_VISIBLE_RESULT: 'gmail:get-visible-result',
  GMAIL_GET_OPEN_EMAIL: 'gmail:get-open-email',
  GMAIL_GET_OPEN_EMAIL_RESULT: 'gmail:get-open-email-result',
} as const
