import { useState } from 'react'
import { Bookmark, ChevronDown, ChevronRight, Trash2, Play } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import type { SavedPrompt } from '../../shared/types'

interface SavedPromptsListProps {
  prompts: SavedPrompt[]
  selectedId: string | null
  onSelect: (prompt: SavedPrompt) => void
  onDelete: (id: string) => void
}

export function SavedPromptsList({
  prompts,
  selectedId,
  onSelect,
  onDelete,
}: SavedPromptsListProps) {
  const [isOpen, setIsOpen] = useState(true)

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirm('Delete this prompt?')) {
      onDelete(id)
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-auto">
      {/* Section header */}
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 py-2 w-full group">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Saved Prompts
          </span>
          {prompts.length > 0 && (
            <span className="text-xs text-muted-foreground/60">
              {prompts.length}
            </span>
          )}
        </button>
      </CollapsibleTrigger>

      <Separator className="mb-2" />

      <CollapsibleContent>
        {prompts.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-xs text-muted-foreground">
              No saved prompts yet
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Save a prompt to reuse it later
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {prompts.map((prompt) => (
              <div
                key={prompt.id}
                onClick={() => onSelect(prompt)}
                className={cn(
                  "group relative flex items-center gap-2 py-2 px-3 -mx-1 rounded-md cursor-pointer",
                  "transition-all duration-150",
                  "hover:bg-muted/50",
                  selectedId === prompt.id && "bg-muted border-l-2 border-primary"
                )}
              >
                <Play className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="flex-1 text-sm truncate">
                  {prompt.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDelete(e, prompt.id)}
                >
                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
