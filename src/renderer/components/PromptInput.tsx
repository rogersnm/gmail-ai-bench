import React from 'react'
import { Play, RotateCcw, Loader2, Command } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'

interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  onRun: () => void
  onCancel: () => void
  onNewPrompt: () => void
  isRunning: boolean
  disabled: boolean
  hasConversation: boolean
}

export function PromptInput({
  value,
  onChange,
  onRun,
  onCancel,
  onNewPrompt,
  isRunning,
  disabled,
  hasConversation,
}: PromptInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (!isRunning && !disabled && value.trim()) {
        onRun()
      }
    }
  }

  const getPlaceholder = () => {
    if (disabled) return 'Connect to Gmail first...'
    if (isRunning) return 'Processing...'
    if (hasConversation) return 'Type a follow-up message...'
    return 'What would you like to do with your emails?\n\nExample: "Find unread emails from this week and summarize them"'
  }

  return (
    <div className="space-y-3">
      {/* Prompt textarea - the hero element */}
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          disabled={disabled || isRunning}
          className={cn(
            "min-h-[140px] text-[15px] leading-relaxed pr-4",
            "placeholder:text-muted-foreground/60",
            isRunning && "opacity-60"
          )}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {hasConversation && !isRunning && (
          <Button
            variant="outline"
            size="sm"
            onClick={onNewPrompt}
            className="gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New
          </Button>
        )}

        {isRunning ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={onCancel}
            className="gap-1.5"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Cancel
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onRun}
            disabled={disabled || !value.trim()}
            className="gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            {hasConversation ? 'Send' : 'Run'}
            <kbd className="ml-1 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border bg-primary-foreground/10 px-1.5 font-mono text-[10px] font-medium text-primary-foreground/70">
              <Command className="w-2.5 h-2.5" />
              <span>↵</span>
            </kbd>
          </Button>
        )}
      </div>
    </div>
  )
}
