import type { FastifyInstance } from 'fastify'
import helmet from '@fastify/helmet'

export async function registerSecurityHeaders(app: FastifyInstance) {
  await app.register(helmet, {
    contentSecurityPolicy: false,
  })
}
