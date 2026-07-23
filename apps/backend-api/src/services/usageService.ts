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

  const profileRows = await sql<{ free_allowance: number }[]>`
    SELECT free_allowance FROM public.profiles WHERE id = ${userId} LIMIT 1
  `
  const freeAllowance = profileRows[0]?.free_allowance ?? FREE_MONTHLY_GENERATIONS

  return {
    plan: isSubscribed ? 'pro' : 'free',
    usedThisMonth,
    freeAllowance,
    remainingFree: isSubscribed
      ? freeAllowance
      : Math.max(0, freeAllowance - usedThisMonth),
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

  if (usage.usedThisMonth < usage.freeAllowance) {
    return { allowed: true, usage }
  }

  return {
    allowed: false,
    usage,
    reason: `You've used your ${usage.freeAllowance} free generations this month. Upgrade to continue.`,
  }
}
