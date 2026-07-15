import type { FastifyPluginAsync } from 'fastify'
import {
  KisAccessTokenClient,
  KisAccessTokenConfigError,
  KisAccessTokenError,
  KisApiError,
  KisConfigError,
  KisQuoteClient,
  type KisDomesticStockMarketValueRankingOutput,
} from '../adapters/brokers/kis/index.js'
import { fail } from '../utils/http.js'

type PopularStock = {
  code: string
  name: string
  price: string
  change: string
  trend: number[]
}

type PopularStocksQuery = {
  market?: 'KR'
  limit?: number
}

function toNumber(value: unknown): number {
  if (typeof value !== 'string' && typeof value !== 'number') return 0

  const parsed = Number(String(value).replaceAll(',', ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatPrice(value: unknown): string {
  const price = toNumber(value)
  if (price === 0) return '0원'

  return `${price.toLocaleString('ko-KR')}원`
}

function formatChangeRate(value: unknown, sign: unknown): string {
  const rate = Math.abs(toNumber(value))
  const signText =
    sign === '1' || sign === '2' ? '+' : sign === '4' || sign === '5' ? '-' : ''

  return `${signText}${rate.toFixed(2)}%`
}

function toPopularStock(
  output: KisDomesticStockMarketValueRankingOutput,
): PopularStock {
  const currentPrice = toNumber(output.stck_prpr)

  return {
    code: output.mksc_shrn_iscd ?? '',
    name: output.hts_kor_isnm ?? output.mksc_shrn_iscd ?? '',
    price: formatPrice(output.stck_prpr),
    change: formatChangeRate(output.prdy_ctrt, output.prdy_vrss_sign),
    trend: Array.from({ length: 6 }, () => currentPrice),
  }
}

function getPreviousFiscalYear(): string {
  return String(new Date().getFullYear() - 1)
}

export const stockRoutes: FastifyPluginAsync = async app => {
  app.get(
    '/stocks/popular',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            market: {
              type: 'string',
              enum: ['KR'],
              default: 'KR',
              description:
                '현재 KIS domestic-stock API 기반으로 KR만 지원합니다.',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 50,
              default: 10,
            },
          },
        },
      },
    },
    async (request, reply) => {
      console.log('request.query', request.query)

      const query = request.query as PopularStocksQuery
      const limit = query.limit ?? 10
      const kisAccessTokenClient = new KisAccessTokenClient(app.config.kis)
      const kisQuoteClient = new KisQuoteClient(app.config.kis)

      try {
        const issued = await kisAccessTokenClient.issueAccessToken()
        app.config.kis.accessToken = issued.accessToken

        const response =
          await kisQuoteClient.fetchDomesticStockMarketValueRanking({
            marketDivisionCode: 'J',
            screenDivisionCode: '20179',
            targetClassCode: '0',
            inputIsCode: '0000',
            divisionClassCode: '0',
            priceFrom: '',
            priceTo: '',
            volumeCount: '',
            inputOption1: getPreviousFiscalYear(),
            inputOption2: '3',
            rankSortClassCode: '23',
            belongingClassCode: '0',
            targetExcludeClassCode: '0',
          })

        return [...(response.output ?? [])]
          .sort(
            (
              left: KisDomesticStockMarketValueRankingOutput,
              right: KisDomesticStockMarketValueRankingOutput,
            ) => toNumber(right.acml_vol) - toNumber(left.acml_vol),
          )
          .slice(0, limit)
          .map(toPopularStock)
      } catch (error) {
        if (error instanceof KisConfigError) {
          reply.status(500)
          return fail({
            code: 'INTERNAL_ERROR',
            message: error.message,
          })
        }

        if (error instanceof KisAccessTokenConfigError) {
          reply.status(500)
          return fail({
            code: 'INTERNAL_ERROR',
            message: error.message,
          })
        }

        if (error instanceof KisAccessTokenError) {
          reply.status(error.statusCode >= 500 ? 502 : 400)
          return fail({
            code: 'BROKER_API_ERROR',
            message: error.message,
            details: error.payload,
          })
        }

        if (error instanceof KisApiError) {
          reply.status(error.statusCode >= 500 ? 502 : 400)
          return fail({
            code: 'BROKER_API_ERROR',
            message: error.message,
            details: error.payload,
          })
        }

        throw error
      }
    },
  )
}
