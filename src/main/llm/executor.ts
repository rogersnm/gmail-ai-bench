import { IpcMain, BrowserWindow } from 'electron'
import {
  sendMessageStream,
  createToolResultsMessage,
  ToolUseBlock,
} from './vertex-client'
import type { ContentBlock } from '@anthropic-ai/vertex-sdk/resources/messages'
import {
  listEmails,
  getEmail,
  sendEmail,
  createDraft,
  archiveEmail,
  trashEmail,
  markAsRead,
  markAsUnread,
  addLabel,
  removeLabel,
  getLabels,
  getThreadMessages,
} from '../gmail/gmail-client'
import {
  selectEmails,
  bulkAction,
  getVisibleEmails,
  getOpenEmail,
} from '../gmail/dom-tools'
import { IPC_CHANNELS, ExecutionStep, ConversationMessage } from '../../shared/types'

let currentExecution: AbortController | null = null

async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'search_messages':
      return await listEmails(
        input.query as string,
        (input.max_results as number) || 20
      )

    case 'get_message':
      return await getEmail(input.message_id as string)

    case 'get_thread':
      return await getThreadMessages(input.thread_id as string)

    case 'send_message':
      const sendId = await sendEmail({
        to: input.to as string,
        subject: input.subject as string,
        body: input.body as string,
        cc: input.cc as string | undefined,
        bcc: input.bcc as string | undefined,
      })
      return { success: true, message_id: sendId }

    case 'create_draft':
      const draftId = await createDraft({
        to: input.to as string,
        subject: input.subject as string,
        body: input.body as string,
        cc: input.cc as string | undefined,
      })
      return { success: true, draft_id: draftId }

    case 'archive_message':
      await archiveEmail(input.message_id as string)
      return { success: true }

    case 'trash_message':
      await trashEmail(input.message_id as string)
      return { success: true }

    case 'mark_as_read':
      await markAsRead(input.message_id as string)
      return { success: true }

    case 'mark_as_unread':
      await markAsUnread(input.message_id as string)
      return { success: true }

    case 'add_label':
      await addLabel(input.message_id as string, input.label_id as string)
      return { success: true }

    case 'remove_label':
      await removeLabel(input.message_id as string, input.label_id as string)
      return { success: true }

    case 'get_labels':
      return await getLabels()

    // DOM interaction tools
    case 'select_threads':
      return await selectEmails({
        by: input.by as 'all' | 'none' | 'read' | 'unread' | 'sender' | 'subject' | 'index',
        value: input.value as string | undefined,
      })

    case 'bulk_action':
      return await bulkAction(input.action as string)

    case 'get_visible_threads':
      return await getVisibleEmails()

    case 'get_open_email':
      return await getOpenEmail()

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

function sendUpdate(window: BrowserWindow, step: ExecutionStep): void {
  window.webContents.send(IPC_CHANNELS.EXECUTION_UPDATE, step)
}

async function runPromptExecution(
  prompt: string,
  window: BrowserWindow,
  abortSignal: AbortSignal,
  existingHistory: ConversationMessage[] = []
): Promise<ConversationMessage[]> {
  // Start with existing history or create new conversation
  const messages: ConversationMessage[] = [
    ...existingHistory,
    {
      role: 'user',
      content: [{ type: 'text', text: prompt }],
    },
  ]

  // Agentic loop - continue until model stops requesting tools
  while (!abortSignal.aborted) {
    const stream = sendMessageStream(messages)

    // Track content blocks as they stream in
    const assistantContent: ContentBlock[] = []
    const toolUses: ToolUseBlock[] = []
    let currentTextContent = ''
    let currentToolUse: { id: string; name: string; input: string } | null = null

    // Process streaming events
    for await (const event of stream) {
      if (abortSignal.aborted) break

      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'text') {
          currentTextContent = ''
        } else if (event.content_block.type === 'tool_use') {
          currentToolUse = {
            id: event.content_block.id,
            name: event.content_block.name,
            input: '',
          }
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          currentTextContent += event.delta.text
          // Stream text to UI in real-time
          sendUpdate(window, {
            type: 'response',
            content: event.delta.text,
            timestamp: Date.now(),
          })
        } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
          currentToolUse.input += event.delta.partial_json
        }
      } else if (event.type === 'content_block_stop') {
        if (currentTextContent) {
          assistantContent.push({ type: 'text', text: currentTextContent })
          currentTextContent = ''
        }
        if (currentToolUse) {
          const parsedInput = JSON.parse(currentToolUse.input || '{}')
          const toolUseBlock: ToolUseBlock = {
            type: 'tool_use',
            id: currentToolUse.id,
            name: currentToolUse.name,
            input: parsedInput,
          }
          assistantContent.push({
            type: 'tool_use',
            id: currentToolUse.id,
            name: currentToolUse.name,
            input: parsedInput,
          })
          toolUses.push(toolUseBlock)
          sendUpdate(window, {
            type: 'tool_call',
            content: `Calling ${currentToolUse.name}`,
            toolCall: { name: currentToolUse.name, input: parsedInput },
            timestamp: Date.now(),
          })
          currentToolUse = null
        }
      }
    }

    // Get the final message to check stop reason
    const finalMessage = await stream.finalMessage()

    // Add assistant message to conversation
    messages.push({
      role: 'assistant',
      content: assistantContent,
    })

    // If no tool uses, we're done
    if (toolUses.length === 0 || finalMessage.stop_reason === 'end_turn') {
      return messages
    }

    // Execute tools and collect results
    const toolResults: Array<{ toolUseId: string; result: unknown; isError: boolean }> = []

    for (const toolUse of toolUses) {
      if (abortSignal.aborted) break

      try {
        const result = await executeTool(toolUse.name, toolUse.input)
        sendUpdate(window, {
          type: 'tool_result',
          content: JSON.stringify(result, null, 2),
          timestamp: Date.now(),
        })
        toolResults.push({ toolUseId: toolUse.id, result, isError: false })
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        sendUpdate(window, {
          type: 'tool_result',
          content: `Error: ${errorMessage}`,
          timestamp: Date.now(),
        })
        toolResults.push({ toolUseId: toolUse.id, result: { error: errorMessage }, isError: true })
      }
    }

    // Add all tool results as a single user message
    if (toolResults.length > 0) {
      messages.push(createToolResultsMessage(toolResults))
    }
  }

  // Return messages even if aborted (for partial history)
  return messages
}

export function setupVertexHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_PROMPT,
    async (event, prompt: string, history?: ConversationMessage[]) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) {
        throw new Error('No window found')
      }

      // Cancel any existing execution
      if (currentExecution) {
        currentExecution.abort()
      }

      currentExecution = new AbortController()

      try {
        const updatedHistory = await runPromptExecution(
          prompt,
          window,
          currentExecution.signal,
          history || []
        )
        return updatedHistory
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Execution was cancelled
          return history || []
        }
        throw error
      } finally {
        currentExecution = null
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.CANCEL_EXECUTION, async () => {
    if (currentExecution) {
      currentExecution.abort()
      currentExecution = null
    }
  })
}
