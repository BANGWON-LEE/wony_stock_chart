export type KisQuoteClientConfig = {
  baseUrl: string
  appKey?: string
  appSecret?: string
  accessToken?: string
  intstockMultpriceTrId?: string
  marketValueTrId?: string
}

export type FetchDomesticStockQuotesInput = {
  symbols: string[]
  marketDivisionCode?: string
}

export type FetchDomesticStockMarketValueRankingInput = {
  targetClassCode?: string
  marketDivisionCode?: string
  screenDivisionCode?: string
  inputIsCode?: string
  divisionClassCode?: string
  priceFrom?: string
  priceTo?: string
  volumeCount?: string
  inputOption1?: string
  inputOption2?: string
  rankSortClassCode?: string
  belongingClassCode?: string
  targetExcludeClassCode?: string
}

export type KisDomesticStockQuotesResponse = {
  rt_cd?: string
  msg_cd?: string
  msg1?: string
  output?: unknown
  [key: string]: unknown
}

export type KisDomesticStockMarketValueRankingOutput = {
  data_rank?: string
  hts_kor_isnm?: string
  mksc_shrn_iscd?: string
  stck_prpr?: string
  prdy_vrss?: string
  prdy_vrss_sign?: string
  prdy_ctrt?: string
  acml_vol?: string
  per?: string
  pbr?: string
  pcr?: string
  psr?: string
  eps?: string
  eva?: string
  ebitda?: string
  pv_div_ebitda?: string
  ebitda_div_fnnc_expn?: string
  stac_month?: string
  stac_month_cls_code?: string
  iqry_csnu?: string
  [key: string]: unknown
}

export type KisDomesticStockMarketValueRankingResponse = Omit<
  KisDomesticStockQuotesResponse,
  'output'
> & {
  output?: KisDomesticStockMarketValueRankingOutput[]
}

const DOMESTIC_STOCK_API_PATH = '/uapi/domestic-stock/v1'

const KIS_DOMESTIC_STOCK_QUOTATION_ENDPOINTS = {
  intstockMultprice: 'quotations/intstock-multprice',
} as const

const KIS_DOMESTIC_STOCK_RANKING_ENDPOINTS = {
  marketValue: 'ranking/market-value',
} as const

type KisDomesticStockQuotationEndpoint =
  (typeof KIS_DOMESTIC_STOCK_QUOTATION_ENDPOINTS)[keyof typeof KIS_DOMESTIC_STOCK_QUOTATION_ENDPOINTS]

type KisDomesticStockRankingEndpoint =
  (typeof KIS_DOMESTIC_STOCK_RANKING_ENDPOINTS)[keyof typeof KIS_DOMESTIC_STOCK_RANKING_ENDPOINTS]

function buildDomesticStockQuotationsUrl(
  baseUrl: string,
  endpoint: KisDomesticStockQuotationEndpoint,
): URL {
  return new URL(`${DOMESTIC_STOCK_API_PATH}/${endpoint}`, baseUrl)
}

function buildDomesticStockRankingsUrl(
  baseUrl: string,
  endpoint: KisDomesticStockRankingEndpoint,
): URL {
  return new URL(`${DOMESTIC_STOCK_API_PATH}/${endpoint}`, baseUrl)
}

export class KisQuoteClient {
  constructor(private readonly config: KisQuoteClientConfig) {}

  async fetchDomesticStockQuotes(
    input: FetchDomesticStockQuotesInput,
  ): Promise<KisDomesticStockQuotesResponse> {
    this.assertConfigured(
      'KIS_INTSTOCK_MULTPRICE_TR_ID',
      this.config.intstockMultpriceTrId,
    )

    const url = buildDomesticStockQuotationsUrl(
      this.config.baseUrl,
      KIS_DOMESTIC_STOCK_QUOTATION_ENDPOINTS.intstockMultprice,
    )
    url.searchParams.set(
      'fid_cond_mrkt_div_code',
      input.marketDivisionCode ?? 'J',
    )
    url.searchParams.set('fid_input_iscd', input.symbols.join(','))

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${this.config.accessToken}`,
        appkey: this.config.appKey ?? '',
        appsecret: this.config.appSecret ?? '',
        tr_id: this.config.intstockMultpriceTrId ?? '',
        custtype: 'P',
      },
    })

    const payload = (await response.json()) as KisDomesticStockQuotesResponse

    if (!response.ok || payload.rt_cd === '1') {
      throw new KisApiError(response.status, payload)
    }

    return payload
  }

  async fetchDomesticStockMarketValueRanking(
    input: FetchDomesticStockMarketValueRankingInput = {},
  ): Promise<KisDomesticStockMarketValueRankingResponse> {
    this.assertConfigured('KIS_MARKET_VALUE_TR_ID', this.config.marketValueTrId)

    const url = buildDomesticStockRankingsUrl(
      this.config.baseUrl,
      KIS_DOMESTIC_STOCK_RANKING_ENDPOINTS.marketValue,
    )
    url.searchParams.set(
      'fid_cond_mrkt_div_code',
      input.marketDivisionCode ?? 'J',
    )
    url.searchParams.set(
      'fid_cond_scr_div_code',
      input.screenDivisionCode ?? '20179',
    )
    url.searchParams.set('fid_trgt_cls_code', input.targetClassCode ?? '0')
    url.searchParams.set('fid_input_iscd', input.inputIsCode ?? '0000')
    url.searchParams.set('fid_div_cls_code', input.divisionClassCode ?? '0')
    url.searchParams.set('fid_input_price_1', input.priceFrom ?? '')
    url.searchParams.set('fid_input_price_2', input.priceTo ?? '')
    url.searchParams.set('fid_vol_cnt', input.volumeCount ?? '')
    url.searchParams.set('fid_input_option_1', input.inputOption1 ?? '')
    url.searchParams.set('fid_input_option_2', input.inputOption2 ?? '3')
    url.searchParams.set(
      'fid_rank_sort_cls_code',
      input.rankSortClassCode ?? '23',
    )
    url.searchParams.set('fid_blng_cls_code', input.belongingClassCode ?? '0')
    url.searchParams.set(
      'fid_trgt_exls_cls_code',
      input.targetExcludeClassCode ?? '0',
    )

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        authorization: `Bearer ${this.config.accessToken}`,
        appkey: this.config.appKey ?? '',
        appsecret: this.config.appSecret ?? '',
        tr_id: this.config.marketValueTrId ?? '',
        custtype: 'P',
      },
    })

    const payload =
      (await response.json()) as KisDomesticStockMarketValueRankingResponse

    if (!response.ok || payload.rt_cd === '1') {
      throw new KisApiError(response.status, payload)
    }

    return payload
  }

  private assertConfigured(requiredTrIdName: string, requiredTrId?: string): void {
    const missing = [
      ['KIS_APP_KEY', this.config.appKey],
      ['KIS_APP_SECRET', this.config.appSecret],
      ['KIS_ACCESS_TOKEN', this.config.accessToken],
      [requiredTrIdName, requiredTrId],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name)

    if (missing.length > 0) {
      throw new KisConfigError(`Missing KIS config: ${missing.join(', ')}`)
    }
  }
}

export class KisConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KisConfigError'
  }
}

export class KisApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly payload: KisDomesticStockQuotesResponse,
  ) {
    super(payload.msg1 ?? 'KIS API request failed')
    this.name = 'KisApiError'
  }
}
