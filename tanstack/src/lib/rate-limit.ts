import { count, and, or, eq, gte } from 'drizzle-orm'
import { sites } from '../db/schema'
import { getRequestIP, getRequestHeaders } from '@tanstack/react-start/server'

export const RATE_LIMIT_CONFIG = {
  GLOBAL_DAILY_LIMIT: 100, // Celosvětový denní strop pro celou aplikaci
  USER_DAILY_LIMIT: 10,    // Denní limit na jednoho uživatele (session / IP)
  USER_HOURLY_LIMIT: 4,    // Krátkodobý limit za hodinu proti spamu
}

export interface RateLimitStats {
  userDailyUsed: number
  userDailyLimit: number
  userRemaining: number
  globalDailyUsed: number
  globalDailyLimit: number
  globalRemaining: number
  isLimited: boolean
  limitReason?: string
}

export function getClientIp(): string | undefined {
  try {
    const ip = getRequestIP({ xForwardedFor: true })
    if (ip) return ip
    const headers = getRequestHeaders()
    return (
      headers.get('cf-connecting-ip') ||
      headers.get('x-real-ip') ||
      headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      undefined
    )
  } catch {
    return undefined
  }
}

export function getStartOfTodayIso(): string {
  const now = new Date()
  now.setUTCHours(0, 0, 0, 0)
  return now.toISOString()
}

export function getOneHourAgoIso(): string {
  return new Date(Date.now() - 60 * 60 * 1000).toISOString()
}

/**
 * Spočítá a ověří aktuální stav využití kreditů a rate limitů pro danou relaci a IP.
 */
export async function getRateLimitStats(
  db: any,
  sessionId: string,
  clientIp?: string
): Promise<RateLimitStats> {
  const defaultLimits: RateLimitStats = {
    userDailyUsed: 0,
    userDailyLimit: RATE_LIMIT_CONFIG.USER_DAILY_LIMIT,
    userRemaining: RATE_LIMIT_CONFIG.USER_DAILY_LIMIT,
    globalDailyUsed: 0,
    globalDailyLimit: RATE_LIMIT_CONFIG.GLOBAL_DAILY_LIMIT,
    globalRemaining: RATE_LIMIT_CONFIG.GLOBAL_DAILY_LIMIT,
    isLimited: false,
  }

  try {
    const startOfToday = getStartOfTodayIso()
    const oneHourAgo = getOneHourAgoIso()

    // 1. Globální využití za dnešek
    const globalResult = await db
      .select({ count: count() })
      .from(sites)
      .where(gte(sites.createdAt, startOfToday))

    const globalDailyUsed = Number(globalResult[0]?.count || 0)

    // 2. Uživatelské filtry (podle session ID nebo IP adresy)
    const userConditions = [eq(sites.sessionId, sessionId)]
    if (clientIp) {
      userConditions.push(eq(sites.ip, clientIp))
    }
    const userMatcher = userConditions.length > 1 ? or(...userConditions) : userConditions[0]

    // Uživatelské využití za dnešek
    const userDailyResult = await db
      .select({ count: count() })
      .from(sites)
      .where(and(userMatcher, gte(sites.createdAt, startOfToday)))

    const userDailyUsed = Number(userDailyResult[0]?.count || 0)

    // Uživatelské využití za poslední hodinu
    const userHourlyResult = await db
      .select({ count: count() })
      .from(sites)
      .where(and(userMatcher, gte(sites.createdAt, oneHourAgo)))

    const userHourlyUsed = Number(userHourlyResult[0]?.count || 0)

    // 3. Kontrola limitů
    let isLimited = false
    let limitReason: string | undefined

    if (globalDailyUsed >= RATE_LIMIT_CONFIG.GLOBAL_DAILY_LIMIT) {
      isLimited = true
      limitReason = `Byla vyčerpána celková denní kapacita aplikace (${RATE_LIMIT_CONFIG.GLOBAL_DAILY_LIMIT}/${RATE_LIMIT_CONFIG.GLOBAL_DAILY_LIMIT} kampaní). Obnoví se o půlnoci.`
    } else if (userDailyUsed >= RATE_LIMIT_CONFIG.USER_DAILY_LIMIT) {
      isLimited = true
      limitReason = `Vyčerpali jste svůj denní limit (${RATE_LIMIT_CONFIG.USER_DAILY_LIMIT}/${RATE_LIMIT_CONFIG.USER_DAILY_LIMIT} kampaní). Obnoví se o půlnoci.`
    } else if (userHourlyUsed >= RATE_LIMIT_CONFIG.USER_HOURLY_LIMIT) {
      isLimited = true
      limitReason = `Příliš mnoho generování za krátkou dobu (max ${RATE_LIMIT_CONFIG.USER_HOURLY_LIMIT} za hodinu). Zkuste to prosím za chvíli.`
    }

    const userRemaining = Math.max(0, RATE_LIMIT_CONFIG.USER_DAILY_LIMIT - userDailyUsed)
    const globalRemaining = Math.max(0, RATE_LIMIT_CONFIG.GLOBAL_DAILY_LIMIT - globalDailyUsed)

    return {
      userDailyUsed,
      userDailyLimit: RATE_LIMIT_CONFIG.USER_DAILY_LIMIT,
      userRemaining,
      globalDailyUsed,
      globalDailyLimit: RATE_LIMIT_CONFIG.GLOBAL_DAILY_LIMIT,
      globalRemaining,
      isLimited,
      limitReason,
    }
  } catch (err) {
    console.warn('Upozornění při vyhodnocování rate limitu:', err)
    return defaultLimits
  }
}
