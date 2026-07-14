import type { FastifyInstance } from 'fastify'
import { FREE_MONTHLY_GENERATIONS, validateContentLength } from '@postpilot/shared-utils'
import type { Environment } from '../../../config/environment.js'
import { createAuthValidation } from '../../../middlewares/authValidation.js'
import { createUsageAccessGuard } from '../../../middlewares/usageAccessGuard.js'
import { getServiceSupabase } from '../../../config/supabase.js'
import { getDb } from '../../../config/database.js'
import { getUsageSummary } from '../../../services/usageService.js'
import { streamGeminiCompletion } from '../../../services/geminiClient.js'
import { AiGenerateSchema } from './aiSchema.js'

export async function registerAiRoutes(app: FastifyInstance, env: Environment) {
  const authValidation = createAuthValidation(env)
  const usageAccessGuard = createUsageAccessGuard(env)

  app.post(
    '/api/v1/ai/generate',
    {
      schema: AiGenerateSchema,
      preHandler: [authValidation, usageAccessGuard],
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

      reply.hijack()
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      })

      let tokensGenerated = 0

      try {
        for await (const token of streamGeminiCompletion(env, { platform, action, content })) {
          tokensGenerated += 1
          reply.raw.write(`event: message\ndata: ${JSON.stringify({ token })}\n\n`)
        }

        if (request.userId) {
          const supabase = getServiceSupabase(env)
          const { error } = await supabase.from('ai_logs').insert({
            user_id: request.userId,
            platform,
            action_type: action,
            tokens_generated: tokensGenerated,
          })
          if (error) {
            request.log.error(error, 'Failed to insert ai_logs row')
          }
        }

        const usage = request.userId
          ? await getUsageSummary(getDb(env), request.userId)
          : {
              plan: 'free' as const,
              usedThisMonth: 0,
              freeAllowance: FREE_MONTHLY_GENERATIONS,
              remainingFree: FREE_MONTHLY_GENERATIONS,
              isSubscribed: false,
            }

        reply.raw.write(
          `event: done\ndata: ${JSON.stringify({
            tokens_generated: tokensGenerated,
            usage,
          })}\n\n`,
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Generation failed.'
        request.log.error(error, 'AI generation failed')
        reply.raw.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`)
      } finally {
        reply.raw.end()
      }
    },
  )
}
