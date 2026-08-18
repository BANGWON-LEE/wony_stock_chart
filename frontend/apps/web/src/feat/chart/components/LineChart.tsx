import {
  countChartPoints,
  createChartModel,
  formatChartLabels,
} from '../data/chartDataAdapter'
import { createChartOptions } from '../options/chartOptions'
import type { BaseChartProps } from '../types/chart.types'
import { ChartRenderer } from './ChartRenderer'

export function LineChart({
  data,
  timePropertyName = 'time',
  options,
  className,
  containerRef,
}: BaseChartProps) {
  const chartModel = createChartModel({
    data,
    type: 'line',
    timePropertyName,
  })
  const chartOptions = createChartOptions({ type: 'line', options })

  return (
    <ChartRenderer
      className={className}
      containerRef={containerRef}
      dataAttributes={{
        'data-chart-labels': formatChartLabels(chartModel.labels),
        'data-chart-points': countChartPoints(chartModel),
        'data-chart-title': chartOptions.title,
        'data-chart-type': 'line',
      }}
      maxTicksLimit={chartOptions.maxTicksLimit}
      mode="line"
      model={chartModel}
      compact={chartOptions.compact}
      stacked={chartOptions.stacked}
      title={chartOptions.title}
    />
  )
}
