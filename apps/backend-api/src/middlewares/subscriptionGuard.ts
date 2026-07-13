import type { FastifyReply, FastifyRequest } from 'fastify'
import { createProblemDetails, isActiveSubscriptionStatus } from '@postpilot/shared-utils'
import type { Environment } from '../config/environment.js'
import { getServiceSupabase } from '../config/supabase.js'

export function createSubscriptionGuard(env: Environment) {
  return async function subscriptionGuard(request: FastifyRequest, reply: FastifyReply) {
    if (!request.userId) {
      return reply.status(401).send(
        createProblemDetails(
          'https://api.postpilot.app/errors/unauthorized',
          'Unauthorized',
          401,
          'User context is missing.',
          request.url,
        ),
      )
    }

    const supabase = getServiceSupabase(env)
    const { data: customer, error: customerError } = await supabase
      .schema('stripe')
      .from('customers')
      .select('id')
      .eq('user_id', request.userId)
      .maybeSingle()

    if (customerError) {
      request.log.error(customerError, 'Failed to load Stripe customer')
      return reply.status(500).send(
        createProblemDetails(
          'https://api.postpilot.app/errors/internal',
          'Internal Server Error',
          500,
          'Unable to verify subscription status.',
          request.url,
        ),
      )
    }

    if (!customer) {
      return reply.status(402).send(
        createProblemDetails(
          'https://api.postpilot.app/errors/payment-required',
          'Active Subscription Required',
          402,
          'No active subscription found for this account.',
          request.url,
        ),
      )
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .schema('stripe')
      .from('subscriptions')
      .select('status')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subscriptionError) {
      request.log.error(subscriptionError, 'Failed to load Stripe subscription')
      return reply.status(500).send(
        createProblemDetails(
          'https://api.postpilot.app/errors/internal',
          'Internal Server Error',
          500,
          'Unable to verify subscription status.',
          request.url,
        ),
      )
    }

    if (!subscription || !isActiveSubscriptionStatus(subscription.status)) {
      return reply.status(402).send(
        createProblemDetails(
          'https://api.postpilot.app/errors/payment-required',
          'Active Subscription Required',
          402,
          `Your current subscription is marked as ${subscription?.status ?? 'none'}. Please update your payment information.`,
          request.url,
        ),
      )
    }
  }
}
