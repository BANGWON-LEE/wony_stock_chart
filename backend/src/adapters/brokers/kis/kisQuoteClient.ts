export type KisQuoteClientConfig = {
  baseUrl: string
  appKey?: string
  appSecret?: string
  accessToken?: string
  intstockMultpriceTrId?: string
  marketValueTrId?: string
  timeDailyChartPriceTrId?: string
  timeMinuteChartPriceTrId?: string
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

export type FetchDomesticStockTimeDailyChartPriceInput = {
  symbol: string
  marketDivisionCode?: string
  inputDateFrom?: string
  inputDateTo?: string
  periodDivisionCode?: 'D' | 'W' | 'M' | 'Y'
  orgAdjustedPrice?: string
  etcClassCode?: string
}

export type FetchDomesticStockTimeMinuteChartPriceInput = {
  symbol: string
  marketDivisionCode?: string
  inputHour?: string
  inputDate?: string
  includePastData?: string
  includeFakeTick?: string
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

export type KisDomesticStockTimeDailyChartPriceOutput1 = {
  prdy_vrss?: string
  prdy_vrss_sign?: string
  prdy_ctrt?: string
  stck_prdy_clpr?: string
  acml_vol?: string
  acml_tr_pbmn?: string
  hts_kor_isnm?: string
  stck_prpr?: string
  [key: string]: unknown
}

export type KisDomesticStockTimeDailyChartPriceOutput2 = {
  stck_bsop_date?: string
  stck_prpr?: string
  stck_clpr?: string
  stck_oprc?: string
  stck_hgpr?: string
  stck_lwpr?: string
  acml_vol?: string
  acml_tr_pbmn?: string
  [key: string]: unknown
}

export type KisDomesticStockTimeDailyChartPriceResponse = Omit<
  KisDomesticStockQuotesResponse,
  'output'
> & {
  output1?: KisDomesticStockTimeDailyChartPriceOutput1
  output2?: KisDomesticStockTimeDailyChartPriceOutput2[]
}

export type KisDomesticStockTimeMinuteChartPriceOutput2 = {
  stck_bsop_date?: string
  stck_cntg_hour?: string
  stck_prpr?: string
  stck_oprc?: string
  stck_hgpr?: string
  stck_lwpr?: string
  cntg_vol?: string
  acml_vol?: string
  acml_tr_pbmn?: string
  [key: string]: unknown
}

export type KisDomesticStockTimeMinuteChartPriceResponse = Omit<
  KisDomesticStockQuotesResponse,
  'output'
> & {
  output1?: KisDomesticStockTimeDailyChartPriceOutput1
  output2?: KisDomesticStockTimeMinuteChartPriceOutput2[]
}

const DOMESTIC_STOCK_API_PATH = '/uapi/domestic-stock/v1'

const KIS_DOMESTIC_STOCK_QUOTATION_ENDPOINTS = {
  intstockMultprice: 'quotations/intstock-multprice',
  timeDailyChartPrice: 'quotations/inquire-daily-itemchartprice',
  timeMinuteChartPrice: 'quotations/inquire-time-dailychartprice',
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

  async fetchDomesticStockTimeDailyChartPrice(
    input: FetchDomesticStockTimeDailyChartPriceInput,
  ): Promise<KisDomesticStockTimeDailyChartPriceResponse> {
    this.assertConfigured(
      'KIS_TIME_DAILY_CHART_PRICE_TR_ID',
      this.config.timeDailyChartPriceTrId,
    )

    const url = buildDomesticStockQuotationsUrl(
      this.config.baseUrl,
      KIS_DOMESTIC_STOCK_QUOTATION_ENDPOINTS.timeDailyChartPrice,
    )
    url.searchParams.set('fid_etc_cls_code', input.etcClassCode ?? '')
    url.searchParams.set(
      'fid_cond_mrkt_div_code',
      input.marketDivisionCode ?? 'J',
    )
    url.searchParams.set('fid_input_iscd', input.symbol)
    url.searchParams.set('fid_input_date_1', input.inputDateFrom ?? '')
    url.searchParams.set('fid_input_date_2', input.inputDateTo ?? '')
    url.searchParams.set('fid_period_div_code', input.periodDivisionCode ?? 'D')
    url.searchParams.set('fid_org_adj_prc', input.orgAdjustedPrice ?? '0')

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        authorization: `Bearer ${this.config.accessToken}`,
        appkey: this.config.appKey ?? '',
        appsecret: this.config.appSecret ?? '',
        tr_id: this.config.timeDailyChartPriceTrId ?? '',
        custtype: 'P',
      },
    })

    const payload =
      (await response.json()) as KisDomesticStockTimeDailyChartPriceResponse

    if (!response.ok || payload.rt_cd === '1') {
      throw new KisApiError(response.status, payload)
    }

    return payload
  }

  async fetchDomesticStockTimeMinuteChartPrice(
    input: FetchDomesticStockTimeMinuteChartPriceInput,
  ): Promise<KisDomesticStockTimeMinuteChartPriceResponse> {
    this.assertConfigured(
      'KIS_TIME_MINUTE_CHART_PRICE_TR_ID',
      this.config.timeMinuteChartPriceTrId,
    )

    const url = buildDomesticStockQuotationsUrl(
      this.config.baseUrl,
      KIS_DOMESTIC_STOCK_QUOTATION_ENDPOINTS.timeMinuteChartPrice,
    )
    url.searchParams.set(
      'fid_cond_mrkt_div_code',
      input.marketDivisionCode ?? 'J',
    )
    url.searchParams.set('fid_input_iscd', input.symbol)
    url.searchParams.set('fid_input_hour_1', input.inputHour ?? '153000')
    url.searchParams.set('fid_input_date_1', input.inputDate ?? '')
    url.searchParams.set('fid_pw_data_incu_yn', input.includePastData ?? 'N')
    url.searchParams.set('fid_fake_tick_incu_yn', input.includeFakeTick ?? '')

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        authorization: `Bearer ${this.config.accessToken}`,
        appkey: this.config.appKey ?? '',
        appsecret: this.config.appSecret ?? '',
        tr_id: this.config.timeMinuteChartPriceTrId ?? '',
        custtype: 'P',
      },
    })

    const payload =
      (await response.json()) as KisDomesticStockTimeMinuteChartPriceResponse

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
