import { useState } from 'react'
import { ChevronDown, ChevronRight, Bot, Wrench, CheckCircle2, User, Save } from 'lucide-react'
import { Streamdown } from 'streamdown'
import { cn, formatRelativeTime } from '../lib/utils'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import type { ExecutionStep } from '../../shared/types'

interface ActivityItemProps {
  step: ExecutionStep
  isLatest?: boolean
  onSavePrompt?: (content: string) => void
}

// Transform tool call to human-readable summary
function getToolSummary(toolCall: { name: string; input: Record<string, unknown> }): string {
  const { name, input } = toolCall

  switch (name) {
    case 'search_emails':
      return `Searching emails: "${input.query || 'all'}"`
    case 'read_email':
      return `Reading email...`
    case 'send_email':
      return `Sending email to ${input.to}`
    case 'archive_emails':
      return `Archiving ${Array.isArray(input.emailIds) ? input.emailIds.length : 1} email(s)`
    case 'label_emails':
      return `Applying label "${input.labelName}"`
    case 'delete_emails':
      return `Deleting ${Array.isArray(input.emailIds) ? input.emailIds.length : 1} email(s)`
    default:
      return `Running ${name.replace(/_/g, ' ')}`
  }
}

function getTypeConfig(type: ExecutionStep['type']) {
  switch (type) {
    case 'response':
      return {
        icon: Bot,
        label: 'AI',
        variant: 'response' as const,
        indicator: '●',
      }
    case 'tool_call':
      return {
        icon: Wrench,
        label: 'Tool',
        variant: 'tool' as const,
        indicator: '◆',
      }
    case 'tool_result':
      return {
        icon: CheckCircle2,
        label: 'Result',
        variant: 'result' as const,
        indicator: '◉',
      }
    case 'user':
      return {
        icon: User,
        label: 'You',
        variant: 'user' as const,
        indicator: '▸',
      }
    default:
      return {
        icon: Bot,
        label: type,
        variant: 'secondary' as const,
        indicator: '●',
      }
  }
}

export function ActivityItem({ step, isLatest, onSavePrompt }: ActivityItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = getTypeConfig(step.type)
  const Icon = config.icon

  const hasExpandableContent = step.type === 'tool_call' && step.toolCall

  // Get display content
  const getDisplayContent = () => {
    if (step.type === 'tool_call' && step.toolCall) {
      return getToolSummary(step.toolCall)
    }
    return step.content
  }

  // Try to pretty-print JSON content for tool results
  const getFormattedToolResult = () => {
    try {
      const parsed = JSON.parse(step.content)
      return JSON.stringify(parsed, null, 2)
    } catch {
      // Not valid JSON, return as-is
      return step.content
    }
  }

  return (
    <div
      className={cn(
        "animate-slide-in",
        "group relative py-3 px-3 -mx-3 rounded-lg transition-colors",
        "hover:bg-muted/50"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Type indicator */}
        <div className="flex-shrink-0 mt-0.5">
          <Badge variant={config.variant} className="gap-1 text-[10px] px-1.5 py-0">
            <Icon className="w-3 h-3" />
            {config.label}
          </Badge>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {step.type === 'response' ? (
            <div className="prose prose-sm prose-slate max-w-none
              prose-p:text-foreground prose-p:leading-relaxed prose-p:my-2
              prose-headings:text-foreground prose-headings:font-semibold
              prose-strong:text-foreground prose-strong:font-semibold
              prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg
              prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
            >
              <Streamdown isAnimating={isLatest}>
                {step.content}
              </Streamdown>
            </div>
          ) : step.type === 'tool_result' ? (
            <div className="p-2 rounded-md bg-muted/50 border border-border/50 max-h-[200px] overflow-auto">
              <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
                {getFormattedToolResult()}
              </pre>
            </div>
          ) : (
            <p className={cn(
              "text-sm leading-relaxed",
              step.type === 'user' ? "text-foreground" : "text-foreground/80"
            )}>
              {getDisplayContent()}
            </p>
          )}

          {/* Expandable details for tool calls */}
          {hasExpandableContent && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              {isExpanded ? 'Hide details' : 'Show details'}
            </button>
          )}

          {isExpanded && step.toolCall && (
            <div className="mt-2 p-2 rounded-md bg-muted/50 border border-border/50">
              <div className="text-xs font-mono text-muted-foreground">
                <span className="text-primary font-semibold">{step.toolCall.name}</span>
                <pre className="mt-1 whitespace-pre-wrap break-all text-[11px]">
                  {JSON.stringify(step.toolCall.input, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Timestamp and actions */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {/* Save button for user messages */}
          {step.type === 'user' && onSavePrompt && (
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onSavePrompt(step.content)}
              title="Save this prompt"
            >
              <Save className="w-3 h-3 text-muted-foreground hover:text-primary" />
            </Button>
          )}
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(step.timestamp)}
          </span>
        </div>
      </div>

      {/* Running indicator for latest item */}
      {isLatest && step.type !== 'response' && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-full animate-pulse-subtle" />
      )}
    </div>
  )
}
