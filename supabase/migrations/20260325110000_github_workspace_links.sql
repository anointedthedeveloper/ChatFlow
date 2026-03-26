CREATE TABLE IF NOT EXISTS public.workspace_github_repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  repo_description TEXT,
  default_branch TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, repo_full_name)
);

CREATE INDEX IF NOT EXISTS workspace_github_repos_workspace_id_idx
  ON public.workspace_github_repos(workspace_id);

ALTER TABLE public.workspace_github_repos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view linked GitHub repos" ON public.workspace_github_repos;
CREATE POLICY "Workspace members can view linked GitHub repos"
ON public.workspace_github_repos
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_github_repos.workspace_id
      AND wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Workspace members can link GitHub repos" ON public.workspace_github_repos;
CREATE POLICY "Workspace members can link GitHub repos"
ON public.workspace_github_repos
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_github_repos.workspace_id
      AND wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Workspace members can unlink GitHub repos" ON public.workspace_github_repos;
CREATE POLICY "Workspace members can unlink GitHub repos"
ON public.workspace_github_repos
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_github_repos.workspace_id
      AND wm.user_id = auth.uid()
  )
);

CREATE TABLE IF NOT EXISTS public.github_message_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL,
  message_id UUID NOT NULL REFERENCES public.channel_messages(id) ON DELETE CASCADE,
  github_type TEXT NOT NULL CHECK (github_type IN ('issue')),
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  external_number INTEGER NOT NULL,
  external_title TEXT NOT NULL,
  external_url TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (message_id, github_type, external_url)
);

CREATE INDEX IF NOT EXISTS github_message_links_workspace_id_idx
  ON public.github_message_links(workspace_id);

CREATE INDEX IF NOT EXISTS github_message_links_message_id_idx
  ON public.github_message_links(message_id);

ALTER TABLE public.github_message_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view GitHub message links" ON public.github_message_links;
CREATE POLICY "Workspace members can view GitHub message links"
ON public.github_message_links
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = github_message_links.workspace_id
      AND wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Workspace members can create GitHub message links" ON public.github_message_links;
CREATE POLICY "Workspace members can create GitHub message links"
ON public.github_message_links
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = github_message_links.workspace_id
      AND wm.user_id = auth.uid()
  )
);
