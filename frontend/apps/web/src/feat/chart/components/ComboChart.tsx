import {
  countChartPoints,
  createChartModel,
  formatChartLabels,
} from '../data/chartDataAdapter'
import { createChartOptions } from '../options/chartOptions'
import type { BaseChartProps, ChartType } from '../types/chart.types'
import { ChartRenderer } from './ChartRenderer'

interface ComboChartProps extends BaseChartProps {
  type: ChartType[]
}

export function ComboChart({
  type,
  data,
  timePropertyName = 'time',
  options,
  className,
}: ComboChartProps) {
  const primaryType = type[0] ?? 'line'
  const chartModel = createChartModel({
    data,
    type: primaryType,
    timePropertyName,
    datasetTypes: type,
  })
  const chartOptions = createChartOptions({ type: 'combo', options })

  return (
    <ChartRenderer
      className={className}
      dataAttributes={{
        'data-chart-labels': formatChartLabels(chartModel.labels),
        'data-chart-points': countChartPoints(chartModel),
        'data-chart-title': chartOptions.title,
        'data-chart-types': type.join(','),
      }}
      compact={chartOptions.compact}
      maxTicksLimit={chartOptions.maxTicksLimit}
      mode="combo"
      model={chartModel}
      stacked={chartOptions.stacked}
      title={chartOptions.title}
    />
  )
}
