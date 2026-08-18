import type { GoogleAuthSession } from './api/googleAuthApi'

const GOOGLE_AUTH_STATE_KEY = 'chart.googleAuthState'
const AUTH_SESSION_KEY = 'chart.authSession'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isGoogleAuthUser(value: unknown): value is GoogleAuthSession['user'] {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.email === 'string' &&
    value.email.length > 0 &&
    value.provider === 'google' &&
    (value.name === undefined || typeof value.name === 'string') &&
    (value.picture === undefined || typeof value.picture === 'string')
  )
}

function isGoogleAuthSession(value: unknown): value is GoogleAuthSession {
  if (!isRecord(value)) return false

  return (
    typeof value.accessToken === 'string' &&
    value.accessToken.length > 0 &&
    typeof value.expiresIn === 'number' &&
    value.expiresIn > 0 &&
    typeof value.refreshToken === 'string' &&
    value.refreshToken.length > 0 &&
    isGoogleAuthUser(value.user)
  )
}

function parseJwtPayload(accessToken: string) {
  const [, payload] = accessToken.split('.')

  if (!payload) return null

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '=',
    )

    return JSON.parse(window.atob(paddedPayload)) as unknown
  } catch {
    return null
  }
}

function isAccessTokenActive(accessToken: string) {
  const payload = parseJwtPayload(accessToken)

  if (!isRecord(payload)) return false
  if (typeof payload.exp !== 'number') return false

  return payload.exp * 1000 > Date.now()
}

export function createGoogleAuthState() {
  const randomValues = new Uint32Array(4)
  window.crypto.getRandomValues(randomValues)
  const state = Array.from(randomValues, value => value.toString(16)).join('')

  window.sessionStorage.setItem(GOOGLE_AUTH_STATE_KEY, state)

  return state
}

export function consumeGoogleAuthState() {
  const state = window.sessionStorage.getItem(GOOGLE_AUTH_STATE_KEY)
  window.sessionStorage.removeItem(GOOGLE_AUTH_STATE_KEY)

  return state
}

export function saveAuthSession(session: GoogleAuthSession) {
  window.sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

export function clearAuthSession() {
  window.sessionStorage.removeItem(AUTH_SESSION_KEY)
  window.sessionStorage.removeItem(GOOGLE_AUTH_STATE_KEY)
}

export function getAuthSession() {
  const rawSession = window.sessionStorage.getItem(AUTH_SESSION_KEY)

  if (!rawSession) return null

  try {
    const session: unknown = JSON.parse(rawSession)

    if (
      !isGoogleAuthSession(session) ||
      !isAccessTokenActive(session.accessToken)
    ) {
      window.sessionStorage.removeItem(AUTH_SESSION_KEY)
      return null
    }

    return session
  } catch {
    window.sessionStorage.removeItem(AUTH_SESSION_KEY)
    return null
  }
}

export function hasAuthSession() {
  return getAuthSession() !== null
}
