CREATE TABLE IF NOT EXISTS public.channel_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.channel_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS channel_message_reactions_workspace_id_idx
  ON public.channel_message_reactions(workspace_id);

CREATE INDEX IF NOT EXISTS channel_message_reactions_channel_id_idx
  ON public.channel_message_reactions(channel_id);

CREATE INDEX IF NOT EXISTS channel_message_reactions_message_id_idx
  ON public.channel_message_reactions(message_id);

ALTER TABLE public.channel_message_reactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'channel_message_reactions'
      AND policyname = 'Workspace members can view channel message reactions'
  ) THEN
    CREATE POLICY "Workspace members can view channel message reactions"
    ON public.channel_message_reactions
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.workspace_members wm
        WHERE wm.workspace_id = channel_message_reactions.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'channel_message_reactions'
      AND policyname = 'Workspace members can add channel message reactions'
  ) THEN
    CREATE POLICY "Workspace members can add channel message reactions"
    ON public.channel_message_reactions
    FOR INSERT TO authenticated
    WITH CHECK (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1
        FROM public.workspace_members wm
        WHERE wm.workspace_id = channel_message_reactions.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'channel_message_reactions'
      AND policyname = 'Workspace members can remove their channel message reactions'
  ) THEN
    CREATE POLICY "Workspace members can remove their channel message reactions"
    ON public.channel_message_reactions
    FOR DELETE TO authenticated
    USING (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1
        FROM public.workspace_members wm
        WHERE wm.workspace_id = channel_message_reactions.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'channel_message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_message_reactions;
  END IF;
END
$$;
