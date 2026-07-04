import { BarChart } from './BarChart'
import { CandlestickChart } from './CandlestickChart'
import { ComboChart } from './ComboChart'
import { LineChart } from './LineChart'
import type { ChartProps } from '../types/chart.types'

export function Chart(props: ChartProps) {
  const { type } = props

  if (Array.isArray(type)) {
    return <ComboChart {...props} type={type} />
  }

  switch (type) {
    case 'line':
      return <LineChart {...props} />
    case 'bar':
      return <BarChart {...props} />
    case 'candlestick':
      return <CandlestickChart {...props} />
  }
}
