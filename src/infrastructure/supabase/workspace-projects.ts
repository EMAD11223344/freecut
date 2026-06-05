import { getSupabaseClient, getCurrentUserId } from './client'

export interface WorkspaceProject {
  id: string
  user_id: string
  workspace_id: string
  title: string
  description: string
  project_data: string
  file_size_bytes: number
  created_at: string
  updated_at: string
}

const TABLE_NAME = 'freecut_projects'

/**
 * Creates a new project record in Supabase.
 */
export async function createWorkspaceProject(
  project: Omit<WorkspaceProject, 'id' | 'created_at' | 'updated_at'>,
): Promise<WorkspaceProject> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(project)
    .select()
    .single()

  if (error) throw new Error(`Failed to create project: ${error.message}`)
  return data
}

/**
 * Lists all projects for the current user in a workspace.
 */
export async function listWorkspaceProjects(workspaceId: string) {
  const supabase = getSupabaseClient()
  const userId = await getCurrentUserId()
  if (!userId) return []

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`Failed to list projects: ${error.message}`)
  return (data ?? []) as WorkspaceProject[]
}

/**
 * Lists all projects visible to the current user in a workspace.
 */
export async function listAllWorkspaceProjects(workspaceId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`Failed to list projects: ${error.message}`)
  return (data ?? []) as WorkspaceProject[]
}

/**
 * Updates a project record.
 */
export async function updateWorkspaceProject(
  id: string,
  updates: Partial<Pick<WorkspaceProject, 'title' | 'description' | 'project_data'>>,
) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('id', id)

  if (error) throw new Error(`Failed to update project: ${error.message}`)
}

/**
 * Deletes a project record.
 */
export async function deleteWorkspaceProject(id: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete project: ${error.message}`)
}
