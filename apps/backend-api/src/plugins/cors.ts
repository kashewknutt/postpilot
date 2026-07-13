import type { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import type { Environment } from '../config/environment.js'

export async function registerCors(app: FastifyInstance, env: Environment) {
  await app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  })
}
