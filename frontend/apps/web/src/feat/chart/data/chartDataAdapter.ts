import type {
  ChartDataMap,
  ChartInputData,
  ChartModel,
  ChartPrimitive,
  ChartRow,
  ChartType,
} from '../types/chart.types'

interface CreateChartModelParams {
  data?: ChartInputData
  type: ChartType
  timePropertyName: string
  datasetTypes?: ChartType[]
}

export function formatChartRows(rows: ChartRow[]): ChartDataMap {
  return rows.reduce<ChartDataMap>((acc, row) => {
    Object.entries(row).forEach(([key, value]) => {
      acc[key] = acc[key] ?? []
      acc[key].push(value)
    })

    return acc
  }, {})
}

export function normalizeChartData(data?: ChartInputData): ChartDataMap {
  if (!data) {
    return {}
  }

  if (Array.isArray(data)) {
    return formatChartRows(data)
  }

  return data
}

export function createChartModel({
  data,
  type,
  timePropertyName,
  datasetTypes,
}: CreateChartModelParams): ChartModel {
  const dataMap = normalizeChartData(data)
  const labels = dataMap[timePropertyName] ?? []
  const seriesKeys = Object.keys(dataMap).filter(key => key !== timePropertyName)

  return {
    labels,
    datasets: seriesKeys.map((seriesKey, index) => ({
      type: datasetTypes?.[index] ?? type,
      label: seriesKey,
      data: dataMap[seriesKey] ?? [],
    })),
  }
}

export function countChartPoints(model: ChartModel): number {
  return model.datasets.reduce((total, dataset) => total + dataset.data.length, 0)
}

export function formatChartLabels(labels: ChartPrimitive[]): string {
  return labels.map(label => String(label ?? '')).join(',')
}
