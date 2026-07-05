import { notificationItems } from '../data'

interface NotificationCenterSectionProps {
  id?: string
  onClose?: () => void
}

export function NotificationCenterSection({
  id = 'notifications',
  onClose,
}: NotificationCenterSectionProps) {
  const unreadCount = notificationItems.filter(item => item.status === 'new').length

  return (
    <section
      className="absolute top-[calc(100%+12px)] right-0 z-30 w-[420px] max-w-[calc(100vw-40px)] overflow-hidden rounded-lg border border-[#e5e8eb] bg-white shadow-[0_18px_48px_rgba(25,31,40,0.18)] max-[960px]:right-0 max-[960px]:w-[calc(100vw-40px)]"
      id={id}
      aria-labelledby="notification-title"
      role="dialog"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#e5e8eb] px-5 py-4">
        <div className="min-w-0">
          <p className="mb-1 text-sm font-extrabold text-[#3182f6]">알림 센터</p>
          <h2 className="m-0 text-lg leading-[1.25] tracking-[0]" id="notification-title">
            놓치면 안 되는 알림
          </h2>
        </div>
        <button
          className="inline-grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-[#f2f4f6] text-lg leading-none font-extrabold text-[#4e5968]"
          type="button"
          aria-label="알림 닫기"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between rounded-lg bg-[#f7f8fa] px-4 py-3">
          <span className="text-[13px] font-bold text-[#8b95a1]">읽지 않은 알림</span>
          <strong className="text-2xl leading-none text-[#191f28]">{unreadCount}</strong>
        </div>
        <ul className="m-0 max-h-[360px] list-none overflow-y-auto rounded-lg border border-[#e5e8eb] bg-white p-0" aria-label="최근 알림">
          {notificationItems.map(item => (
            <li
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-[#f2f4f6] px-4 py-3 first:border-t-0 max-[480px]:grid-cols-1 ${
                item.status === 'new' ? 'bg-[#fff8f2]' : ''
              }`}
              key={item.id}
            >
              <div className="min-w-0">
                <strong className="mb-1.5 block text-[15px] text-[#191f28]">
                  {item.status === 'new' ? (
                    <span className="mr-2 inline-block h-[7px] w-[7px] rounded-full bg-[#f04452] align-[2px]" aria-hidden="true" />
                  ) : null}
                  {item.title}
                </strong>
                <p className="mb-2 text-sm text-[#4e5968] leading-[1.45]">{item.body}</p>
                <span className="text-[13px] font-bold text-[#8b95a1]">{item.meta}</span>
              </div>
              <button
                className="h-[34px] cursor-pointer rounded-lg border-0 bg-[#f2f4f6] px-3.5 font-[inherit] text-sm font-extrabold text-[#4e5968] max-[480px]:justify-self-start"
                type="button"
              >
                {item.status === 'new' ? '읽음' : '보기'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
