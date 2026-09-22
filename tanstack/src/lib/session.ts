import { useSession, getCookie, setCookie } from '@tanstack/react-start/server'

export interface LagoonEdgeSessionData {
  sessionId?: string
}

// 32+ character secret for encrypted session cookie
const SESSION_SECRET =
  (typeof process !== 'undefined' && process.env?.SESSION_SECRET) ||
  'lagoonedge-secure-session-key-must-be-at-least-32-chars-long-2026!'

const SESSION_COOKIE_NAME = 'lagoonedge_sid'

/**
 * Retrieves the current user's session ID or generates and sets a new one.
 * Uses TanStack Start's `useSession` with an encrypted cookie, with fallback to direct cookie.
 */
export async function getOrCreateSessionId(): Promise<string> {
  const existingCookieId = getCookie(SESSION_COOKIE_NAME)

  try {
    const session = await useSession<LagoonEdgeSessionData>({
      name: 'lagoonedge_session',
      password: SESSION_SECRET,
      maxAge: 60 * 60 * 24 * 365, // 1 year
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      },
    })

    let sessionId = session.data.sessionId || existingCookieId

    if (!sessionId) {
      sessionId = crypto.randomUUID()
    }

    if (session.data.sessionId !== sessionId) {
      await session.update({ sessionId })
    }

    if (existingCookieId !== sessionId) {
      setCookie(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      })
    }

    return sessionId
  } catch (err) {
    console.warn('Session manager warning, using fallback cookie:', err)
    if (existingCookieId) {
      return existingCookieId
    }
    const newId = crypto.randomUUID()
    setCookie(SESSION_COOKIE_NAME, newId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
    return newId
  }
}

/**
 * Retrieves the existing session ID if present, otherwise returns null.
 */
export async function getSessionId(): Promise<string | null> {
  const existingCookieId = getCookie(SESSION_COOKIE_NAME)
  try {
    const session = await useSession<LagoonEdgeSessionData>({
      name: 'lagoonedge_session',
      password: SESSION_SECRET,
    })
    return session.data.sessionId || existingCookieId || null
  } catch {
    return existingCookieId || null
  }
}
