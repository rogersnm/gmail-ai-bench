import { IpcMain, BrowserWindow } from 'electron'
import {
  sendMessage,
  createToolResultMessage,
  ConversationMessage,
  ResponseBlock,
  ToolUseBlock,
} from './bedrock-client'
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
} from '../gmail/gmail-client'
import { IPC_CHANNELS, ExecutionStep } from '../../shared/types'

let currentExecution: AbortController | null = null

async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'search_emails':
      return await listEmails(
        input.query as string,
        (input.max_results as number) || 20
      )

    case 'read_email':
      return await getEmail(input.email_id as string)

    case 'send_email':
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

    case 'archive_email':
      await archiveEmail(input.email_id as string)
      return { success: true }

    case 'trash_email':
      await trashEmail(input.email_id as string)
      return { success: true }

    case 'mark_as_read':
      await markAsRead(input.email_id as string)
      return { success: true }

    case 'mark_as_unread':
      await markAsUnread(input.email_id as string)
      return { success: true }

    case 'add_label':
      await addLabel(input.email_id as string, input.label_id as string)
      return { success: true }

    case 'remove_label':
      await removeLabel(input.email_id as string, input.label_id as string)
      return { success: true }

    case 'get_labels':
      return await getLabels()

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
  abortSignal: AbortSignal
): Promise<void> {
  const messages: ConversationMessage[] = [
    {
      role: 'user',
      content: [{ text: prompt }],
    },
  ]

  // Agentic loop - continue until model stops requesting tools
  while (!abortSignal.aborted) {
    const response = await sendMessage(messages)

    // Process response content - convert to Bedrock's ContentBlock format
    const assistantContent: Array<{ text: string } | { toolUse: { toolUseId: string; name: string; input: Record<string, unknown> } }> = []
    const toolUses: ToolUseBlock[] = []

    for (const block of response.content) {
      if (block.type === 'text') {
        assistantContent.push({ text: block.text })
        sendUpdate(window, {
          type: 'response',
          content: block.text,
          timestamp: Date.now(),
        })
      } else if (block.type === 'tool_use') {
        assistantContent.push({
          toolUse: {
            toolUseId: block.id,
            name: block.name,
            input: block.input,
          },
        })
        toolUses.push(block)
        sendUpdate(window, {
          type: 'tool_call',
          content: `Calling ${block.name}`,
          toolCall: { name: block.name, input: block.input },
          timestamp: Date.now(),
        })
      }
    }

    // Add assistant message to conversation
    messages.push({
      role: 'assistant',
      content: assistantContent as any,
    })

    // If no tool uses, we're done
    if (toolUses.length === 0 || response.stopReason === 'end_turn') {
      break
    }

    // Execute tools and add results
    for (const toolUse of toolUses) {
      if (abortSignal.aborted) break

      try {
        const result = await executeTool(toolUse.name, toolUse.input)
        sendUpdate(window, {
          type: 'tool_result',
          content: JSON.stringify(result, null, 2),
          timestamp: Date.now(),
        })
        messages.push(createToolResultMessage(toolUse.id, result))
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        sendUpdate(window, {
          type: 'tool_result',
          content: `Error: ${errorMessage}`,
          timestamp: Date.now(),
        })
        messages.push(createToolResultMessage(toolUse.id, { error: errorMessage }, true))
      }
    }
  }
}

export function setupBedrockHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.EXECUTE_PROMPT, async (event, prompt: string) => {
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
      await runPromptExecution(prompt, window, currentExecution.signal)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Execution was cancelled
        return
      }
      throw error
    } finally {
      currentExecution = null
    }
  })

  ipcMain.handle(IPC_CHANNELS.CANCEL_EXECUTION, async () => {
    if (currentExecution) {
      currentExecution.abort()
      currentExecution = null
    }
  })
}
