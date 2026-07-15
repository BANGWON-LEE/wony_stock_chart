import { apiClient } from '../../../api/client'
import type { KisAccessTokenStatus, PopularStock } from '../types/stock.types'

type ApiSuccessResponse<T> = {
  success: true
  data: T
}

export async function issueKisAccessToken() {
  const { data } = await apiClient.post<
    ApiSuccessResponse<KisAccessTokenStatus>
  >('/brokers/kis/access-token', {})

  return data.data
}

export async function getPopularStocks() {
  const { data } = await apiClient.get<PopularStock[]>('/stocks/popular')

  return data
}
