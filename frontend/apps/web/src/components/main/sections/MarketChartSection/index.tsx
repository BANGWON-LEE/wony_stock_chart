import { lazy } from 'react'

// import { CandlestickChartPanel } from './CandlestickChartPanel'
const CandlestickChartPanel = lazy(() => import('./CandlestickChartPanel'))

import { PopularStockList } from './PopularStockList'
import { useSelectedStockStore } from '../../../../feat/stock'

console.error('[chart-debug] MarketChartSection module loaded')

export function MarketChartSection() {
  const selectedStockCode = useSelectedStockStore(
    state => state.selectedStockCode,
  )
  console.error('[chart-debug] MarketChartSection render', {
    selectedStockCode,
  })

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

      <div className="grid grid-cols-[minmax(0,1fr)_420px] items-stretch gap-4 max-[1260px]:grid-cols-1">
        {selectedStockCode ? (
          <CandlestickChartPanel selectedStockCode={selectedStockCode} />
        ) : (
          <div className="flex h-[420px] items-center justify-center rounded-lg border border-[#e5e8eb] bg-white p-5 text-[#8b95a1]">
            loading
          </div>
        )}
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
          <PopularStockList />
        </aside>
      </div>
    </section>
  )
}
