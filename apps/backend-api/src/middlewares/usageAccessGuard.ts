import type { FastifyReply, FastifyRequest } from 'fastify'
import type { UsageSummary } from '@postpilot/shared-types'
import { createProblemDetails } from '@postpilot/shared-utils'
import type { Environment } from '../config/environment.js'
import { getDb } from '../config/database.js'
import { canUserGenerate } from '../services/usageService.js'

declare module 'fastify' {
  interface FastifyRequest {
    usage?: UsageSummary
  }
}

export function createUsageAccessGuard(env: Environment) {
  return async function usageAccessGuard(request: FastifyRequest, reply: FastifyReply) {
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
      const access = await canUserGenerate(sql, request.userId)
      request.usage = access.usage

      if (!access.allowed) {
        return reply.status(402).send(
          createProblemDetails(
            'https://api.postpilot.app/errors/payment-required',
            'Free Limit Reached',
            402,
            access.reason ??
              'You have used all free generations for this month. Please upgrade to continue.',
            request.url,
          ),
        )
      }
    } catch (error) {
      request.log.error(error, 'Failed to verify usage access')
      return reply.status(500).send(
        createProblemDetails(
          'https://api.postpilot.app/errors/internal',
          'Internal Server Error',
          500,
          'Unable to verify generation access.',
          request.url,
        ),
      )
    }
  }
}
