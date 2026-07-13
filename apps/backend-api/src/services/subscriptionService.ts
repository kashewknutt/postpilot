import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

export async function upsertSubscriptionFromStripe(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id

  const priceId = subscription.items.data[0]?.price.id ?? 'unknown'

  await supabase.schema('stripe').from('subscriptions').upsert({
    id: subscription.id,
    customer_id: customerId,
    status: subscription.status,
    price_id: priceId,
    quantity: subscription.items.data[0]?.quantity ?? 1,
    cancel_at_period_end: subscription.cancel_at_period_end,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  })
}

export async function getSubscriptionStatusForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data: customer } = await supabase
    .schema('stripe')
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!customer) return 'none'

  const { data: subscription } = await supabase
    .schema('stripe')
    .from('subscriptions')
    .select('status')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return subscription?.status ?? 'none'
}
