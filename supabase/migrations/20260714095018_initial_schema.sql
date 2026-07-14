-- Generated from declarative schema files

-- ===== supabase/database/00_extensions.sql =====
-- Extensions required by the application
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ===== supabase/database/10_public_profiles.sql =====
-- User profiles linked to Supabase Auth
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ===== supabase/database/20_public_ai_logs.sql =====
-- AI usage audit logs
CREATE TABLE IF NOT EXISTS public.ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    platform TEXT NOT NULL,
    action_type TEXT NOT NULL,
    tokens_generated INTEGER,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_user_date ON public.ai_logs(user_id, created_at DESC);


-- ===== supabase/database/30_stripe_billing.sql =====
-- Stripe billing schema (synced via webhook / stripe-sync-engine)
CREATE SCHEMA IF NOT EXISTS stripe;

CREATE TABLE IF NOT EXISTS stripe.customers (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS stripe.subscriptions (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES stripe.customers(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL,
    price_id TEXT NOT NULL,
    quantity INTEGER,
    cancel_at_period_end BOOLEAN DEFAULT FALSE NOT NULL,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stripe_customers_user ON stripe.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_customer ON stripe.subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status ON stripe.subscriptions(status);


-- ===== supabase/database/40_rls_policies.sql =====
-- Row Level Security policies

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can view their own AI usage logs"
    ON public.ai_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to customers"
    ON stripe.customers FOR ALL
    TO service_role
    USING (TRUE);

CREATE POLICY "Service role has full access to subscriptions"
    ON stripe.subscriptions FOR ALL
    TO service_role
    USING (TRUE);

-- Updated_at trigger for profiles
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


