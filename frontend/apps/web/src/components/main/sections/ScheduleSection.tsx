import { scheduleItems } from '../data'

export function ScheduleSection() {
  return (
    <section className="px-12 py-11 max-[960px]:px-5 max-[960px]:py-8" aria-labelledby="schedule-title">
      <div className="mb-[22px] flex max-w-[680px] flex-col gap-2">
        <p className="text-sm font-extrabold text-[#3182f6]">주요 일정</p>
        <h2 className="m-0 text-[28px] leading-[1.25] tracking-[0] max-[960px]:text-2xl" id="schedule-title">
          이번 주 시장 캘린더
        </h2>
      </div>
      <ul className="m-0 list-none overflow-hidden rounded-lg border border-[#e5e8eb] bg-white p-0">
        {scheduleItems.map(item => (
          <li className="grid grid-cols-[84px_1fr] gap-4 border-t border-[#f2f4f6] px-[22px] py-[18px] first:border-t-0" key={item.title}>
            <time className="font-extrabold text-[#3182f6]">{item.date}</time>
            <span className="font-bold text-[#191f28]">{item.title}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
