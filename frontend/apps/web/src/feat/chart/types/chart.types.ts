import type { Ref } from 'react'

export type ChartType = 'line' | 'bar' | 'candlestick'

export type ChartTypeConfig = ChartType | ChartType[]

export type ChartPrimitive = string | number | null

export type ChartRow = Record<string, ChartPrimitive>

export type ChartDataMap = Record<string, ChartPrimitive[]>

export type ChartInputData = ChartRow[] | ChartDataMap

export interface ChartDataset {
  type: ChartType
  label: string
  data: ChartPrimitive[]
}

export interface ChartModel {
  labels: ChartPrimitive[]
  datasets: ChartDataset[]
}

export interface ChartOptions {
  title?: string
  maxTicksLimit?: number
  stacked?: boolean
  compact?: boolean
  yMin?: number
  xTimeUnit?: 'month' | 'year'
  xTickFormat?: 'monthYear'
}

export interface BaseChartProps {
  data?: ChartInputData
  timePropertyName?: string
  options?: ChartOptions
  className?: string
  containerRef?: Ref<HTMLDivElement>
}

export interface ChartProps extends BaseChartProps {
  type: ChartTypeConfig
}
