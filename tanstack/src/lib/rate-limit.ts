import { count, and, or, eq, gte } from 'drizzle-orm'
import { sites } from '../db/schema'
import { getRequestIP, getRequestHeaders } from '@tanstack/react-start/server'
import rawRateLimitConfig from '../../rate-limit.json'

export interface RateLimitsFileConfig {
  userLimits?: {
    perMinute?: number | null
    perHour?: number | null
    perDay?: number | null
    perMonth?: number | null
  }
  globalLimits?: {
    perDay?: number | null
    perMonth?: number | null
  }
  messages?: {
    perMinuteExceeded?: string
    perHourExceeded?: string
    perDayExceeded?: string
    perMonthExceeded?: string
    globalDailyExceeded?: string
    globalMonthlyExceeded?: string
  }
}

export const rateLimitConfig: RateLimitsFileConfig = rawRateLimitConfig

export const RATE_LIMIT_CONFIG = {
  GLOBAL_DAILY_LIMIT: rateLimitConfig.globalLimits?.perDay ?? 100,
  GLOBAL_MONTHLY_LIMIT: rateLimitConfig.globalLimits?.perMonth ?? 2500,
  USER_DAILY_LIMIT: rateLimitConfig.userLimits?.perDay ?? 10,
  USER_HOURLY_LIMIT: rateLimitConfig.userLimits?.perHour ?? 4,
  USER_MINUTE_LIMIT: rateLimitConfig.userLimits?.perMinute ?? 2,
  USER_MONTHLY_LIMIT: rateLimitConfig.userLimits?.perMonth ?? 100,
}

export interface RateLimitStats {
  userDailyUsed: number
  userDailyLimit: number
  userRemaining: number
  userMonthlyUsed?: number
  userMonthlyLimit?: number
  userMonthlyRemaining?: number
  globalDailyUsed: number
  globalDailyLimit: number
  globalRemaining: number
  globalMonthlyUsed?: number
  globalMonthlyLimit?: number
  globalMonthlyRemaining?: number
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

export function getStartOfMonthIso(): string {
  const now = new Date()
  now.setUTCDate(1)
  now.setUTCHours(0, 0, 0, 0)
  return now.toISOString()
}

export function getOneHourAgoIso(): string {
  return new Date(Date.now() - 60 * 60 * 1000).toISOString()
}

export function getOneMinuteAgoIso(): string {
  return new Date(Date.now() - 60 * 1000).toISOString()
}

function formatMessage(template: string, limit: number): string {
  return template.replace(/\{limit\}/g, String(limit))
}

/**
 * Spočítá a ověří aktuální stav využití kreditů a rate limitů pro danou relaci a IP.
 */
export async function getRateLimitStats(
  db: any,
  sessionId: string,
  clientIp?: string
): Promise<RateLimitStats> {
  const userDailyLimit = rateLimitConfig.userLimits?.perDay ?? 10
  const userMonthlyLimit = rateLimitConfig.userLimits?.perMonth ?? 0
  const userHourlyLimit = rateLimitConfig.userLimits?.perHour ?? 0
  const userMinuteLimit = rateLimitConfig.userLimits?.perMinute ?? 0

  const globalDailyLimit = rateLimitConfig.globalLimits?.perDay ?? 100
  const globalMonthlyLimit = rateLimitConfig.globalLimits?.perMonth ?? 0

  const defaultLimits: RateLimitStats = {
    userDailyUsed: 0,
    userDailyLimit,
    userRemaining: userDailyLimit,
    globalDailyUsed: 0,
    globalDailyLimit,
    globalRemaining: globalDailyLimit,
    isLimited: false,
  }

  try {
    const startOfToday = getStartOfTodayIso()
    const startOfMonth = getStartOfMonthIso()
    const oneHourAgo = getOneHourAgoIso()
    const oneMinuteAgo = getOneMinuteAgoIso()

    // 1. Globální využití za dnešek
    const globalDailyResult = await db
      .select({ count: count() })
      .from(sites)
      .where(gte(sites.createdAt, startOfToday))
    const globalDailyUsed = Number(globalDailyResult[0]?.count || 0)

    // Globální využití za tento měsíc (pokud je limit aktivní)
    let globalMonthlyUsed = 0
    if (globalMonthlyLimit > 0) {
      const globalMonthlyResult = await db
        .select({ count: count() })
        .from(sites)
        .where(gte(sites.createdAt, startOfMonth))
      globalMonthlyUsed = Number(globalMonthlyResult[0]?.count || 0)
    }

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

    // Uživatelské využití za poslední měsíc
    let userMonthlyUsed = 0
    if (userMonthlyLimit > 0) {
      const userMonthlyResult = await db
        .select({ count: count() })
        .from(sites)
        .where(and(userMatcher, gte(sites.createdAt, startOfMonth)))
      userMonthlyUsed = Number(userMonthlyResult[0]?.count || 0)
    }

    // Uživatelské využití za poslední hodinu
    let userHourlyUsed = 0
    if (userHourlyLimit > 0) {
      const userHourlyResult = await db
        .select({ count: count() })
        .from(sites)
        .where(and(userMatcher, gte(sites.createdAt, oneHourAgo)))
      userHourlyUsed = Number(userHourlyResult[0]?.count || 0)
    }

    // Uživatelské využití za poslední minutu
    let userMinuteUsed = 0
    if (userMinuteLimit > 0) {
      const userMinuteResult = await db
        .select({ count: count() })
        .from(sites)
        .where(and(userMatcher, gte(sites.createdAt, oneMinuteAgo)))
      userMinuteUsed = Number(userMinuteResult[0]?.count || 0)
    }

    // 3. Kontrola limitů
    let isLimited = false
    let limitReason: string | undefined
    const messages = rateLimitConfig.messages

    if (globalMonthlyLimit > 0 && globalMonthlyUsed >= globalMonthlyLimit) {
      isLimited = true
      limitReason = messages?.globalMonthlyExceeded
        ? formatMessage(messages.globalMonthlyExceeded, globalMonthlyLimit)
        : `Byla vyčerpána celková měsíční kapacita aplikace (${globalMonthlyLimit}/${globalMonthlyLimit}). Obnoví se začátkem měsíce.`
    } else if (globalDailyLimit > 0 && globalDailyUsed >= globalDailyLimit) {
      isLimited = true
      limitReason = messages?.globalDailyExceeded
        ? formatMessage(messages.globalDailyExceeded, globalDailyLimit)
        : `Byla vyčerpána celková denní kapacita aplikace (${globalDailyLimit}/${globalDailyLimit}). Obnoví se o půlnoci.`
    } else if (userMonthlyLimit > 0 && userMonthlyUsed >= userMonthlyLimit) {
      isLimited = true
      limitReason = messages?.perMonthExceeded
        ? formatMessage(messages.perMonthExceeded, userMonthlyLimit)
        : `Vyčerpali jste svůj měsíční limit (${userMonthlyLimit}/${userMonthlyLimit} požadavků). Obnoví se začátkem měsíce.`
    } else if (userDailyLimit > 0 && userDailyUsed >= userDailyLimit) {
      isLimited = true
      limitReason = messages?.perDayExceeded
        ? formatMessage(messages.perDayExceeded, userDailyLimit)
        : `Vyčerpali jste svůj denní limit (${userDailyLimit}/${userDailyLimit} požadavků). Obnoví se o půlnoci.`
    } else if (userHourlyLimit > 0 && userHourlyUsed >= userHourlyLimit) {
      isLimited = true
      limitReason = messages?.perHourExceeded
        ? formatMessage(messages.perHourExceeded, userHourlyLimit)
        : `Příliš mnoho generování za hodinu (max ${userHourlyLimit} za hodinu). Zkuste to prosím za chvíli.`
    } else if (userMinuteLimit > 0 && userMinuteUsed >= userMinuteLimit) {
      isLimited = true
      limitReason = messages?.perMinuteExceeded
        ? formatMessage(messages.perMinuteExceeded, userMinuteLimit)
        : `Příliš mnoho požadavků za minutu (max ${userMinuteLimit} za minutu). Zkuste to prosím za chvíli.`
    }

    const userRemaining = userDailyLimit > 0 ? Math.max(0, userDailyLimit - userDailyUsed) : 999999
    const globalRemaining = globalDailyLimit > 0 ? Math.max(0, globalDailyLimit - globalDailyUsed) : 999999

    return {
      userDailyUsed,
      userDailyLimit,
      userRemaining,
      userMonthlyUsed,
      userMonthlyLimit,
      userMonthlyRemaining: userMonthlyLimit > 0 ? Math.max(0, userMonthlyLimit - userMonthlyUsed) : undefined,
      globalDailyUsed,
      globalDailyLimit,
      globalRemaining,
      globalMonthlyUsed,
      globalMonthlyLimit,
      globalMonthlyRemaining: globalMonthlyLimit > 0 ? Math.max(0, globalMonthlyLimit - globalMonthlyUsed) : undefined,
      isLimited,
      limitReason,
    }
  } catch (err) {
    console.warn('Upozornění při vyhodnocování rate limitu:', err)
    return defaultLimits
  }
}
