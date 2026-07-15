import { Chart } from '../../../../feat/chart'
import { candlestickData } from '../../data'

export function CandlestickChartPanel() {
  return (
    <div className="min-w-0 rounded-lg border border-[#e5e8eb] bg-white p-5">
      <Chart
        className="h-[420px] max-[960px]:h-[340px]"
        data={candlestickData}
        options={{ maxTicksLimit: 6, title: '관심 종목 캔들 차트' }}
        timePropertyName="time"
        type="candlestick"
      />
    </div>
  )
}
