import { cva } from 'class-variance-authority'

export const sampleChart = cva([
  'mx-auto my-chart-12 box-border w-[min(calc(100%_-_var(--chart-spacing-8)),960px)]',
  'bg-chart-card-elevated text-chart-card-elevated-foreground border-chart-card-elevated shadow-chart-elevated',
  'rounded-chart-card border-[length:var(--chart-card-border-width)] p-chart-card text-left',
  'max-[720px]:my-chart-6 max-[720px]:w-[min(calc(100%_-_var(--chart-spacing-4)),960px)] max-[720px]:p-chart-4',
])

export const sampleChartHeader = cva([
  'mb-chart-6 flex justify-between gap-chart-4',
  'max-[720px]:flex-col',
])

export const sampleChartEyebrow = cva([
  'mb-chart-2 text-chart-sm font-semibold uppercase tracking-[0.08em] text-chart-text-brand',
])

export const sampleChartTitle = cva([
  'm-0 font-chart-heading text-[56px] font-[var(--chart-typography-heading-font-weight)] tracking-[-1.68px] text-chart-text-primary',
  'max-[1024px]:text-[36px]',
])

export const sampleChartBadge = cva([
  'self-start whitespace-nowrap rounded-chart-full border-[length:var(--chart-button-border-width)]',
  'border-chart-button-secondary-border bg-chart-button-secondary px-chart-3 py-chart-1',
  'text-chart-sm font-medium text-chart-button-secondary-foreground',
])

export const sampleChartCanvas = cva(['h-[380px]', 'max-[720px]:h-[320px]'])
