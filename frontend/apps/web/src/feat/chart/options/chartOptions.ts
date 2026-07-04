import type { ChartOptions, ChartType } from '../types/chart.types'

const DEFAULT_MAX_TICKS_LIMIT = 5

interface CreateChartOptionsParams {
  type: ChartType | 'combo'
  options?: ChartOptions
}

export function createChartOptions({
  type,
  options,
}: CreateChartOptionsParams): Required<ChartOptions> {
  return {
    title: options?.title ?? getDefaultChartTitle(type),
    maxTicksLimit: options?.maxTicksLimit ?? DEFAULT_MAX_TICKS_LIMIT,
    stacked: options?.stacked ?? false,
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
