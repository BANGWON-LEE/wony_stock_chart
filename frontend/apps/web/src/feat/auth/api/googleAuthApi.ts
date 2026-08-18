import { apiClient } from '../../../api/client'

type ApiSuccessResponse<T> = {
  success: true
  data: T
}

export type GoogleAuthUser = {
  id: string
  email: string
  name?: string
  picture?: string
  provider: 'google'
}

export type GoogleAuthSession = {
  accessToken: string
  expiresIn: number
  refreshToken: string
  user: GoogleAuthUser
}

export async function getGoogleAuthUrl(state: string) {
  const { data } = await apiClient.get<ApiSuccessResponse<{ url: string }>>(
    '/auth/google/url',
    {
      params: { state },
    },
  )

  return data.data.url
}

export async function exchangeGoogleCode(code: string) {
  const { data } = await apiClient.post<ApiSuccessResponse<GoogleAuthSession>>(
    '/auth/google/callback',
    { code },
  )

  return data.data
}

export async function exchangeGoogleLoginCode(loginCode: string) {
  const { data } = await apiClient.post<ApiSuccessResponse<GoogleAuthSession>>(
    '/auth/google/session',
    { loginCode },
  )

  return data.data
}

export async function logout(refreshToken: string) {
  await apiClient.post('/auth/logout', { refreshToken })
}
