import { Chart } from '../../../feat/chart'
import { candlestickData, filterItems, risingStocks } from '../data'

const trendLabels = ['5일전', '4일전', '3일전', '2일전', '1일전', '오늘']

export function MarketChartSection() {
  return (
    <section
      className="border-t border-[#e5e8eb] px-12 py-11 max-[960px]:px-5 max-[960px]:py-8"
      aria-labelledby="chart-title"
    >
      <div className="mb-[22px] flex max-w-[680px] flex-col gap-2">
        <p className="text-sm font-extrabold text-[#3182f6]">실시간 차트</p>
        <h2
          className="m-0 text-[28px] leading-[1.25] tracking-[0] max-[960px]:text-2xl"
          id="chart-title"
        >
          지금 움직이는 종목
        </h2>
      </div>
      <div className="mb-[18px] flex flex-wrap gap-2" aria-label="차트 필터">
        {filterItems.map((item, index) => (
          <button
            className={`h-[34px] cursor-pointer rounded-full border-0 px-3.5 font-[inherit] text-sm font-bold ${
              index === 0
                ? 'bg-[#191f28] text-white'
                : 'bg-[#e5e8eb] text-[#4e5968]'
            }`}
            key={item}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_320px] items-stretch gap-4 max-[960px]:grid-cols-1">
        <div className="min-w-0 rounded-lg border border-[#e5e8eb] bg-white p-5">
          <Chart
            className="h-[420px] max-[960px]:h-[340px]"
            data={candlestickData}
            options={{ maxTicksLimit: 6, title: '관심 종목 캔들 차트' }}
            timePropertyName="time"
            type="candlestick"
          />
        </div>
        <aside
          className="rounded-lg border border-[#e5e8eb] bg-white p-5"
          aria-label="실시간 인기 종목"
        >
          <div className="mb-[18px] flex items-baseline justify-between gap-3">
            <h3 className="m-0 text-xl text-[#191f28]">인기 종목</h3>
            <span className="text-[13px] font-bold text-[#8b95a1]">
              거래대금 기준
            </span>
          </div>
          <ol className="m-0 flex list-none flex-col p-0">
            {risingStocks.map(stock => {
              const trendData = trendLabels.map((time, index) => ({
                time,
                price: stock.trend[index],
              }))

              return (
                <li
                  className="flex justify-between gap-4 border-t border-[#f2f4f6] py-4 first:border-t-0 first:pt-0"
                  key={stock.name}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex  flex-col gap-1">
                      <strong className="text-base text-[#191f28]">
                        {stock.name}
                      </strong>
                      <span className="text-[13px] font-bold text-[#8b95a1]">
                        {stock.price}
                      </span>
                    </div>
                    <Chart
                      className="h-16 min-w-[88px] flex-1"
                      data={trendData}
                      options={{
                        compact: true,
                        maxTicksLimit: 2,
                        title: `${stock.name} 최근 흐름`,
                      }}
                      type="line"
                    />
                  </div>
                  <em
                    className={`grid items-center not-italic font-extrabold ${stock.change.startsWith('+') ? 'text-[#f04452]' : 'text-[#3182f6]'}`}
                  >
                    {stock.change}
                  </em>
                </li>
              )
            })}
          </ol>
        </aside>
      </div>
    </section>
  )
}
