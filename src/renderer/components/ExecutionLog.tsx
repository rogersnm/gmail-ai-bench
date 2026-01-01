import React, { useEffect, useRef } from 'react'
import type { ExecutionStep } from '../../shared/types'

interface ExecutionLogProps {
  steps: ExecutionStep[]
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString()
}

function LogEntry({ step }: { step: ExecutionStep }) {
  return (
    <div className="log-entry">
      <div className="log-entry-header">
        <span className={`log-entry-type ${step.type}`}>{step.type.replace('_', ' ')}</span>
        <span className="log-entry-time">{formatTime(step.timestamp)}</span>
      </div>
      {step.type === 'tool_call' && step.toolCall ? (
        <div className="tool-call-details">
          <div className="tool-call-name">{step.toolCall.name}</div>
          <div className="tool-call-input">
            {JSON.stringify(step.toolCall.input, null, 2)}
          </div>
        </div>
      ) : (
        <div className="log-entry-content">{step.content}</div>
      )}
    </div>
  )
}

export function ExecutionLog({ steps }: ExecutionLogProps) {
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-scroll to bottom when new steps are added
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [steps])

  return (
    <div className="execution-log" ref={logRef}>
      {steps.length === 0 ? (
        <div className="execution-log-empty">
          Execution log will appear here...
        </div>
      ) : (
        steps.map((step, index) => <LogEntry key={index} step={step} />)
      )}
    </div>
  )
}
