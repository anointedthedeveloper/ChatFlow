CREATE TABLE IF NOT EXISTS public.workspace_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'paused', 'shipped')),
  linked_repo_full_name TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspace_projects_workspace_id_idx
  ON public.workspace_projects(workspace_id);

ALTER TABLE public.workspace_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view projects" ON public.workspace_projects;
CREATE POLICY "Workspace members can view projects"
ON public.workspace_projects
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_projects.workspace_id
      AND wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Workspace members can create projects" ON public.workspace_projects;
CREATE POLICY "Workspace members can create projects"
ON public.workspace_projects
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_projects.workspace_id
      AND wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Workspace members can update projects" ON public.workspace_projects;
CREATE POLICY "Workspace members can update projects"
ON public.workspace_projects
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_projects.workspace_id
      AND wm.user_id = auth.uid()
  )
);
