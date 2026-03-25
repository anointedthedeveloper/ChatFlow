CREATE TABLE public.workspace_project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.workspace_projects(id) ON DELETE CASCADE,
  repo_full_name TEXT NOT NULL,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_sha TEXT,
  imported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (project_id, repo_full_name, branch_name, file_path)
);

CREATE INDEX workspace_project_files_workspace_id_idx
  ON public.workspace_project_files(workspace_id);

CREATE INDEX workspace_project_files_project_id_idx
  ON public.workspace_project_files(project_id);

ALTER TABLE public.workspace_project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view project files"
ON public.workspace_project_files
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_project_files.workspace_id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can import project files"
ON public.workspace_project_files
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = imported_by
  AND EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_project_files.workspace_id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can remove project files"
ON public.workspace_project_files
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_project_files.workspace_id
      AND wm.user_id = auth.uid()
  )
);
