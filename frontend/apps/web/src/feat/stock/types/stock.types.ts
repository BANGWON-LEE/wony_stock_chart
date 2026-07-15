export interface PopularStock {
  code: string
  name: string
  price: string
  change: string
  trend: number[]
}

export interface KisAccessTokenStatus {
  tokenType: string
  expiresIn: number
  expiresAt: string
}
