import { useEffect, useState } from 'react'
// import { Chart } from '../../../../feat/chart'
import { getPopularStocks, useSelectedStockStore } from '../../../../feat/stock'
import type { PopularStock } from '../../../../feat/stock'

// const trendLabels = ['5일전', '4일전', '3일전', '2일전', '1일전', '오늘']

export function PopularStockList() {
  const [stocks, setStocks] = useState<PopularStock[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const initializeSelectedStockCode = useSelectedStockStore(
    state => state.initializeSelectedStockCode,
  )
  const setSelectedStockCode = useSelectedStockStore(
    state => state.setSelectedStockCode,
  )

  useEffect(() => {
    let isMounted = true

    async function getMarketRankingData() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const data = await getPopularStocks()

        if (isMounted && data.length > 0) {
          setStocks(data)
          console.log('PopularStockList data', data[0].code)
          initializeSelectedStockCode(data[0].code)
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : '인기 종목을 불러오지 못했습니다.',
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    getMarketRankingData()

    return () => {
      isMounted = false
    }
  }, [initializeSelectedStockCode])

  return (
    <ol className="m-0 flex list-none flex-col p-0 overflow-y-scroll max-h-[400px] p-5">
      {errorMessage ? (
        <li className="border-t border-[#f2f4f6] py-4 text-sm font-bold text-[#8b95a1] first:border-t-0 first:pt-0">
          {errorMessage}
        </li>
      ) : null}
      {stocks.map(stock => {
        // const trendData = trendLabels.map((time, index) => ({
        //   time,
        //   price: stock.trend[index],
        // }))

        return (
          <button
            className="w-full text-left"
            key={stock.name}
            type="button"
            onClick={() => setSelectedStockCode(stock.code)}
          >
            <li className="flex justify-between gap-0.5 border-t border-[#f2f4f6] py-4 first:border-t-0 first:pt-0">
              {/* <div className="flex  min-w-0 flex-1 jus items-center gap-3"> */}
              <div className="flex flex-col gap-1 min-w-[130px] max-w-[130px]">
                <strong className="text-[1em] text-[#191f28] wrap-break-word">
                  {stock.name}
                </strong>
                <span className="text-[13px] font-bold text-[#8b95a1]">
                  {stock.price}
                </span>
              </div>
              {/* <div className="max-w-[120px]">
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
            </div> */}
              <div className="max-w-[70px]">
                {/* </div> */}
                <em
                  className={`grid items-center not-italic font-extrabold ${stock.change.startsWith('+') ? 'text-[#f04452]' : 'text-[#3182f6]'}`}
                >
                  {stock.change}
                </em>
              </div>
            </li>
          </button>
        )
      })}
      {isLoading ? (
        <li className="border-t border-[#f2f4f6] py-4 text-sm font-bold text-[#8b95a1]">
          갱신 중
        </li>
      ) : null}
    </ol>
  )
}
