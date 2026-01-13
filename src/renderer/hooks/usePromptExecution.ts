import { useState, useEffect, useCallback } from 'react'
import type { ExecutionStep, ConversationMessage } from '../../shared/types'

export function usePromptExecution() {
  const [steps, setSteps] = useState<ExecutionStep[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])

  // Track if we're in a multi-turn conversation (has history from previous turns)
  const hasConversation = conversationHistory.length > 0
  const userMessageCount = conversationHistory.filter(m => m.role === 'user').length

  useEffect(() => {
    const unsubscribe = window.electronAPI.onExecutionUpdate((step) => {
      setSteps((prev) => {
        // For streaming responses, append to the last response step if one exists
        if (step.type === 'response') {
          const lastStep = prev[prev.length - 1]
          if (lastStep?.type === 'response') {
            // Append to existing response step
            return [
              ...prev.slice(0, -1),
              { ...lastStep, content: lastStep.content + step.content },
            ]
          }
        }
        // Otherwise add as new step
        return [...prev, step]
      })
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const execute = useCallback(async (prompt: string) => {
    setIsRunning(true)
    // Add user message to conversation history immediately
    setConversationHistory((prev) => [
      ...prev,
      { role: 'user', content: [{ text: prompt }] },
    ])
    // Add user message to the log
    setSteps((prev) => [
      ...prev,
      {
        type: 'user',
        content: prompt,
        timestamp: Date.now(),
      },
    ])
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

  return { steps, isRunning, hasConversation, userMessageCount, execute, cancel, clearLog, newConversation }
}
