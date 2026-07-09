import {
  countChartPoints,
  createChartModel,
  formatChartLabels,
} from '../data/chartDataAdapter'
import { createChartOptions } from '../options/chartOptions'
import type { BaseChartProps } from '../types/chart.types'
import { ChartRenderer } from './ChartRenderer'

export function BarChart({
  data,
  timePropertyName = 'time',
  options,
  className,
}: BaseChartProps) {
  const chartModel = createChartModel({
    data,
    type: 'bar',
    timePropertyName,
  })
  const chartOptions = createChartOptions({ type: 'bar', options })

  return (
    <ChartRenderer
      className={className}
      dataAttributes={{
        'data-chart-labels': formatChartLabels(chartModel.labels),
        'data-chart-points': countChartPoints(chartModel),
        'data-chart-stacked': chartOptions.stacked,
        'data-chart-title': chartOptions.title,
        'data-chart-type': 'bar',
      }}
      compact={chartOptions.compact}
      maxTicksLimit={chartOptions.maxTicksLimit}
      mode="bar"
      model={chartModel}
      stacked={chartOptions.stacked}
      title={chartOptions.title}
    />
  )
}
