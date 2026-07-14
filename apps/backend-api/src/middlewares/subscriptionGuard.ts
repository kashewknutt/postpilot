import type { FastifyReply, FastifyRequest } from 'fastify'
import { createProblemDetails, isActiveSubscriptionStatus } from '@postpilot/shared-utils'
import type { Environment } from '../config/environment.js'
import { getDb } from '../config/database.js'
import { getSubscriptionStatusForUser } from '../services/subscriptionService.js'

/** Strict subscription check for paid-only endpoints (checkout already paid flows). */
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

    try {
      const sql = getDb(env)
      const status = await getSubscriptionStatusForUser(sql, request.userId)

      if (!isActiveSubscriptionStatus(status)) {
        return reply.status(402).send(
          createProblemDetails(
            'https://api.postpilot.app/errors/payment-required',
            'Active Subscription Required',
            402,
            status === 'none'
              ? 'No active subscription found for this account.'
              : `Your current subscription is marked as ${status}. Please update your payment information.`,
            request.url,
          ),
        )
      }
    } catch (error) {
      request.log.error(error, 'Failed to verify subscription status')
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
  }
}
