CREATE TABLE IF NOT EXISTS public.call_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  signal_data TEXT,
  call_type TEXT,
  from_username TEXT,
  chat_room_id UUID REFERENCES public.chat_rooms(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS call_signals_to_user_idx
  ON public.call_signals(to_user);

CREATE INDEX IF NOT EXISTS call_signals_from_user_idx
  ON public.call_signals(from_user);

CREATE INDEX IF NOT EXISTS call_signals_created_at_idx
  ON public.call_signals(created_at);

ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'call_signals'
      AND policyname = 'Users can insert call signals'
  ) THEN
    CREATE POLICY "Users can insert call signals"
    ON public.call_signals
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = from_user);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'call_signals'
      AND policyname = 'Users can view their own call signals'
  ) THEN
    CREATE POLICY "Users can view their own call signals"
    ON public.call_signals
    FOR SELECT TO authenticated
    USING (auth.uid() = to_user OR auth.uid() = from_user);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'call_signals'
      AND policyname = 'Users can delete their own call signals'
  ) THEN
    CREATE POLICY "Users can delete their own call signals"
    ON public.call_signals
    FOR DELETE TO authenticated
    USING (auth.uid() = to_user OR auth.uid() = from_user);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'call_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;
  END IF;
END $$;
