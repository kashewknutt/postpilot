import type { FastifyReply, FastifyRequest } from 'fastify'
import { createProblemDetails } from '@postpilot/shared-utils'
import type { Environment } from '../config/environment.js'
import { getAnonSupabase } from '../config/supabase.js'

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string
    userEmail?: string
  }
}

export function createAuthValidation(env: Environment) {
  return async function authValidation(request: FastifyRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send(
        createProblemDetails(
          'https://api.postpilot.app/errors/unauthorized',
          'Unauthorized',
          401,
          'Missing or invalid bearer token.',
          request.url,
        ),
      )
    }

    const token = authHeader.slice(7)
    const supabase = getAnonSupabase(env)
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      return reply.status(401).send(
        createProblemDetails(
          'https://api.postpilot.app/errors/unauthorized',
          'Unauthorized',
          401,
          'Token validation failed.',
          request.url,
        ),
      )
    }

    request.userId = data.user.id
    request.userEmail = data.user.email ?? undefined
  }
}
