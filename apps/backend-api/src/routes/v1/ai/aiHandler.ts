import type { FastifyInstance } from 'fastify'
import { validateContentLength } from '@postpilot/shared-utils'
import type { Environment } from '../../../config/environment.js'
import { createAuthValidation } from '../../../middlewares/authValidation.js'
import { createSubscriptionGuard } from '../../../middlewares/subscriptionGuard.js'
import { getServiceSupabase } from '../../../config/supabase.js'
import { streamGeminiCompletion } from '../../../services/geminiClient.js'
import { AiGenerateSchema } from './aiSchema.js'

export async function registerAiRoutes(app: FastifyInstance, env: Environment) {
  const authValidation = createAuthValidation(env)
  const subscriptionGuard = createSubscriptionGuard(env)

  app.post(
    '/api/v1/ai/generate',
    {
      schema: AiGenerateSchema,
      preHandler: [authValidation, subscriptionGuard],
    },
    async (request, reply) => {
      const { platform, action, content } = request.body as {
        platform: string
        action: string
        content: string
      }

      const validationError = validateContentLength(content)
      if (validationError) {
        return reply.status(400).send({
          type: 'https://api.postpilot.app/errors/bad-request',
          title: 'Invalid Request Parameters',
          status: 400,
          detail: validationError,
          instance: request.url,
        })
      }

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })

      let tokensGenerated = 0

      try {
        for await (const token of streamGeminiCompletion(env, { platform, action, content })) {
          tokensGenerated += 1
          reply.raw.write(`event: message\ndata: ${JSON.stringify({ token })}\n\n`)
        }

        if (request.userId) {
          const supabase = getServiceSupabase(env)
          await supabase.from('ai_logs').insert({
            user_id: request.userId,
            platform,
            action_type: action,
            tokens_generated: tokensGenerated,
          })
        }

        reply.raw.write(
          `event: done\ndata: ${JSON.stringify({ tokens_generated: tokensGenerated })}\n\n`,
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Generation failed.'
        reply.raw.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`)
      } finally {
        reply.raw.end()
      }

      return reply
    },
  )
}
