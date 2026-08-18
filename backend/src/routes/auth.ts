import { randomUUID } from 'node:crypto'
import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from 'fastify'
import { OAuth2Client } from 'google-auth-library'
import { fail, ok, sendNoContent } from '../utils/http.js'

const credentialsBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  additionalProperties: false,
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 10 },
  },
} as const

const googleCallbackBodySchema = {
  type: 'object',
  required: ['code'],
  additionalProperties: false,
  properties: {
    code: { type: 'string', minLength: 1 },
  },
} as const

const googleSessionBodySchema = {
  type: 'object',
  required: ['loginCode'],
  additionalProperties: false,
  properties: {
    loginCode: { type: 'string', minLength: 1 },
  },
} as const

const googleUrlQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    state: { type: 'string', minLength: 1 },
  },
} as const

const googleCallbackQuerySchema = {
  type: 'object',
  required: ['code'],
  additionalProperties: true,
  properties: {
    code: { type: 'string', minLength: 1 },
    state: { type: 'string', minLength: 1 },
  },
} as const

type GoogleCallbackBody = {
  code: string
}

type GoogleSessionBody = {
  loginCode: string
}

type GoogleCallbackQuery = {
  code: string
  state?: string
}

type GoogleUrlQuery = {
  state?: string
}

type AuthUser = {
  id: string
  email: string
  name?: string
  picture?: string
  provider: 'google'
}

type AuthSession = ReturnType<typeof issueAuthTokens> & {
  user: AuthUser
}

type PendingLoginSession = {
  expiresAt: number
  session: AuthSession
}

const pendingLoginSessions = new Map<string, PendingLoginSession>()
const loginCodeTtlMs = 3 * 60 * 1000
const replayLoginSessionTtlMs = 30 * 1000
const completedLoginSessions = new Map<string, PendingLoginSession>()
const completedGoogleLogins = new Map<string, PendingLoginSession>()
const inFlightGoogleLogins = new Map<string, Promise<AuthSession>>()

function getGoogleOAuthClient(app: FastifyInstance): OAuth2Client {
  const { googleClientId, googleClientSecret, googleRedirectUri } =
    app.config.auth

  if (!googleClientId || !googleClientSecret || !googleRedirectUri) {
    throw app.httpErrors.internalServerError(
      'Google OAuth 환경 변수가 설정되지 않았습니다.',
    )
  }

  return new OAuth2Client({
    clientId: googleClientId,
    clientSecret: googleClientSecret,
    redirectUri: googleRedirectUri,
  })
}

function issueAuthTokens(app: FastifyInstance, user: AuthUser) {
  const payload = {
    sub: user.id,
    email: user.email,
    provider: user.provider,
  }

  return {
    accessToken: app.jwt.sign(payload, { expiresIn: '1h' }),
    expiresIn: 3600,
    refreshToken: app.jwt.sign(payload, {
      key: app.config.auth.jwtRefreshSecret,
      expiresIn: '30d',
    }),
  }
}

function getFrontendUrl(app: FastifyInstance) {
  return app.config.auth.frontendUrl ?? 'http://localhost:5173'
}

function redirectToFrontend(
  app: FastifyInstance,
  reply: FastifyReply,
  path: string,
  params: Record<string, string>,
) {
  const url = new URL(path, getFrontendUrl(app))

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  return reply.redirect(url.toString())
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : ''
}

function getGoogleLoginFailureReason(error: unknown) {
  const message = getErrorMessage(error)

  if (message.includes('invalid_grant')) return 'invalid_grant'
  if (message.includes('redirect_uri_mismatch')) return 'redirect_uri_mismatch'
  if (message.includes('invalid_client')) return 'invalid_client'
  if (message.includes('invalid_request')) return 'invalid_request'
  if (message.includes('Google OAuth 환경 변수')) return 'missing_google_config'
  if (message.includes('Google ID token')) return 'missing_id_token'
  if (message.includes('Google 계정 정보')) return 'invalid_google_account'
  if (message.includes('secret')) return 'jwt_secret_error'
  if (message.includes('sign')) return 'jwt_sign_error'

  return 'unknown'
}

function getGoogleLoginFailureDetail(app: FastifyInstance, error: unknown) {
  if (app.config.nodeEnv === 'production') return null

  const message = getErrorMessage(error).trim()

  if (!message) return null

  return message.slice(0, 160)
}

function pruneExpiredLoginSessions(now = Date.now()) {
  for (const [loginCode, pending] of pendingLoginSessions) {
    if (pending.expiresAt <= now) {
      pendingLoginSessions.delete(loginCode)
    }
  }

  for (const [loginCode, pending] of completedLoginSessions) {
    if (pending.expiresAt <= now) {
      completedLoginSessions.delete(loginCode)
    }
  }

  for (const [code, pending] of completedGoogleLogins) {
    if (pending.expiresAt <= now) {
      completedGoogleLogins.delete(code)
    }
  }
}

function createLoginCode(session: AuthSession) {
  pruneExpiredLoginSessions()

  const loginCode = randomUUID()
  pendingLoginSessions.set(loginCode, {
    expiresAt: Date.now() + loginCodeTtlMs,
    session,
  })

  return loginCode
}

function consumeLoginCode(loginCode: string) {
  pruneExpiredLoginSessions()

  const pending = pendingLoginSessions.get(loginCode)

  if (!pending) {
    const completed = completedLoginSessions.get(loginCode)

    if (!completed || completed.expiresAt <= Date.now()) {
      return null
    }

    return completed.session
  }

  pendingLoginSessions.delete(loginCode)
  completedLoginSessions.set(loginCode, {
    expiresAt: Date.now() + replayLoginSessionTtlMs,
    session: pending.session,
  })

  if (pending.expiresAt <= Date.now()) {
    return null
  }

  return pending.session
}

async function completeGoogleLogin(
  app: FastifyInstance,
  code: string,
): Promise<AuthSession> {
  pruneExpiredLoginSessions()

  const completed = completedGoogleLogins.get(code)

  if (completed && completed.expiresAt > Date.now()) {
    return completed.session
  }

  const inFlight = inFlightGoogleLogins.get(code)

  if (inFlight) {
    return inFlight
  }

  const loginPromise = exchangeGoogleCodeForSession(app, code)
    .then(session => {
      completedGoogleLogins.set(code, {
        expiresAt: Date.now() + replayLoginSessionTtlMs,
        session,
      })

      return session
    })
    .finally(() => {
      inFlightGoogleLogins.delete(code)
    })

  inFlightGoogleLogins.set(code, loginPromise)

  return loginPromise
}

async function exchangeGoogleCodeForSession(
  app: FastifyInstance,
  code: string,
): Promise<AuthSession> {
  const client = getGoogleOAuthClient(app)
  const { tokens } = await client.getToken({
    code,
    redirect_uri: app.config.auth.googleRedirectUri,
  })

  if (!tokens.id_token) {
    throw app.httpErrors.unauthorized('Google ID token을 받지 못했습니다.')
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: app.config.auth.googleClientId,
  })
  const payload = ticket.getPayload()

  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw app.httpErrors.unauthorized('Google 계정 정보를 검증할 수 없습니다.')
  }

  const user: AuthUser = {
    id: `google:${payload.sub}`,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    provider: 'google',
  }

  return {
    ...issueAuthTokens(app, user),
    user,
  }
}

export const authRoutes: FastifyPluginAsync = async app => {
  app.post(
    '/auth/signup',
    { schema: { body: credentialsBodySchema } },
    async (_request, reply) => {
      reply.status(201)
      return ok({
        user: {
          id: 'u_stub',
          email: 'user@example.com',
          createdAt: new Date().toISOString(),
        },
      })
    },
  )

  app.post(
    '/auth/login',
    { schema: { body: credentialsBodySchema } },
    async () =>
      ok({
        accessToken: 'stub-access-token',
        expiresIn: 3600,
        user: {
          id: 'u_stub',
          email: 'user@example.com',
        },
      }),
  )

  app.get<{ Querystring: GoogleUrlQuery }>(
    '/auth/google/url',
    { schema: { querystring: googleUrlQuerySchema } },
    async request => {
      const client = getGoogleOAuthClient(app)
      const url = client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['openid', 'email', 'profile'],
        state: request.query.state,
      })

      console.log('Generated Google OAuth URL:', url)

      return ok({ url })
    },
  )

  app.post<{ Body: GoogleCallbackBody }>(
    '/auth/google/callback',
    { schema: { body: googleCallbackBodySchema } },
    async (request, reply) => {
      try {
        return ok(await completeGoogleLogin(app, request.body.code))
      } catch (error) {
        request.log.warn({ err: error }, 'Google login failed')
        reply.status(401)
        return fail({
          code: 'UNAUTHORIZED',
          message: 'Google 로그인에 실패했습니다.',
        })
      }
    },
  )

  app.get<{ Querystring: GoogleCallbackQuery }>(
    '/auth/google/callback',
    { schema: { querystring: googleCallbackQuerySchema } },
    async (request, reply) => {
      try {
        const session = await completeGoogleLogin(app, request.query.code)
        const loginCode = createLoginCode(session)

        return redirectToFrontend(app, reply, '/auth/google/callback', {
          loginCode,
        })
      } catch (error) {
        const detail = getGoogleLoginFailureDetail(app, error)
        request.log.warn({ err: error }, 'Google login failed')
        const params: Record<string, string> = {
          error: 'google_login_failed',
          reason: getGoogleLoginFailureReason(error),
          requestId: request.id,
        }

        if (detail) {
          params.detail = detail
        }

        return redirectToFrontend(app, reply, '/auth/google/callback', params)
      }
    },
  )

  app.post<{ Body: GoogleSessionBody }>(
    '/auth/google/session',
    { schema: { body: googleSessionBodySchema } },
    async (request, reply) => {
      const session = consumeLoginCode(request.body.loginCode)

      if (!session) {
        reply.status(401)
        return fail({
          code: 'UNAUTHORIZED',
          message: 'Google 로그인 세션이 만료되었거나 유효하지 않습니다.',
        })
      }

      return ok(session)
    },
  )

  app.post(
    '/auth/refresh',
    {
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          additionalProperties: false,
          properties: {
            refreshToken: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async () =>
      ok({
        accessToken: 'stub-access-token',
        expiresIn: 3600,
        refreshToken: 'stub-refresh-token',
      }),
  )

  app.post(
    '/auth/logout',
    {
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          additionalProperties: false,
          properties: {
            refreshToken: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (_request, reply) => sendNoContent(reply),
  )
}
