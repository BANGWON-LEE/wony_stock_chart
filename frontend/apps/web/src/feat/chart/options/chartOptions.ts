import type { ChartOptions, ChartType } from '../types/chart.types'

const DEFAULT_MAX_TICKS_LIMIT = 5

interface CreateChartOptionsParams {
  type: ChartType | 'combo'
  options?: ChartOptions
}

type ResolvedChartOptions = Required<
  Omit<ChartOptions, 'xTickFormat' | 'xTimeUnit' | 'yMin'>
> &
  Pick<ChartOptions, 'xTickFormat' | 'xTimeUnit' | 'yMin'>

export function createChartOptions({
  type,
  options,
}: CreateChartOptionsParams): ResolvedChartOptions {
  return {
    title: options?.title ?? getDefaultChartTitle(type),
    maxTicksLimit: options?.maxTicksLimit ?? DEFAULT_MAX_TICKS_LIMIT,
    stacked: options?.stacked ?? false,
    compact: options?.compact ?? false,
    xTickFormat: options?.xTickFormat,
    xTimeUnit: options?.xTimeUnit,
    yMin: options?.yMin,
  }
}

function getDefaultChartTitle(type: ChartType | 'combo') {
  switch (type) {
    case 'line':
      return 'Line Chart'
    case 'bar':
      return 'Bar Chart'
    case 'candlestick':
      return 'Candlestick Chart'
    case 'combo':
      return 'Combo Chart'
  }
}
