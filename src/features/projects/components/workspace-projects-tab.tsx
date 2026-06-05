import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cloud, FileVideo, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { listWorkspaceProjects, type WorkspaceProject } from '@/infrastructure/supabase/workspace-projects'

interface WorkspaceProjectsTabProps {
  workspaceId?: string
}

export function WorkspaceProjectsTab({ workspaceId }: WorkspaceProjectsTabProps) {
  const { t } = useTranslation()
  const [projects, setProjects] = useState<WorkspaceProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    listWorkspaceProjects(workspaceId)
      .then(setProjects)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [workspaceId])

  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <Cloud className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Workspace Not Connected
        </h3>
        <p className="text-muted-foreground max-w-md">
          Sign in to access your workspace projects across devices.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <p className="text-sm text-destructive mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <FileVideo className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No Workspace Projects
        </h3>
        <p className="text-muted-foreground max-w-md">
          Exported videos and saved projects will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {projects.map((project) => (
        <a
          key={project.id}
          href={project.project_data ? undefined : '#'}
          target={project.project_data ? undefined : '_blank'}
          rel="noopener noreferrer"
          className="group relative flex flex-col rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <FileVideo className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{project.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(project.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          {project.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{project.description}</p>
          )}
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
            <span className="text-[10px] text-muted-foreground">
              {project.file_size_bytes > 0
                ? project.file_size_bytes >= 1048576
                  ? `${(project.file_size_bytes / 1048576).toFixed(1)} MB`
                  : `${(project.file_size_bytes / 1024).toFixed(1)} KB`
                : 'Workspace'}
            </span>
            <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </a>
      ))}
    </div>
  )
}
