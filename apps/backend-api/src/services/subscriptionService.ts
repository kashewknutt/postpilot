import type Stripe from 'stripe'
import type { Sql } from 'postgres'

export async function upsertSubscriptionFromStripe(sql: Sql, subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id

  const priceId = subscription.items.data[0]?.price.id ?? 'unknown'

  await sql`
    INSERT INTO stripe.subscriptions (
      id, customer_id, status, price_id, quantity, cancel_at_period_end,
      current_period_start, current_period_end
    ) VALUES (
      ${subscription.id},
      ${customerId},
      ${subscription.status},
      ${priceId},
      ${subscription.items.data[0]?.quantity ?? 1},
      ${subscription.cancel_at_period_end},
      ${new Date(subscription.current_period_start * 1000)},
      ${new Date(subscription.current_period_end * 1000)}
    )
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      price_id = EXCLUDED.price_id,
      quantity = EXCLUDED.quantity,
      cancel_at_period_end = EXCLUDED.cancel_at_period_end,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end
  `
}

export async function getCustomerIdForUser(sql: Sql, userId: string): Promise<string | null> {
  const rows = await sql<{ id: string }[]>`
    SELECT id FROM stripe.customers WHERE user_id = ${userId} LIMIT 1
  `
  return rows[0]?.id ?? null
}

export async function getSubscriptionStatusForUser(sql: Sql, userId: string): Promise<string> {
  const rows = await sql<{ status: string }[]>`
    SELECT s.status
    FROM stripe.subscriptions s
    INNER JOIN stripe.customers c ON c.id = s.customer_id
    WHERE c.user_id = ${userId}
    ORDER BY s.created_at DESC
    LIMIT 1
  `
  return rows[0]?.status ?? 'none'
}

export async function upsertCustomer(
  sql: Sql,
  customerId: string,
  userId: string,
  email: string | null,
) {
  await sql`
    INSERT INTO stripe.customers (id, user_id, email)
    VALUES (${customerId}, ${userId}, ${email})
    ON CONFLICT (id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      email = COALESCE(EXCLUDED.email, stripe.customers.email)
  `
}
