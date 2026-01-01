import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, ExecutionStep, SavedPrompt } from '../shared/types'

export interface ElectronAPI {
  // Prompt execution
  executePrompt: (prompt: string) => Promise<void>
  onExecutionUpdate: (callback: (step: ExecutionStep) => void) => () => void
  cancelExecution: () => Promise<void>

  // Saved prompts
  getSavedPrompts: () => Promise<SavedPrompt[]>
  savePrompt: (prompt: Omit<SavedPrompt, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SavedPrompt>
  deletePrompt: (id: string) => Promise<void>

  // Gmail auth
  getGmailAuthStatus: () => Promise<{ authenticated: boolean }>
  gmailLogin: () => Promise<void>
  gmailLogout: () => Promise<void>
}

const api: ElectronAPI = {
  // Prompt execution
  executePrompt: (prompt: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_PROMPT, prompt),

  onExecutionUpdate: (callback: (step: ExecutionStep) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, step: ExecutionStep) => callback(step)
    ipcRenderer.on(IPC_CHANNELS.EXECUTION_UPDATE, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EXECUTION_UPDATE, handler)
  },

  cancelExecution: () =>
    ipcRenderer.invoke(IPC_CHANNELS.CANCEL_EXECUTION),

  // Saved prompts
  getSavedPrompts: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SAVED_PROMPTS),

  savePrompt: (prompt) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_PROMPT, prompt),

  deletePrompt: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_PROMPT, id),

  // Gmail auth
  getGmailAuthStatus: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GMAIL_AUTH_STATUS),

  gmailLogin: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GMAIL_LOGIN),

  gmailLogout: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GMAIL_LOGOUT),
}

contextBridge.exposeInMainWorld('electronAPI', api)
