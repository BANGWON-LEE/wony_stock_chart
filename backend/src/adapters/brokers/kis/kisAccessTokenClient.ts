export type KisAccessTokenClientConfig = {
  baseUrl: string
  appKey?: string
  appSecret?: string
}

export type KisAccessTokenIssueResult = {
  accessToken: string
  tokenType: string
  expiresIn: number
  expiresAt: string
}

type KisAccessTokenResponse = {
  access_token?: string
  token_type?: string
  expires_in?: number
  access_token_token_expired?: string
  rt_cd?: string
  msg_cd?: string
  msg1?: string
  [key: string]: unknown
}

type CachedKisAccessToken = KisAccessTokenIssueResult & {
  expiresAtMs: number
}

const TOKEN_ENDPOINT = '/oauth2/tokenP'
const REFRESH_BUFFER_MS = 60_000

let cachedToken: CachedKisAccessToken | undefined

function buildTokenUrl(baseUrl: string): URL {
  return new URL(TOKEN_ENDPOINT, baseUrl)
}

function toExpiresAtMs(payload: KisAccessTokenResponse): number {
  if (typeof payload.access_token_token_expired === 'string') {
    const parsed = Date.parse(payload.access_token_token_expired)

    if (Number.isFinite(parsed)) return parsed
  }

  const expiresInSeconds =
    typeof payload.expires_in === 'number' &&
    Number.isFinite(payload.expires_in)
      ? payload.expires_in
      : 86_400

  return Date.now() + expiresInSeconds * 1000
}

function toIssueResult(payload: KisAccessTokenResponse): CachedKisAccessToken {
  if (!payload.access_token) {
    throw new KisAccessTokenError(502, payload)
  }

  const expiresAtMs = toExpiresAtMs(payload)
  const expiresIn = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000))

  return {
    accessToken: payload.access_token,
    tokenType: payload.token_type ?? 'Bearer',
    expiresIn,
    expiresAt: new Date(expiresAtMs).toISOString(),
    expiresAtMs,
  }
}

export class KisAccessTokenClient {
  constructor(private readonly config: KisAccessTokenClientConfig) {}

  async issueAccessToken(
    forceRefresh = false,
  ): Promise<KisAccessTokenIssueResult> {
    this.assertConfigured()

    if (
      !forceRefresh &&
      cachedToken &&
      cachedToken.expiresAtMs - REFRESH_BUFFER_MS > Date.now()
    ) {
      return cachedToken
    }

    const response = await fetch(buildTokenUrl(this.config.baseUrl), {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: this.config.appKey,
        appsecret: this.config.appSecret,
      }),
    })

    const payload = (await response.json()) as KisAccessTokenResponse

    console.log('KIS Access Token Response:', payload)

    if (!response.ok || payload.rt_cd === '1') {
      throw new KisAccessTokenError(response.status, payload)
    }

    cachedToken = toIssueResult(payload)

    return cachedToken
  }

  private assertConfigured(): void {
    const missing = [
      ['KIS_APP_KEY', this.config.appKey],
      ['KIS_APP_SECRET', this.config.appSecret],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name)

    if (missing.length > 0) {
      throw new KisAccessTokenConfigError(
        `Missing KIS config: ${missing.join(', ')}`,
      )
    }
  }
}

export class KisAccessTokenConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KisAccessTokenConfigError'
  }
}

export class KisAccessTokenError extends Error {
  constructor(
    readonly statusCode: number,
    readonly payload: KisAccessTokenResponse,
  ) {
    super(payload.msg1 ?? 'KIS access token request failed')
    this.name = 'KisAccessTokenError'
  }
}
