import React, { useState } from 'react'

interface PromptEditorProps {
  value: string
  onChange: (value: string) => void
  onRun: () => void
  onCancel: () => void
  onSave: (name: string) => void
  isRunning: boolean
  disabled: boolean
}

export function PromptEditor({
  value,
  onChange,
  onRun,
  onCancel,
  onSave,
  isRunning,
  disabled,
}: PromptEditorProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState('')

  const handleSave = () => {
    if (saveName.trim()) {
      onSave(saveName.trim())
      setSaveName('')
      setShowSaveDialog(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (!isRunning && !disabled && value.trim()) {
        onRun()
      }
    }
  }

  return (
    <div className="prompt-editor">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          disabled
            ? 'Connect to Gmail first to run prompts...'
            : 'Enter your prompt here... (Cmd+Enter to run)\n\nExample: "Find all unread emails from the last week and summarize them"'
        }
        disabled={disabled}
      />
      <div className="prompt-actions">
        {isRunning ? (
          <button className="btn btn-danger" onClick={onCancel}>
            Cancel
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={onRun}
            disabled={disabled || !value.trim()}
          >
            Run
          </button>
        )}
        <button
          className="btn btn-secondary"
          onClick={() => setShowSaveDialog(true)}
          disabled={!value.trim()}
        >
          Save Prompt
        </button>
      </div>

      {showSaveDialog && (
        <div className="save-prompt-dialog" onClick={() => setShowSaveDialog(false)}>
          <div
            className="save-prompt-dialog-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Save Prompt</h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Enter prompt name..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') setShowSaveDialog(false)
              }}
            />
            <div className="save-prompt-dialog-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={!saveName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
