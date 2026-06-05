import { getSupabaseClient } from './client'

const OUTPUT_BUCKET = 'video-exports'

export interface UploadResult {
  path: string
  publicUrl: string
}

/**
 * Uploads a blob to the user's workspace folder in Supabase Storage.
 * Files are organized under `{workspaceId}/{userId}/{filename}`.
 */
export async function uploadToWorkspace(
  blob: Blob,
  filename: string,
  workspaceId: string,
  userId: string,
): Promise<UploadResult> {
  const supabase = getSupabaseClient()
  const path = `${workspaceId}/${userId}/${filename}`

  const { error } = await supabase.storage.from(OUTPUT_BUCKET).upload(path, blob, {
    contentType: blob.type || 'video/mp4',
    upsert: true,
  })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data: publicUrlData } = supabase.storage.from(OUTPUT_BUCKET).getPublicUrl(path)

  return { path, publicUrl: publicUrlData.publicUrl }
}

/**
 * Lists all exported videos for a given workspace.
 */
export async function listWorkspaceExports(workspaceId: string, userId: string) {
  const supabase = getSupabaseClient()
  const prefix = `${workspaceId}/${userId}/`

  const { data, error } = await supabase.storage.from(OUTPUT_BUCKET).list(prefix, {
    sortBy: { column: 'created_at', order: 'desc' },
  })

  if (error) throw new Error(`List failed: ${error.message}`)
  return data
}

export { OUTPUT_BUCKET }
