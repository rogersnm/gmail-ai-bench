import {
  BedrockRuntimeClient,
  ConverseCommand,
  ContentBlock,
  Message,
  ToolConfiguration,
  ToolResultContentBlock,
} from '@aws-sdk/client-bedrock-runtime'
import { gmailTools } from './tools'

// Bedrock configuration - override via environment variables
const MODEL_ID = process.env.BEDROCK_MODEL || 'eu.anthropic.claude-opus-4-5-20251101-v1:0'
const BEDROCK_REGION = process.env.BEDROCK_REGION || 'eu-south-2'

let client: BedrockRuntimeClient | null = null

function getClient(): BedrockRuntimeClient {
  if (client) return client

  // Uses AWS profile credentials from ~/.aws/credentials
  client = new BedrockRuntimeClient({
    region: BEDROCK_REGION,
  })

  return client
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: ContentBlock[]
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

export interface BedrockResponse {
  stopReason: string
  content: ResponseBlock[]
}

const toolConfig: ToolConfiguration = {
  tools: gmailTools.map((tool) => ({
    toolSpec: {
      name: tool.name,
      description: tool.description,
      inputSchema: {
        json: tool.input_schema,
      },
    },
  })),
}

const SYSTEM_PROMPT = `You are an AI assistant that helps users manage their Gmail inbox. You have access to tools that let you search, read, send, and organize emails.

When the user asks you to do something with their email:
1. First, think about what tools you need to accomplish the task
2. Use the tools to gather information or take actions
3. Provide a clear summary of what you did or found

Be concise in your responses. When showing email contents, summarize unless the user asks for the full text.

Important guidelines:
- Always confirm before sending emails or making permanent changes
- When searching emails, use Gmail's search syntax for precise results
- If a task requires multiple steps, explain your plan before executing`

export async function sendMessage(
  messages: ConversationMessage[]
): Promise<BedrockResponse> {
  const bedrockClient = getClient()

  const command = new ConverseCommand({
    modelId: MODEL_ID,
    system: [{ text: SYSTEM_PROMPT }],
    messages: messages as Message[],
    toolConfig,
  })

  const response = await bedrockClient.send(command)

  const content: ResponseBlock[] = (response.output?.message?.content || []).map(
    (block) => {
      if ('text' in block && block.text) {
        return { type: 'text' as const, text: block.text }
      }
      if ('toolUse' in block && block.toolUse) {
        return {
          type: 'tool_use' as const,
          id: block.toolUse.toolUseId!,
          name: block.toolUse.name!,
          input: block.toolUse.input as Record<string, unknown>,
        }
      }
      throw new Error('Unknown block type')
    }
  )

  return {
    stopReason: response.stopReason || 'end_turn',
    content,
  }
}

export function createToolResultMessage(
  toolUseId: string,
  result: unknown,
  isError: boolean = false
): ConversationMessage {
  const content: ToolResultContentBlock = {
    toolResult: {
      toolUseId,
      content: [{ text: JSON.stringify(result, null, 2) }],
      status: isError ? 'error' : 'success',
    },
  }

  return {
    role: 'user',
    content: [content as ContentBlock],
  }
}
