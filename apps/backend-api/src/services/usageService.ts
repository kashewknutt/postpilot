import type { Sql } from 'postgres'
import type { UsageSummary } from '@postpilot/shared-types'
import {
  FREE_MONTHLY_GENERATIONS,
  isActiveSubscriptionStatus,
} from '@postpilot/shared-utils'
import { getSubscriptionStatusForUser } from './subscriptionService.js'

export async function countGenerationsThisMonth(sql: Sql, userId: string): Promise<number> {
  const rows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count
    FROM public.ai_logs
    WHERE user_id = ${userId}
      AND created_at >= date_trunc('month', NOW() AT TIME ZONE 'utc')
  `
  return Number(rows[0]?.count ?? 0)
}

export async function getUsageSummary(sql: Sql, userId: string): Promise<UsageSummary> {
  const status = await getSubscriptionStatusForUser(sql, userId)
  const isSubscribed = isActiveSubscriptionStatus(status)
  const usedThisMonth = await countGenerationsThisMonth(sql, userId)

  return {
    plan: isSubscribed ? 'pro' : 'free',
    usedThisMonth,
    freeAllowance: FREE_MONTHLY_GENERATIONS,
    remainingFree: isSubscribed
      ? FREE_MONTHLY_GENERATIONS
      : Math.max(0, FREE_MONTHLY_GENERATIONS - usedThisMonth),
    isSubscribed,
  }
}

export async function canUserGenerate(
  sql: Sql,
  userId: string,
): Promise<{ allowed: boolean; usage: UsageSummary; reason?: string }> {
  const usage = await getUsageSummary(sql, userId)

  if (usage.isSubscribed) {
    return { allowed: true, usage }
  }

  if (usage.usedThisMonth < FREE_MONTHLY_GENERATIONS) {
    return { allowed: true, usage }
  }

  return {
    allowed: false,
    usage,
    reason: `You've used your ${FREE_MONTHLY_GENERATIONS} free generations this month. Upgrade to continue.`,
  }
}
