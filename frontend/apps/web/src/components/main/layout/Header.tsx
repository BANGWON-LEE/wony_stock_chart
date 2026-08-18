import { useId, useState } from 'react'

import { MovePage } from '../../../router/MovePage'
import { GoogleLoginButton } from '../../../feat/auth/components/GoogleLoginButton'
// import { navItems, notificationItems } from '../data'
// import { navItems } from '../data'
import { NotificationCenterSection } from '../sections/NotificationCenterSection'
// import {router}

export function Header() {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const notificationPanelId = useId()
  // const unreadCount = notificationItems.filter(
  //   item => item.status === 'new',
  // ).length

  return (
    <header className="sticky top-0 z-10 grid min-h-16 grid-cols-[auto_1fr_auto] items-center gap-8 border-b border-[#e5e8eb] bg-white/90 px-12 backdrop-blur-[18px] max-[960px]:grid-cols-1 max-[960px]:gap-3.5 max-[960px]:px-5 max-[960px]:py-4">
      <div
        className="text-[22px] font-extrabold text-[#191f28] no-underline"
        // href="/"
        aria-label="Chart home"
      >
        <MovePage to="/" text="chart" />
      </div>
      {/* <nav
        className="flex items-center gap-7 max-[960px]:gap-4 max-[960px]:overflow-x-auto max-[960px]:pb-0.5"
        aria-label="주요 메뉴"
      >
        {navItems.map(item => (
          <a
            className="text-[15px] font-semibold whitespace-nowrap text-[#4e5968] no-underline hover:text-[#191f28]"
            key={item}
            href="/"
          >
            {item}
          </a>
        ))}
      </nav> */}
      <div className="relative flex items-center gap-2.5 max-[960px]:w-full">
        {/* <button
          className="h-[38px] min-w-[188px] cursor-pointer rounded-lg border-0 bg-[#f2f4f6] px-4 text-left font-[inherit] text-[#8b95a1] max-[960px]:w-full"
          type="button"
        >
          / 를 눌러 검색하세요
        </button> */}
        {/* <button
          className="relative inline-grid h-[38px] w-[38px] shrink-0 place-items-center rounded-lg bg-[#191f28] text-lg leading-none font-black text-white no-underline"
          aria-controls={notificationPanelId}
          aria-expanded={isNotificationOpen}
          aria-label={`읽지 않은 알림 ${unreadCount}개`}
          onClick={() => setIsNotificationOpen(isOpen => !isOpen)}
          type="button"
        >
          <span aria-hidden="true">!</span>
          {unreadCount > 0 ? (
            <strong className="absolute -top-1.5 -right-1.5 box-border inline-grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white bg-[#f04452] px-[5px] text-[11px] leading-none text-white">
              {unreadCount}
            </strong>
          ) : null}
        </button> */}
        <GoogleLoginButton />
        {isNotificationOpen ? (
          <NotificationCenterSection
            id={notificationPanelId}
            onClose={() => setIsNotificationOpen(false)}
          />
        ) : null}
      </div>
    </header>
  )
}
