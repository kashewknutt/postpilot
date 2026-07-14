/**
 * Database schema source of truth.
 *
 * Edit this file, then run `pnpm db:sync` to push changes to Supabase.
 * Do not hand-author migration files for routine schema updates.
 */
import {
  boolean,
  integer,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from 'drizzle-orm/pg-core'

export const stripeSchema = pgSchema('stripe')

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(),
    fullName: text('full_name'),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_profiles_id').on(table.id)],
)

export const aiLogs = pgTable(
  'ai_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    platform: text('platform').notNull(),
    actionType: text('action_type').notNull(),
    tokensGenerated: integer('tokens_generated'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_ai_logs_user_date').on(table.userId, table.createdAt)],
)

export const stripeCustomers = stripeSchema.table(
  'customers',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id'),
    email: text('email'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_stripe_customers_user').on(table.userId)],
)

export const stripeSubscriptions = stripeSchema.table(
  'subscriptions',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id')
      .notNull()
      .references(() => stripeCustomers.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    priceId: text('price_id').notNull(),
    quantity: integer('quantity'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_stripe_subscriptions_customer').on(table.customerId),
    index('idx_stripe_subscriptions_status').on(table.status),
  ],
)

export type Profile = typeof profiles.$inferSelect
export type AiLog = typeof aiLogs.$inferSelect
export type StripeCustomer = typeof stripeCustomers.$inferSelect
export type StripeSubscription = typeof stripeSubscriptions.$inferSelect
