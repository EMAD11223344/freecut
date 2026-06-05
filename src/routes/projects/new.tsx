import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { createLogger } from '@/shared/logging/logger'
import { ProjectForm } from '@/features/projects/components/project-form'
import { useCreateProject } from '@/features/projects/hooks/use-project-actions'
import { useProjectStore } from '@/features/projects/stores/project-store'
import { FreeCutLogo } from '@/components/brand/freecut-logo'
import { Button } from '@/components/ui/button'
import { Github, HardDrive, Cloud } from 'lucide-react'
import type { ProjectFormData } from '@/features/projects/utils/validation'

const logger = createLogger('NewProject')

export const Route = createFileRoute('/projects/new')({
  component: NewProject,
  beforeLoad: async () => {
    try {
      const { loadProjects } = useProjectStore.getState()
      await loadProjects()
    } catch (err) {
      logger.warn('Failed to pre-load projects in beforeLoad:', err)
    }
  },
})

function NewProject() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveDestination, setSaveDestination] = useState<'local' | 'workspace'>('local')
  const createProject = useCreateProject()

  const handleSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true)

    try {
      const result = await createProject(data)

      if (result.success && result.project) {
        // Navigate to editor with new project
        navigate({
          to: '/editor/$projectId',
          params: { projectId: result.project.id },
        })
      } else {
        toast.error(t('projects.toasts.createFailed'), { description: result.error })
        setIsSubmitting(false)
      }
    } catch (error) {
      logger.error('Failed to create project:', error)
      toast.error(t('projects.toasts.createFailed'), { description: t('projects.tryAgain') })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="panel-header border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/">
            <FreeCutLogo variant="full" size="md" className="hover:opacity-80 transition-opacity" />
          </Link>
          {import.meta.env.VITE_EMBEDDED && (
            <div className="flex items-center gap-1 p-0.5 bg-muted/30 rounded-lg border border-border mr-3">
              <button
                onClick={() => setSaveDestination('local')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  saveDestination === 'local'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                Local
              </button>
              <button
                onClick={() => setSaveDestination('workspace')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  saveDestination === 'workspace'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Cloud className="w-3.5 h-3.5" />
                Workspace
              </button>
            </div>
          )}
          <Button variant="outline" size="icon" className="h-10 w-10" asChild>
            <a
              href="https://github.com/walterlow/freecut"
              target="_blank"
              rel="noopener noreferrer"
              data-tooltip={t('projects.viewOnGitHub')}
              data-tooltip-side="left"
            >
              <Github className="w-5 h-5" />
            </a>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <ProjectForm onSubmit={handleSubmit} isSubmitting={isSubmitting} hideHeader={true} />
        {import.meta.env.VITE_EMBEDDED && (
          <div className="mt-4 p-3 rounded-lg border border-border bg-muted/20">
            <div className="flex items-center gap-2 text-sm">
              {saveDestination === 'local' ? (
                <>
                  <HardDrive className="w-4 h-4 text-primary" />
                  <span className="text-foreground font-medium">Save to Local</span>
                  <span className="text-muted-foreground">— stored in browser memory for this session</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4 text-primary" />
                  <span className="text-foreground font-medium">Save to Workspace</span>
                  <span className="text-muted-foreground">— synced to workspace cloud storage</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
