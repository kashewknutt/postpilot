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
