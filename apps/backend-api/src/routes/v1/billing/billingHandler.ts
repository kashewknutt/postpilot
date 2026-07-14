import { Type } from '@sinclair/typebox'
import type { FastifyInstance } from 'fastify'
import type { Environment } from '../../../config/environment.js'
import { createAuthValidation } from '../../../middlewares/authValidation.js'
import { getStripe } from '../../../config/stripe.js'
import { getDb } from '../../../config/database.js'
import { getCustomerIdForUser, upsertCustomer } from '../../../services/subscriptionService.js'
import { getUsageSummary } from '../../../services/usageService.js'

const CheckoutSchema = {
  body: Type.Object({
    priceId: Type.Optional(Type.String()),
  }),
}

const PortalSchema = {
  body: Type.Object({}),
}

export async function registerBillingRoutes(app: FastifyInstance, env: Environment) {
  const authValidation = createAuthValidation(env)
  const stripe = getStripe(env)

  app.get('/api/v1/billing/usage', { preHandler: authValidation }, async (request) => {
    const sql = getDb(env)
    return getUsageSummary(sql, request.userId!)
  })

  app.post(
    '/api/v1/billing/checkout',
    { schema: CheckoutSchema, preHandler: authValidation },
    async (request, reply) => {
      if (!stripe) {
        return reply.status(503).send({
          type: 'https://api.postpilot.app/errors/service-unavailable',
          title: 'Billing Unavailable',
          status: 503,
          detail: 'Stripe is not configured.',
          instance: request.url,
        })
      }

      const { priceId } = (request.body as { priceId?: string }) ?? {}
      const resolvedPriceId = priceId || env.STRIPE_PRICE_ID
      if (!resolvedPriceId) {
        return reply.status(503).send({
          type: 'https://api.postpilot.app/errors/service-unavailable',
          title: 'Billing Unavailable',
          status: 503,
          detail: 'Stripe price ID is not configured.',
          instance: request.url,
        })
      }

      const sql = getDb(env)
      let customerId = await getCustomerIdForUser(sql, request.userId!)

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: request.userEmail,
          metadata: { user_id: request.userId! },
        })
        customerId = customer.id
        await upsertCustomer(sql, customerId, request.userId!, request.userEmail ?? null)
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: resolvedPriceId, quantity: 1 }],
        success_url: 'https://postpilot.app/billing/success',
        cancel_url: 'https://postpilot.app/billing/cancel',
        metadata: { user_id: request.userId! },
      })

      return { checkoutUrl: session.url }
    },
  )

  app.post(
    '/api/v1/billing/portal',
    { schema: PortalSchema, preHandler: authValidation },
    async (request, reply) => {
      if (!stripe) {
        return reply.status(503).send({
          type: 'https://api.postpilot.app/errors/service-unavailable',
          title: 'Billing Unavailable',
          status: 503,
          detail: 'Stripe is not configured.',
          instance: request.url,
        })
      }

      const sql = getDb(env)
      const customerId = await getCustomerIdForUser(sql, request.userId!)

      if (!customerId) {
        return reply.status(404).send({
          type: 'https://api.postpilot.app/errors/not-found',
          title: 'Customer Not Found',
          status: 404,
          detail: 'No Stripe customer exists for this user.',
          instance: request.url,
        })
      }

      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: 'https://postpilot.app/billing',
      })

      return { portalUrl: portal.url }
    },
  )
}
