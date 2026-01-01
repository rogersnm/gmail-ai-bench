import React from 'react'
import type { SavedPrompt } from '../../shared/types'

interface SavedPromptsProps {
  prompts: SavedPrompt[]
  selectedId: string | null
  onSelect: (prompt: SavedPrompt) => void
  onDelete: (id: string) => void
}

export function SavedPrompts({
  prompts,
  selectedId,
  onSelect,
  onDelete,
}: SavedPromptsProps) {
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirm('Delete this prompt?')) {
      onDelete(id)
    }
  }

  return (
    <>
      <h2>Saved Prompts</h2>
      <div className="saved-prompts-list">
        {prompts.length === 0 ? (
          <div style={{ color: '#666', fontSize: '13px', padding: '8px' }}>
            No saved prompts yet
          </div>
        ) : (
          prompts.map((prompt) => (
            <div
              key={prompt.id}
              className={`saved-prompt-item ${selectedId === prompt.id ? 'active' : ''}`}
              onClick={() => onSelect(prompt)}
            >
              <span>{prompt.name}</span>
              <button
                className="delete-btn"
                onClick={(e) => handleDelete(e, prompt.id)}
              >
                x
              </button>
            </div>
          ))
        )}
      </div>
    </>
  )
}
