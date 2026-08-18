// import { indexItems } from '../data'

export function IndexSummarySection() {
  return (
    <section
      className="grid grid-cols-[minmax(280px,1fr)_1.6fr] items-end gap-8 bg-white px-12 py-11 max-[960px]:grid-cols-1 max-[960px]:px-5 max-[960px]:py-8"
      aria-labelledby="index-title"
    >
      <div className="flex max-w-[680px] flex-col gap-2">
        <p className="text-sm font-extrabold text-[#3182f6]">
          시장 한눈에 보기
        </p>
        <h1
          className="m-0 text-[42px] leading-[1.18] tracking-[0] max-[960px]:text-[34px]"
          id="index-title"
        >
          오늘의 주요 지수
        </h1>
      </div>
      {/* <div className="grid grid-cols-3 gap-3 max-[960px]:grid-cols-1">
        {indexItems.map(item => (
          <article className="flex flex-col gap-2 rounded-lg border border-[#e5e8eb] bg-white p-5" key={item.name}>
            <span className="text-[13px] font-bold text-[#8b95a1]">{item.name}</span>
            <strong className="text-2xl leading-[1.15]">{item.value}</strong>
            <em className={`not-italic font-extrabold ${item.change.startsWith('+') ? 'text-[#f04452]' : 'text-[#3182f6]'}`}>
              {item.change}
            </em>
          </article>
        ))}
      </div> */}
    </section>
  )
}
