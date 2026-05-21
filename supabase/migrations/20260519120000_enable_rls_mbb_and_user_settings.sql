-- Security Advisor: enable RLS on public tables flagged as exposed (rls_disabled_in_public).
-- Matches app intent for mbb_settings (see database/migrations/011_create_mbb_settings_table.sql).
--
-- Notes:
-- - API routes use SUPABASE_SERVICE_ROLE_KEY and bypass RLS; enabling RLS should not break server paths.
-- - user_settings: dashboard reported existing policies while RLS was off—they apply once RLS is enabled.
--   If this table somehow has zero policies locally, we add standard user_id-scoped CRUD policies.

--------------------------------------------------------------------------------
-- public.mbb_settings
--------------------------------------------------------------------------------
DO $mbb$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'mbb_settings'
  ) THEN
    ALTER TABLE public.mbb_settings ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view their own MBB settings" ON public.mbb_settings;
    DROP POLICY IF EXISTS "Users can insert their own MBB settings" ON public.mbb_settings;
    DROP POLICY IF EXISTS "Users can update their own MBB settings" ON public.mbb_settings;
    DROP POLICY IF EXISTS "Users can delete their own MBB settings" ON public.mbb_settings;

    CREATE POLICY "Users can view their own MBB settings"
      ON public.mbb_settings FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own MBB settings"
      ON public.mbb_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own MBB settings"
      ON public.mbb_settings FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own MBB settings"
      ON public.mbb_settings FOR DELETE USING (auth.uid() = user_id);
  END IF;
END
$mbb$;

--------------------------------------------------------------------------------
-- public.user_settings
--------------------------------------------------------------------------------
DO $uset$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_settings'
  ) THEN
    ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

    -- Advisor: policies existed but RLS was off — only synthesize defaults if truly none.
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'user_settings'
    )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_settings'
          AND column_name = 'user_id'
      ) THEN
      CREATE POLICY "Users can select own user_settings"
        ON public.user_settings FOR SELECT USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert own user_settings"
        ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can update own user_settings"
        ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

      CREATE POLICY "Users can delete own user_settings"
        ON public.user_settings FOR DELETE USING (auth.uid() = user_id);
    END IF;
  END IF;
END
$uset$;
