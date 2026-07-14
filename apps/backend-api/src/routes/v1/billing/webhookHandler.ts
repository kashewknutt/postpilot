import type { FastifyInstance } from 'fastify'
import type { Environment } from '../../../config/environment.js'
import { getStripe } from '../../../config/stripe.js'
import { getDb } from '../../../config/database.js'
import {
  upsertCustomer,
  upsertSubscriptionFromStripe,
} from '../../../services/subscriptionService.js'

export async function registerWebhookRoutes(app: FastifyInstance, env: Environment) {
  const stripe = getStripe(env)

  app.post('/api/v1/billing/webhook', { config: { rawBody: true } }, async (request, reply) => {
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
      return reply.status(503).send({ error: 'Stripe webhook is not configured.' })
    }

    const signature = request.headers['stripe-signature']
    if (!signature || typeof signature !== 'string') {
      return reply.status(400).send({ error: 'Missing Stripe signature.' })
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(
        request.rawBody as Buffer,
        signature,
        env.STRIPE_WEBHOOK_SECRET,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid webhook signature.'
      return reply.status(400).send({ error: message })
    }

    const sql = getDb(env)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.user_id
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id

        if (userId && customerId) {
          await upsertCustomer(sql, customerId, userId, session.customer_details?.email ?? null)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        await upsertSubscriptionFromStripe(sql, subscription)
        break
      }
      default:
        request.log.info({ eventType: event.type }, 'Unhandled Stripe webhook event')
    }

    return { received: true }
  })
}
