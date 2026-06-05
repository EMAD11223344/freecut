/**
 * Active workspace root owner.
 *
 * Holds the single FileSystemDirectoryHandle the entire app writes to.
 * `setWorkspaceRoot` is called once by WorkspaceGate after the user picks
 * (or re-grants) their workspace folder. Every storage module calls
 * `requireWorkspaceRoot()` to get the handle.
 *
 * Kept deliberately minimal — no React, no Zustand. This is the lowest
 * layer: pure getter/setter + permission-lost signaling.
 *
 * In embedded mode (VITE_EMBEDDED), a noop proxy handle is returned so
 * storage operations degrade gracefully rather than crashing the app.
 * The parent Business-OS manages file storage; FreeCut Supabase features
 * (SaveToWorkspacePanel) provide the save path.
 */

import { createLogger } from '@/shared/logging/logger'

const logger = createLogger('WorkspaceRoot')

let activeRoot: FileSystemDirectoryHandle | null = null

type PermissionLostListener = () => void
const permissionLostListeners = new Set<PermissionLostListener>()

export function setWorkspaceRoot(handle: FileSystemDirectoryHandle | null): void {
  activeRoot = handle
  if (handle) {
    logger.info(`Workspace root set: ${handle.name}`)
  } else {
    logger.info('Workspace root cleared')
  }
}

export function getWorkspaceRoot(): FileSystemDirectoryHandle | null {
  return activeRoot
}

const embeddedMode = typeof import.meta !== 'undefined' && import.meta.env?.VITE_EMBEDDED

/**
 * Return the active root or a noop proxy in embedded mode.
 * Storage operations that receive this proxy will fail gracefully
 * (entry not found) instead of crashing the app.
 */
export function requireWorkspaceRoot(): FileSystemDirectoryHandle {
  if (!activeRoot) {
    if (embeddedMode) {
      return createNoopRootProxy()
    }
    throw new Error(
      'Workspace root is not set. The app must render <WorkspaceGate> before any storage operation runs.',
    )
  }
  return activeRoot
}

/**
 * In-memory workspace root for embedded mode. Stores files in a JS Map
 * so create/read/update/delete project operations work without the File
 * System Access API. Capacity resets on page reload.
 */
class InMemoryRoot {
  readonly kind = 'directory' as const
  readonly name = 'embedded-workspace'
  private store = new Map<string, string>() // path -> JSON string
  private children = new Map<string, Set<string>>() // dir -> set of child names

  constructor() {
    this.children.set('', new Set())
  }

  private normalize(p: string): string {
    return p.replace(/^\/+|\/+$/g, '')
  }

  private async getDir(path: string): Promise<InMemoryRoot> {
    const parts = this.normalize(path).split('/').filter(Boolean)
    let child: InMemoryRoot = this
    for (const part of parts) {
      const existing = child.dirs.get(part)
      if (existing) {
        child = existing
      } else {
        const dir = new InMemoryRoot()
        child.dirs.set(part, dir)
        child.ensureChild(part)
        child = dir
      }
    }
    return child
  }

  private dirs = new Map<string, InMemoryRoot>()
  private ensureChild(name: string) {
    const p = ''
    if (!this.children.has(p)) this.children.set(p, new Set())
    this.children.get(p)!.add(name)
  }

  getDirectoryHandle = async (name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle> => {
    const parts = name.split('/').filter(Boolean)
    let child: InMemoryRoot = this
    for (const part of parts) {
      const existing = child.dirs.get(part)
      if (existing) {
        child = existing
      } else if (options?.create) {
        const dir = new InMemoryRoot()
        child.dirs.set(part, dir)
        child.ensureChild(part)
        child = dir
      } else {
        throw new DOMException(`Directory "${name}" not found`, 'NotFoundError')
      }
    }
    return child as unknown as FileSystemDirectoryHandle
  }

  getFileHandle = async (name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle> => {
    const dir = this
    const key = name
    if (!dir.store.has(key) && !options?.create) {
      throw new DOMException(`File "${name}" not found`, 'NotFoundError')
    }
    return {
      kind: 'file',
      name,
      getFile: async () => {
        const data = dir.store.get(key)
        return new File([data ?? ''], name)
      },
      createWritable: async () => {
        let written = ''
        return {
          write: async (chunk: any) => {
            if (typeof chunk === 'string') written += chunk
            else if (chunk instanceof Blob) written += await chunk.text()
            else if (chunk instanceof Uint8Array) written += new TextDecoder().decode(chunk)
            else written += String(chunk)
          },
          close: async () => {
            dir.store.set(key, written)
          },
          seek: async () => {},
          truncate: async () => {},
        } as FileSystemWritableFileStream
      },
      isSameEntry: async () => false,
      queryPermission: async () => 'granted' as const,
      requestPermission: async () => 'granted' as const,
    } as FileSystemFileHandle
  }

  removeEntry = async (name: string, options?: { recursive?: boolean }): Promise<void> => {
    this.store.delete(name)
    this.children.delete(name)
  }

  resolve = async (possibleDescendant: FileSystemDirectoryHandle | FileSystemFileHandle): Promise<string[] | null> => {
    return null
  }

  entries = function* (): IterableIterator<[string, FileSystemDirectoryHandle | FileSystemFileHandle]> {
    return [][Symbol.iterator]()
  }

  keys = function* (): IterableIterator<string> {
    return [][Symbol.iterator]()
  }

  values = function* (): IterableIterator<FileSystemDirectoryHandle | FileSystemFileHandle> {
    return [][Symbol.iterator]()
  }

  isSameEntry = async (other: FileSystemDirectoryHandle | FileSystemFileHandle): Promise<boolean> => {
    return other === (this as any)
  }

  queryPermission = async (descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState> => {
    return 'granted'
  }

  requestPermission = async (descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState> => {
    return 'granted'
  }
}

function createNoopRootProxy(): FileSystemDirectoryHandle {
  return new InMemoryRoot() as unknown as FileSystemDirectoryHandle
}

/**
 * Subscribe to permission-lost events. Fires when any FS op catches
 * a NotAllowedError from the active root — UI can show a Reconnect modal.
 */
export function onPermissionLost(listener: PermissionLostListener): () => void {
  permissionLostListeners.add(listener)
  return () => permissionLostListeners.delete(listener)
}

export function notifyPermissionLost(): void {
  logger.warn('Permission lost on workspace root')
  for (const listener of permissionLostListeners) {
    try {
      listener()
    } catch (error) {
      logger.warn('permission-lost listener threw', error)
    }
  }
}
