import {
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js'
import { useEffect, useRef } from 'react'
import {
  sampleChart,
  sampleChartBadge,
  sampleChartCanvas,
  sampleChartEyebrow,
  sampleChartHeader,
  sampleChartTitle,
} from './SampleChart.styles'

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Filler,
  Tooltip,
  Legend,
)

const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
const revenue = [42, 48, 44, 56, 68, 74, 82]
const users = [28, 34, 37, 46, 51, 59, 66]

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function SampleChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return undefined
    }

    const textColor = cssVar('--chart-color-text-secondary')
    const gridColor = cssVar('--chart-color-border-default')
    const primaryColor = cssVar('--chart-color-chart-series1')
    const secondaryColor = cssVar('--chart-color-chart-series2')
    const surfaceColor = cssVar('--chart-color-surface-default')

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Revenue',
            data: revenue,
            borderColor: primaryColor,
            backgroundColor: `${primaryColor}26`,
            pointBackgroundColor: primaryColor,
            pointBorderColor: surfaceColor,
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3,
            tension: 0.36,
            fill: true,
          },
          {
            label: 'Active users',
            data: users,
            borderColor: secondaryColor,
            backgroundColor: `${secondaryColor}1f`,
            pointBackgroundColor: secondaryColor,
            pointBorderColor: surfaceColor,
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3,
            tension: 0.36,
            fill: true,
          },
        ],
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
            align: 'end',
            labels: {
              boxHeight: 8,
              boxWidth: 8,
              color: textColor,
              usePointStyle: true,
            },
          },
          tooltip: {
            backgroundColor: cssVar('--chart-color-surface-inverse'),
            bodyColor: cssVar('--chart-color-text-inverse'),
            borderColor: cssVar('--chart-color-border-strong'),
            borderWidth: 1,
            displayColors: true,
            padding: 12,
            titleColor: cssVar('--chart-color-text-inverse'),
          },
        },
        scales: {
          x: {
            border: {
              display: false,
            },
            grid: {
              color: gridColor,
            },
            ticks: {
              color: textColor,
            },
          },
          y: {
            border: {
              display: false,
            },
            grid: {
              color: gridColor,
            },
            ticks: {
              color: textColor,
            },
          },
        },
      },
    }

    const chart = new Chart(canvas, config)

    return () => {
      chart.destroy()
    }
  }, [])

  return (
    <section className={sampleChart()} aria-labelledby="sample-chart-title">
      <div className={sampleChartHeader()}>
        <div>
          <p className={sampleChartEyebrow()}>Chart.js sample</p>
          <h1 className={sampleChartTitle()} id="sample-chart-title">
            Revenue overview
          </h1>
        </div>
        <span className={sampleChartBadge()}>Token themed</span>
      </div>

      <div className={sampleChartCanvas()}>
        <canvas ref={canvasRef} aria-label="Revenue and active users line chart" />
      </div>
    </section>
  )
}
