import { apiClient } from '../../../api/client'

export type CandleRow = {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
  accumulatedTradeAmount?: number
}

export type StockCandleInterval = '1m' | '1d' | '1w' | '1mo' | '1y'

type ApiSuccessResponse<T> = {
  success: true
  data: T
}

type StockCandlesResponse = {
  market: 'KR'
  symbol: string
  interval: StockCandleInterval
  source: 'KIS'
  stale: boolean
  range: {
    from?: string
    to?: string
    date?: string
    hour?: string
    limit: number
  }
  candles: CandleRow[]
}

export async function getStockCandles(params: {
  symbol: string
  interval: StockCandleInterval
  date?: string
  hour?: string
  from?: string
  to?: string
  limit: number
}) {
  const { data } = await apiClient.get<ApiSuccessResponse<StockCandlesResponse>>(
    `/markets/KR/symbols/${encodeURIComponent(params.symbol)}/candles`,
    {
      params: {
        interval: params.interval,
        date: params.date,
        hour: params.hour,
        from: params.from,
        to: params.to,
        limit: params.limit,
      },
    },
  )

  return data.data
}
