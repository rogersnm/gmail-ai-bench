import React, { useState, useEffect } from 'react'
import { PromptEditor } from './components/PromptEditor'
import { ExecutionLog } from './components/ExecutionLog'
import { SavedPrompts } from './components/SavedPrompts'
import { usePromptExecution } from './hooks/usePromptExecution'
import type { SavedPrompt } from '../shared/types'

declare global {
  interface Window {
    electronAPI: {
      executePrompt: (prompt: string) => Promise<void>
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

  const { steps, isRunning, execute, cancel, clearLog } = usePromptExecution()

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
    clearLog()
    await execute(prompt)
  }

  const handleSave = async (name: string) => {
    const saved = await window.electronAPI.savePrompt({ name, content: prompt })
    setSavedPrompts((prev) => [...prev, saved])
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
    <div className="app">
      <header className="header">
        <h1>Prompt Bench</h1>
        <div className={`auth-status ${isAuthenticated ? 'connected' : 'disconnected'}`}>
          {isAuthenticated ? (
            <>
              <span>Gmail Connected</span>
              <button className="btn btn-secondary" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <span>Gmail Not Connected</span>
              <button className="btn btn-primary" onClick={handleLogin}>
                Connect Gmail
              </button>
            </>
          )}
        </div>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <SavedPrompts
            prompts={savedPrompts}
            selectedId={selectedPromptId}
            onSelect={handleSelectPrompt}
            onDelete={handleDelete}
          />
        </aside>

        <main className="prompt-area">
          <PromptEditor
            value={prompt}
            onChange={setPrompt}
            onRun={handleRun}
            onCancel={cancel}
            onSave={handleSave}
            isRunning={isRunning}
            disabled={!isAuthenticated}
          />
          <ExecutionLog steps={steps} />
        </main>
      </div>
    </div>
  )
}
