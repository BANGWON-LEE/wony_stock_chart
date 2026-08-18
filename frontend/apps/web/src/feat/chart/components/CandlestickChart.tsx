import {
  countChartPoints,
  createChartModel,
  formatChartLabels,
} from '../data/chartDataAdapter'
import { createChartOptions } from '../options/chartOptions'
import type { BaseChartProps } from '../types/chart.types'
import { ChartRenderer } from './ChartRenderer'

export function CandlestickChart({
  data,
  timePropertyName = 'time',
  options,
  className,
  containerRef,
}: BaseChartProps) {
  console.log('CandlestickChart data:', data)

  const chartModel = createChartModel({
    data,
    type: 'candlestick',
    timePropertyName,
  })
  const chartOptions = createChartOptions({ type: 'candlestick', options })

  return (
    <ChartRenderer
      className={className}
      containerRef={containerRef}
      dataAttributes={{
        'data-chart-labels': formatChartLabels(chartModel.labels),
        'data-chart-points': countChartPoints(chartModel),
        'data-chart-title': chartOptions.title,
        'data-chart-type': 'candlestick',
      }}
      compact={chartOptions.compact}
      maxTicksLimit={chartOptions.maxTicksLimit}
      mode="candlestick"
      model={chartModel}
      stacked={chartOptions.stacked}
      title={chartOptions.title}
      xTickFormat={chartOptions.xTickFormat}
      xTimeUnit={chartOptions.xTimeUnit}
      yMin={chartOptions.yMin}
    />
  )
}
