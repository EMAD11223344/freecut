import { getSupabaseClient } from './client'

export interface VideoProjectRecord {
  id?: string
  user_id: string
  workspace_id: string
  title: string
  filename: string
  storage_path: string
  public_url: string
  file_size_bytes: number
  duration_seconds?: number
  created_at?: string
}

const TABLE_NAME = 'video_projects'

/**
 * Saves a video project record to Supabase after export.
 */
export async function saveVideoProject(record: VideoProjectRecord): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase.from(TABLE_NAME).insert({
    user_id: record.user_id,
    workspace_id: record.workspace_id,
    title: record.title,
    filename: record.filename,
    storage_path: record.storage_path,
    public_url: record.public_url,
    file_size_bytes: record.file_size_bytes,
    duration_seconds: record.duration_seconds ?? null,
  })

  if (error) throw new Error(`Failed to save project metadata: ${error.message}`)
}

/**
 * Lists video projects for a given workspace, newest first.
 */
export async function listVideoProjects(workspaceId: string) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to list projects: ${error.message}`)
  return data as VideoProjectRecord[]
}
