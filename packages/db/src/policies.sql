-- Applied after drizzle-kit push by `pnpm db:sync`
-- Keeps auth FKs, RLS, and triggers that schema.ts does not own.

-- Expose stripe schema to PostgREST / Supabase clients
GRANT USAGE ON SCHEMA stripe TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA stripe TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA stripe TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA stripe
  GRANT ALL ON TABLES TO postgres, service_role;

-- Ask PostgREST to expose the stripe schema (hosted projects may still
-- require Dashboard → Settings → API → Exposed schemas → add "stripe")
DO $expose$
BEGIN
  EXECUTE 'ALTER ROLE authenticator SET pgrst.db_schemas = ''public, graphql_public, stripe''';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Could not update authenticator pgrst.db_schemas; expose stripe in Dashboard API settings if needed';
  WHEN undefined_object THEN
    RAISE NOTICE 'authenticator role not found; skipping pgrst schema exposure';
END
$expose$;
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Foreign keys to auth.users (managed by Supabase Auth)
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ai_logs
    ADD CONSTRAINT ai_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE stripe.customers
    ADD CONSTRAINT customers_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Profile bootstrap on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_modtime ON public.profiles;
CREATE TRIGGER update_profiles_modtime
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their own AI usage logs" ON public.ai_logs;
CREATE POLICY "Users can view their own AI usage logs"
  ON public.ai_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role has full access to customers" ON stripe.customers;
CREATE POLICY "Service role has full access to customers"
  ON stripe.customers FOR ALL
  TO service_role
  USING (TRUE);

DROP POLICY IF EXISTS "Service role has full access to subscriptions" ON stripe.subscriptions;
CREATE POLICY "Service role has full access to subscriptions"
  ON stripe.subscriptions FOR ALL
  TO service_role
  USING (TRUE);
