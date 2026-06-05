import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle2,
  CloudUpload,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { getCurrentUserId } from './client'
import { uploadToWorkspace } from './storage'
import { saveVideoProject } from './video-projects'
import { toast } from 'sonner'

interface SaveToWorkspacePanelProps {
  blob: Blob | null
  filename: string
  durationSeconds?: number
  /** Once saved, the public URL of the stored file. */
  onSaved?: (publicUrl: string) => void
}

const DEMO_WORKSPACES = [
  { id: 'workspace-1', name: 'Main Workspace' },
  { id: 'workspace-2', name: 'Marketing' },
  { id: 'workspace-3', name: 'Personal' },
]

/**
 * Panel shown after an export completes. Lets the user upload the result
 * to their Business-OS workspace via Supabase Storage.
 */
export function SaveToWorkspacePanel({
  blob,
  filename,
  durationSeconds,
  onSaved,
}: SaveToWorkspacePanelProps) {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const [savedUrl, setSavedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState(DEMO_WORKSPACES[0].id)
  const [title, setTitle] = useState(filename.replace(/\.[^.]+$/, ''))

  const handleSave = useCallback(async () => {
    if (!blob) return
    setSaving(true)
    setError(null)

    try {
      const userId = await getCurrentUserId()
      if (!userId) {
        throw new Error('Not logged in. Please log into Business-OS first.')
      }

      // Upload blob to Supabase Storage
      const { publicUrl } = await uploadToWorkspace(blob, filename, workspaceId, userId)

      // Save project metadata
      await saveVideoProject({
        user_id: userId,
        workspace_id: workspaceId,
        title: title || filename,
        filename,
        storage_path: `${workspaceId}/${userId}/${filename}`,
        public_url: publicUrl,
        file_size_bytes: blob.size,
        duration_seconds: durationSeconds,
      })

      setSavedUrl(publicUrl)
      toast.success(t('export.saveToWorkspace.saved'))
      onSaved?.(publicUrl)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }, [blob, filename, workspaceId, title, durationSeconds, onSaved, t])

  if (savedUrl) {
    return (
      <Alert className="border-green-900 bg-green-950">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertDescription className="text-green-400">
          {t('export.saveToWorkspace.savedToWorkspace')}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CloudUpload className="h-4 w-4 text-muted-foreground" />
        {t('export.saveToWorkspace.title')}
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-xs">{t('export.saveToWorkspace.workspace')}</Label>
          <Select value={workspaceId} onValueChange={setWorkspaceId}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEMO_WORKSPACES.map((ws) => (
                <SelectItem key={ws.id} value={ws.id}>
                  {ws.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">{t('export.saveToWorkspace.title')}</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-3 w-3" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <Button onClick={handleSave} disabled={saving || !blob} className="w-full gap-2">
        {saving ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> {t('export.saveToWorkspace.saving')}</>
        ) : (
          <><CloudUpload className="h-4 w-4" /> {t('export.saveToWorkspace.saveButton')}</>
        )}
      </Button>
    </div>
  )
}
