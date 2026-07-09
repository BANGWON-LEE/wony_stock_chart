import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeSeriesScale,
  Tooltip,
  type ChartConfiguration,
  type ChartDataset,
  type ChartType as ChartJsType,
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import {
  CandlestickController,
  CandlestickElement,
} from 'chartjs-chart-financial'
import { useEffect, useRef } from 'react'
import type {
  ChartModel,
  ChartPrimitive,
  ChartType,
} from '../types/chart.types'

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeSeriesScale,
  PointElement,
  LineElement,
  BarElement,
  LineController,
  BarController,
  CandlestickController,
  CandlestickElement,
  Filler,
  Tooltip,
  Legend,
)

type RenderMode = ChartType | 'combo'
type ChartJsDataset = ChartDataset<
  'line' | 'bar',
  (number | [number, number] | null)[]
>
type CandlestickDataPoint = {
  x: number
  o: number
  h: number
  l: number
  c: number
}
type CandlestickDataset = ChartDataset<'candlestick', CandlestickDataPoint[]>

interface ChartRendererProps {
  model: ChartModel
  mode: RenderMode
  title: string
  maxTicksLimit: number
  stacked: boolean
  compact: boolean
  className?: string
  dataAttributes: Record<string, string | number | boolean>
}

const SERIES_COLORS = [
  '--chart-color-chart-series1',
  '--chart-color-chart-series2',
  '--chart-color-chart-series3',
  '--chart-color-chart-series4',
]
const CHART_RENDERER_CLASS_NAME = 'chart-renderer'

function cssVar(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()

  return value || fallback
}

function toLabel(value: ChartPrimitive) {
  return String(value ?? '')
}

function toNumber(value: ChartPrimitive) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function toTimeValue(value: ChartPrimitive) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Date.parse(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function hasTimeLabels(model: ChartModel) {
  return model.labels.length > 0 && model.labels.every(label => toTimeValue(label) !== null)
}

function getSeriesColor(index: number) {
  return cssVar(SERIES_COLORS[index % SERIES_COLORS.length], '#2563eb')
}

function createSeriesDatasets(
  model: ChartModel,
  fallbackType: Exclude<ChartType, 'candlestick'>,
  compact: boolean,
) {
  return model.datasets.map<ChartJsDataset>((dataset, index) => {
    const chartType =
      dataset.type === 'line' || dataset.type === 'bar'
        ? dataset.type
        : fallbackType
    const color = getSeriesColor(index)

    return {
      type: chartType,
      label: dataset.label,
      data: dataset.data.map(toNumber),
      borderColor: color,
      backgroundColor: chartType === 'bar' ? `${color}80` : `${color}24`,
      borderWidth: chartType === 'bar' ? 0 : compact ? 1.8 : 2,
      fill: chartType === 'line',
      tension: 0.32,
      pointBackgroundColor: color,
      pointRadius: chartType === 'line' && !compact ? 3 : 0,
      pointHoverRadius: chartType === 'line' && !compact ? 5 : 0,
    }
  })
}

function findDataset(model: ChartModel, label: string) {
  return model.datasets.find(dataset => dataset.label.toLowerCase() === label)
}

function valueAt(
  dataset: ChartModel['datasets'][number] | undefined,
  index: number,
) {
  return toNumber(dataset?.data[index] ?? null)
}

function createCandlestickDatasets(model: ChartModel) {
  const openDataset = findDataset(model, 'open')
  const highDataset = findDataset(model, 'high')
  const lowDataset = findDataset(model, 'low')
  const closeDataset = findDataset(model, 'close')
  const fallbackDataset = model.datasets[0]
  const risingColor = cssVar('--chart-color-success-default', '#16a34a')
  const fallingColor = cssVar('--chart-color-danger-default', '#dc2626')
  const unchangedColor = cssVar('--chart-color-text-tertiary', '#64748b')

  const candleData = model.labels.map<CandlestickDataPoint>((_, index) => {
    const close = valueAt(closeDataset ?? fallbackDataset, index) ?? 0
    const open =
      valueAt(openDataset, index) ??
      valueAt(fallbackDataset, index - 1) ??
      close
    const high = valueAt(highDataset, index) ?? Math.max(open, close)
    const low = valueAt(lowDataset, index) ?? Math.min(open, close)

    return {
      x: toTimeValue(model.labels[index]) ?? index,
      o: open,
      h: high,
      l: low,
      c: close,
    }
  })

  return [
    {
      type: 'candlestick',
      label: 'OHLC',
      data: candleData,
      borderColors: {
        up: risingColor,
        down: fallingColor,
        unchanged: unchangedColor,
      },
      backgroundColors: {
        up: `${risingColor}cc`,
        down: `${fallingColor}cc`,
        unchanged: `${unchangedColor}99`,
      },
    },
  ] satisfies CandlestickDataset[]
}

export function ChartRenderer({
  model,
  mode,
  title,
  maxTicksLimit,
  stacked,
  compact,
  className,
  dataAttributes,
}: ChartRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return undefined
    }

    const textColor = cssVar('--chart-color-text-secondary', '#475569')
    const gridColor = cssVar('--chart-color-border-default', '#e2e8f0')
    const tooltipBackground = cssVar('--chart-color-surface-inverse', '#0f172a')
    const tooltipText = cssVar('--chart-color-text-inverse', '#f8fafc')
    const borderColor = cssVar('--chart-color-border-strong', '#94a3b8')
    const isCandlestick = mode === 'candlestick'
    const useTimeScale = hasTimeLabels(model)
    // let chartType: ChartJsType

    const chartType = function () {
      switch (mode) {
        case 'candlestick':
          return 'candlestick'
          break
        case 'line':
          return 'line'
          break
        default:
          return 'bar'
      }
    }

    const datasets = isCandlestick
      ? createCandlestickDatasets(model)
      : createSeriesDatasets(model, mode === 'line' ? 'line' : 'bar', compact)

    console.log('ChartRenderer datasets:', datasets)

    const config: ChartConfiguration = {
      type: chartType() as ChartJsType,
      data: {
        labels: model.labels.map(toLabel),
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: {
            display: !compact,
            align: 'end',
            labels: {
              boxHeight: 8,
              boxWidth: 8,
              color: textColor,
              usePointStyle: true,
            },
          },
          title: {
            display: !compact,
            text: title,
            color: cssVar('--chart-color-text-primary', '#0f172a'),
            align: 'start',
            font: {
              size: 16,
              weight: 600,
            },
            padding: {
              bottom: 16,
            },
          },
          tooltip: {
            backgroundColor: tooltipBackground,
            bodyColor: tooltipText,
            borderColor,
            borderWidth: 1,
            callbacks: isCandlestick
              ? {
                  label(context) {
                    const candle = context.raw as CandlestickDataPoint

                    return `O: ${candle.o} H: ${candle.h} L: ${candle.l} C: ${candle.c}`
                  },
                  title(context) {
                    const dataIndex = context[0]?.dataIndex ?? 0

                    return toLabel(model.labels[dataIndex])
                  },
                }
              : undefined,
            displayColors: true,
            padding: 12,
            titleColor: tooltipText,
          },
        },
        scales: {
          x: {
            display: !compact,
            type: useTimeScale ? 'timeseries' : 'category',
            stacked,
            border: {
              display: false,
            },
            grid: {
              color: compact ? 'transparent' : gridColor,
            },
            ticks: {
              color: textColor,
              maxTicksLimit,
            },
          },
          y: {
            display: !compact,
            stacked,
            border: {
              display: false,
            },
            grid: {
              color: compact ? 'transparent' : gridColor,
            },
            ticks: {
              color: textColor,
              maxTicksLimit,
            },
          },
        },
      },
    }

    console.log('config:', config)
    console.log('canvas:', canvas)

    const chart = new ChartJS(canvas, config)

    return () => {
      chart.destroy()
    }
  }, [compact, maxTicksLimit, mode, model, stacked, title])

  const rendererClassName = className
    ? `${CHART_RENDERER_CLASS_NAME} ${className}`
    : CHART_RENDERER_CLASS_NAME

  return (
    <div className={rendererClassName} {...dataAttributes}>
      <canvas ref={canvasRef} aria-label={title} />
    </div>
  )
}
