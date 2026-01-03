import { useState, useEffect, useCallback } from 'react'
import type { ExecutionStep, ConversationMessage } from '../../shared/types'

export function usePromptExecution() {
  const [steps, setSteps] = useState<ExecutionStep[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])

  // Track if we're in a multi-turn conversation (has history from previous turns)
  const hasConversation = conversationHistory.length > 0

  useEffect(() => {
    const unsubscribe = window.electronAPI.onExecutionUpdate((step) => {
      setSteps((prev) => [...prev, step])
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const execute = useCallback(async (prompt: string) => {
    setIsRunning(true)
    try {
      const updatedHistory = await window.electronAPI.executePrompt(prompt, conversationHistory)
      setConversationHistory(updatedHistory)
    } catch (error) {
      setSteps((prev) => [
        ...prev,
        {
          type: 'response',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        },
      ])
    } finally {
      setIsRunning(false)
    }
  }, [conversationHistory])

  const cancel = useCallback(async () => {
    await window.electronAPI.cancelExecution()
    setIsRunning(false)
    setSteps((prev) => [
      ...prev,
      {
        type: 'response',
        content: 'Execution cancelled',
        timestamp: Date.now(),
      },
    ])
  }, [])

  const clearLog = useCallback(() => {
    setSteps([])
  }, [])

  // Start a new conversation (clears history and log)
  const newConversation = useCallback(() => {
    setSteps([])
    setConversationHistory([])
  }, [])

  return { steps, isRunning, hasConversation, execute, cancel, clearLog, newConversation }
}
