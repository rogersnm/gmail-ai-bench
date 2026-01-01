import { useState, useEffect, useCallback } from 'react'
import type { ExecutionStep } from '../../shared/types'

export function usePromptExecution() {
  const [steps, setSteps] = useState<ExecutionStep[]>([])
  const [isRunning, setIsRunning] = useState(false)

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
      await window.electronAPI.executePrompt(prompt)
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
  }, [])

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

  return { steps, isRunning, execute, cancel, clearLog }
}
