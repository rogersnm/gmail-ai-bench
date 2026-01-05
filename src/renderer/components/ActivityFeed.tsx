import { useEffect, useRef } from 'react'
import { Activity } from 'lucide-react'
import { cn } from '../lib/utils'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { ActivityItem } from './ActivityItem'
import type { ExecutionStep } from '../../shared/types'

interface ActivityFeedProps {
  steps: ExecutionStep[]
  isRunning?: boolean
  onSavePrompt?: (content: string) => void
}

export function ActivityFeed({ steps, isRunning, onSavePrompt }: ActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new steps are added
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [steps])

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Section header */}
      <div className="flex items-center gap-2 py-2">
        <Activity className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Activity
        </span>
        {steps.length > 0 && (
          <span className="text-xs text-muted-foreground/60">
            {steps.length} {steps.length === 1 ? 'item' : 'items'}
          </span>
        )}
        {isRunning && (
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-subtle" />
            <span className="text-xs text-primary">Running</span>
          </div>
        )}
      </div>

      <Separator className="mb-2" />

      {/* Activity list */}
      <ScrollArea ref={scrollRef} className="flex-1">
        {steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <Activity className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Activity will appear here
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Run a prompt to get started
            </p>
          </div>
        ) : (
          <div className="space-y-1 pr-4">
            {steps.map((step, index) => (
              <ActivityItem
                key={index}
                step={step}
                isLatest={index === steps.length - 1 && isRunning}
                onSavePrompt={onSavePrompt}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
