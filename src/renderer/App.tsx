import { useState, useEffect } from 'react'
import { Header } from './components/Header'
import { PromptInput } from './components/PromptInput'
import { ActivityFeed } from './components/ActivityFeed'
import { SavedPromptsList } from './components/SavedPromptsList'
import { usePromptExecution } from './hooks/usePromptExecution'
import { Separator } from './components/ui/separator'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './components/ui/dialog'
import type { SavedPrompt, ConversationMessage } from '../shared/types'

declare global {
  interface Window {
    electronAPI: {
      executePrompt: (prompt: string, history?: ConversationMessage[]) => Promise<ConversationMessage[]>
      onExecutionUpdate: (callback: (step: any) => void) => () => void
      cancelExecution: () => Promise<void>
      getSavedPrompts: () => Promise<SavedPrompt[]>
      savePrompt: (prompt: { name: string; content: string }) => Promise<SavedPrompt>
      deletePrompt: (id: string) => Promise<void>
      getGmailAuthStatus: () => Promise<{ authenticated: boolean }>
      gmailLogin: () => Promise<void>
      gmailLogout: () => Promise<void>
    }
  }
}

export default function App() {
  const [prompt, setPrompt] = useState('')
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([])
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Save dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [promptToSave, setPromptToSave] = useState('')
  const [saveName, setSaveName] = useState('')

  const { steps, isRunning, hasConversation, userMessageCount, execute, cancel, newConversation } = usePromptExecution()

  useEffect(() => {
    // Load saved prompts
    window.electronAPI.getSavedPrompts().then(setSavedPrompts)

    // Check auth status
    window.electronAPI.getGmailAuthStatus().then(({ authenticated }) => {
      setIsAuthenticated(authenticated)
    })
  }, [])

  const handleRun = async () => {
    if (!prompt.trim() || isRunning) return
    const promptToRun = prompt
    setPrompt('') // Clear input for follow-up
    await execute(promptToRun)
  }

  const handleNewPrompt = () => {
    setPrompt('')
    setSelectedPromptId(null)
    newConversation()
  }

  const handleOpenSaveDialog = (content: string) => {
    setPromptToSave(content)
    setSaveName('')
    setShowSaveDialog(true)
  }

  const handleSave = async () => {
    if (!saveName.trim()) return
    const saved = await window.electronAPI.savePrompt({ name: saveName.trim(), content: promptToSave })
    setSavedPrompts((prev) => [...prev, saved])
    setShowSaveDialog(false)
    setSaveName('')
    setPromptToSave('')
  }

  const handleDelete = async (id: string) => {
    await window.electronAPI.deletePrompt(id)
    setSavedPrompts((prev) => prev.filter((p) => p.id !== id))
    if (selectedPromptId === id) {
      setSelectedPromptId(null)
    }
  }

  const handleSelectPrompt = (savedPrompt: SavedPrompt) => {
    setPrompt(savedPrompt.content)
    setSelectedPromptId(savedPrompt.id)
    newConversation() // Start fresh when selecting a saved prompt
  }

  const handleLogin = async () => {
    try {
      await window.electronAPI.gmailLogin()
      setIsAuthenticated(true)
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  const handleLogout = async () => {
    await window.electronAPI.gmailLogout()
    setIsAuthenticated(false)
  }

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header */}
      <Header
        isAuthenticated={isAuthenticated}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      <Separator className="my-2" />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0 gap-4">
        {/* Prompt Input - Hero element */}
        <div className="flex-shrink-0">
          <PromptInput
            value={prompt}
            onChange={setPrompt}
            onRun={handleRun}
            onCancel={cancel}
            onNewPrompt={handleNewPrompt}
            isRunning={isRunning}
            disabled={!isAuthenticated}
            hasConversation={hasConversation}
          />
        </div>

        {/* Activity Feed - Takes remaining space */}
        <ActivityFeed
          steps={steps}
          isRunning={isRunning}
          onSavePrompt={handleOpenSaveDialog}
        />

        {/* Saved Prompts - Collapsible at bottom */}
        <div className="flex-shrink-0">
          <SavedPromptsList
            prompts={savedPrompts}
            selectedId={selectedPromptId}
            onSelect={handleSelectPrompt}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Save Prompt Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Prompt</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Enter a name for this prompt..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
              }}
            />
            <p className="mt-2 text-xs text-muted-foreground truncate">
              {promptToSave}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!saveName.trim()}
            >
              Save Prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
