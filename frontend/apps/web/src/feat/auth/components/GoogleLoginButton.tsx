import { useState } from 'react'

import { getGoogleAuthUrl, logout } from '../api/googleAuthApi'
import {
  clearAuthSession,
  createGoogleAuthState,
  getAuthSession,
} from '../authStorage'

export function GoogleLoginButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [logoutStatus, setLogoutStatus] = useState<'idle' | 'loading'>('idle')
  const [authSession, setAuthSession] = useState(() => getAuthSession())
  const user = authSession?.user

  const handleLogin = async () => {
    setStatus('loading')

    try {
      const authUrl = await getGoogleAuthUrl(createGoogleAuthState())
      window.location.assign(authUrl)
    } catch {
      setStatus('error')
    }
  }

  const handleLogout = async () => {
    if (!authSession || logoutStatus === 'loading') return

    setLogoutStatus('loading')

    try {
      await logout(authSession.refreshToken)
    } catch {
      // Local session removal is the source of truth for this client logout.
    } finally {
      clearAuthSession()
      setAuthSession(null)
      setStatus('idle')
      setLogoutStatus('idle')
    }
  }

  if (user) {
    const displayName = user.name ?? user.email
    const fallbackInitial = displayName.slice(0, 1).toUpperCase()

    return (
      <div
        className="inline-flex h-[38px] max-w-[300px] shrink-0 items-center gap-2 rounded-lg border border-[#e5e8eb] bg-white px-2.5 text-[#191f28] shadow-[0_1px_2px_rgba(25,31,40,0.04)]"
        title={`${displayName} (${user.email})`}
      >
        {user.picture ? (
          <img
            alt={`${displayName} 프로필`}
            className="h-7 w-7 rounded-full object-cover"
            referrerPolicy="no-referrer"
            src={user.picture}
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid h-7 w-7 place-items-center rounded-full bg-[#191f28] text-[13px] font-extrabold text-white"
          >
            {fallbackInitial}
          </span>
        )}
        <span className="min-w-0 truncate text-[14px] font-bold whitespace-nowrap">
          {displayName}
        </span>
        <button
          className="ml-1 h-7 shrink-0 cursor-pointer rounded-md border-0 bg-[#f2f4f6] px-2 text-[12px] font-extrabold whitespace-nowrap text-[#4e5968] hover:bg-[#e5e8eb] disabled:cursor-not-allowed disabled:opacity-65"
          disabled={logoutStatus === 'loading'}
          onClick={handleLogout}
          title="로그아웃"
          type="button"
        >
          {logoutStatus === 'loading' ? '종료 중' : '로그아웃'}
        </button>
      </div>
    )
  }

  return (
    <button
      className="inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-[#d0d5dd] bg-white px-3 text-[14px] font-bold whitespace-nowrap text-[#191f28] shadow-[0_1px_2px_rgba(25,31,40,0.06)] hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-65"
      disabled={status === 'loading'}
      onClick={handleLogin}
      title={status === 'error' ? 'Google 로그인 요청 실패' : 'Google 로그인'}
      type="button"
    >
      <span
        aria-hidden="true"
        className="grid h-5 w-5 place-items-center rounded-full border border-[#e5e8eb] text-[13px] font-extrabold text-[#4285f4]"
      >
        G
      </span>
      <span>{status === 'loading' ? '연결 중' : 'Google 로그인'}</span>
    </button>
  )
}
