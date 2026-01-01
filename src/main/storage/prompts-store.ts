import Store from 'electron-store'
import { IpcMain } from 'electron'
import { SavedPrompt, IPC_CHANNELS } from '../../shared/types'
import { randomUUID } from 'crypto'

interface StoreSchema {
  prompts: SavedPrompt[]
}

const store = new Store<StoreSchema>({
  name: 'saved-prompts',
  defaults: {
    prompts: [],
  },
})

export function getSavedPrompts(): SavedPrompt[] {
  return store.get('prompts')
}

export function savePrompt(prompt: { name: string; content: string }): SavedPrompt {
  const prompts = store.get('prompts')
  const now = Date.now()

  const newPrompt: SavedPrompt = {
    id: randomUUID(),
    name: prompt.name,
    content: prompt.content,
    createdAt: now,
    updatedAt: now,
  }

  store.set('prompts', [...prompts, newPrompt])
  return newPrompt
}

export function updatePrompt(
  id: string,
  updates: Partial<{ name: string; content: string }>
): SavedPrompt | null {
  const prompts = store.get('prompts')
  const index = prompts.findIndex((p) => p.id === id)

  if (index === -1) return null

  const updated: SavedPrompt = {
    ...prompts[index],
    ...updates,
    updatedAt: Date.now(),
  }

  prompts[index] = updated
  store.set('prompts', prompts)
  return updated
}

export function deletePrompt(id: string): boolean {
  const prompts = store.get('prompts')
  const filtered = prompts.filter((p) => p.id !== id)

  if (filtered.length === prompts.length) return false

  store.set('prompts', filtered)
  return true
}

export function setupPromptsStore(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.GET_SAVED_PROMPTS, async () => {
    return getSavedPrompts()
  })

  ipcMain.handle(
    IPC_CHANNELS.SAVE_PROMPT,
    async (_event, prompt: { name: string; content: string }) => {
      return savePrompt(prompt)
    }
  )

  ipcMain.handle(IPC_CHANNELS.DELETE_PROMPT, async (_event, id: string) => {
    return deletePrompt(id)
  })
}
