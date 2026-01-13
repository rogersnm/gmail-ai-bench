import { AnthropicVertex } from '@anthropic-ai/vertex-sdk'
import { GoogleAuth } from 'google-auth-library'
import type { MessageStream } from '@anthropic-ai/vertex-sdk/lib/streaming'
import type { MessageParam, ContentBlockParam, ToolResultBlockParam } from '@anthropic-ai/vertex-sdk/resources/messages'
import { gmailTools } from './tools'
import { join } from 'path'

const MODEL_ID = process.env.VERTEX_MODEL || 'claude-opus-4-5@20251101'
const VERTEX_REGION = process.env.CLOUD_ML_REGION || 'global'
const VERTEX_PROJECT_ID =
  process.env.ANTHROPIC_VERTEX_PROJECT_ID || 'gen-lang-client-0663149603'

// Path to credentials file (in resources folder, like client_secret.json)
const CREDENTIALS_PATH = join(__dirname, '../../resources/vertex-credentials.json')

let client: AnthropicVertex | null = null

function getClient(): AnthropicVertex {
  if (client) return client

  // Use static service account credentials
  const googleAuth = new GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
  })

  client = new AnthropicVertex({
    googleAuth,
    region: VERTEX_REGION,
    projectId: VERTEX_PROJECT_ID,
  })
  return client
}

// Message types - maintain compatibility with existing code
export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: ContentBlockParam[]
}

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface TextBlock {
  type: 'text'
  text: string
}

export type ResponseBlock = ToolUseBlock | TextBlock

export interface VertexResponse {
  stopReason: string
  content: ResponseBlock[]
}

const SYSTEM_PROMPT = `You are an AI assistant that helps users manage their Gmail inbox. You have access to tools that let you search, read, send, and organize emails.

When the user asks you to do something with their email:
1. First, think about what tools you need to accomplish the task
2. Use the tools to gather information or take actions
3. Provide a clear summary of what you did or found

Be concise in your responses. When showing email contents, summarize unless the user asks for the full text.

You also have tools to interact directly with the Gmail UI:
- select_emails: Select emails by various criteria (all, none, read, unread, sender match, subject match, or specific indices)
- bulk_action: Perform actions on selected emails (archive, delete, spam, not_spam, mark_read, mark_unread, star, unstar)
- get_visible_emails: See what emails are currently displayed in the inbox

For bulk actions like reporting spam: use select_emails first to select the emails, then bulk_action with the desired action.

Important guidelines:
- Always confirm before sending emails or making permanent changes
- When searching emails, use Gmail's search syntax for precise results
- If a task requires multiple steps, explain your plan before executing
- For spam reporting or bulk operations, prefer the UI tools (select_emails + bulk_action) over individual API calls`

// Convert our internal message format to Anthropic SDK format
function convertToAnthropicMessages(messages: ConversationMessage[]): MessageParam[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }))
}

// Tool configuration for Anthropic SDK
const tools = gmailTools.map((tool) => ({
  name: tool.name,
  description: tool.description,
  input_schema: tool.input_schema as {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  },
}))

// Stream messages and return async iterator
export function sendMessageStream(messages: ConversationMessage[]): MessageStream {
  const vertexClient = getClient()

  return vertexClient.messages.stream({
    model: MODEL_ID,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: convertToAnthropicMessages(messages),
    tools,
  })
}

// Create tool results message in Anthropic format
export function createToolResultsMessage(
  results: Array<{ toolUseId: string; result: unknown; isError: boolean }>
): ConversationMessage {
  const content: ToolResultBlockParam[] = results.map(({ toolUseId, result, isError }) => ({
    type: 'tool_result' as const,
    tool_use_id: toolUseId,
    content: JSON.stringify(result, null, 2),
    is_error: isError,
  }))

  return {
    role: 'user',
    content,
  }
}
