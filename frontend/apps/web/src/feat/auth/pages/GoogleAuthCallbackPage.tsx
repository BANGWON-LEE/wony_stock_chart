import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import {
  exchangeGoogleCode,
  exchangeGoogleLoginCode,
} from '../api/googleAuthApi'
import {
  consumeGoogleAuthState,
  hasAuthSession,
  saveAuthSession,
} from '../authStorage'

export function GoogleAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    async function completeGoogleLogin() {
      const loginCode = searchParams.get('loginCode')

      if (loginCode) {
        try {
          const session = await exchangeGoogleLoginCode(loginCode)

          if (!isActive) return

          saveAuthSession(session)
          navigate('/', { replace: true })
          return
        } catch {
          if (!isActive) return
          setErrorMessage('Google 로그인에 실패했습니다.')
          return
        }
      }

      const error = searchParams.get('error')

      if (error) {
        if (hasAuthSession()) {
          navigate('/', { replace: true })
          return
        }

        setErrorMessage('Google 로그인에 실패했습니다.')
        setErrorDetail(
          [
            searchParams.get('reason'),
            searchParams.get('detail'),
            searchParams.get('requestId')
              ? `requestId=${searchParams.get('requestId')}`
              : null,
          ]
            .filter(Boolean)
            .join(' / '),
        )
        return
      }

      const code = searchParams.get('code')
      const returnedState = searchParams.get('state')
      const expectedState = consumeGoogleAuthState()

      if (!code) {
        setErrorMessage('Google 인증 코드가 없습니다.')
        return
      }

      if (!expectedState || returnedState !== expectedState) {
        setErrorMessage('Google 로그인 요청을 확인할 수 없습니다.')
        return
      }

      try {
        const session = await exchangeGoogleCode(code)

        if (!isActive) return

        saveAuthSession(session)
        navigate('/', { replace: true })
      } catch {
        if (!isActive) return
        setErrorMessage('Google 로그인에 실패했습니다.')
      }
    }

    void completeGoogleLogin()

    return () => {
      isActive = false
    }
  }, [navigate, searchParams])

  return (
    <main className="grid min-h-screen place-items-center bg-[#f2f4f6] px-5 text-[#191f28]">
      <section className="w-full max-w-[420px] rounded-lg border border-[#e5e8eb] bg-white p-8 shadow-[0_10px_30px_rgba(25,31,40,0.08)]">
        <h1 className="m-0 text-xl font-extrabold tracking-[0]">
          Google 로그인
        </h1>
        {errorMessage ? (
          <>
            <p className="mt-3 mb-6 text-[15px] leading-6 text-[#4e5968]">
              {errorMessage}
            </p>
            {errorDetail ? (
              <p className="mt-[-12px] mb-6 text-[13px] leading-5 break-words text-[#8b95a1]">
                {errorDetail}
              </p>
            ) : null}
            <Link
              className="inline-flex h-[40px] items-center rounded-lg bg-[#191f28] px-4 text-[14px] font-bold text-white no-underline"
              to="/"
            >
              홈으로 돌아가기
            </Link>
          </>
        ) : (
          <p className="mt-3 mb-0 text-[15px] leading-6 text-[#4e5968]">
            서버에 Google 인증 코드를 전달하는 중입니다.
          </p>
        )}
      </section>
    </main>
  )
}
