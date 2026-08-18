import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import {
  KisAccessTokenClient,
  KisAccessTokenConfigError,
  KisAccessTokenError,
  KisApiError,
  KisConfigError,
  KisQuoteClient,
  isKisDomesticStockSymbol,
  type KisDomesticStockTimeDailyChartPriceOutput1,
  type KisDomesticStockTimeDailyChartPriceOutput2,
  type KisDomesticStockTimeMinuteChartPriceOutput2,
} from "../adapters/brokers/kis/index.js";
import { fail, ok } from "../utils/http.js";

type MarketValueRankingQuery = {
  targetClassCode?: string;
  marketDivisionCode?: string;
  screenDivisionCode?: string;
  inputIsCode?: string;
  divisionClassCode?: string;
  priceFrom?: string;
  priceTo?: string;
  volumeCount?: string;
  inputOption1?: string;
  inputOption2?: string;
  rankSortClassCode?: string;
  belongingClassCode?: string;
  targetExcludeClassCode?: string;
};

type MarketValueRankingRequest = FastifyRequest<{
  Querystring: MarketValueRankingQuery;
}>;

type CandleQuery = {
  interval: "1m" | "1d" | "1w" | "1mo" | "1y";
  date?: string;
  hour?: string;
  from?: string;
  to?: string;
  limit?: number;
  marketDivisionCode?: string;
};

type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  accumulatedTradeAmount: number;
};

const marketValueRankingQuerystringSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    marketDivisionCode: {
      type: "string",
      default: "J",
      description: "KIS fid_cond_mrkt_div_code. Example: J",
    },
    screenDivisionCode: {
      type: "string",
      default: "20179",
      description: "KIS fid_cond_scr_div_code.",
    },
    divisionClassCode: {
      type: "string",
      default: "0",
      description: "KIS fid_div_cls_code.",
    },
    inputIsCode: {
      type: "string",
      default: "0000",
      description: "KIS fid_input_iscd.",
    },
    targetClassCode: {
      type: "string",
      default: "0",
      description: "KIS fid_trgt_cls_code.",
    },
    targetExcludeClassCode: {
      type: "string",
      default: "0",
      description: "KIS fid_trgt_exls_cls_code.",
    },
    priceFrom: {
      type: "string",
      default: "",
      description: "KIS fid_input_price_1.",
    },
    priceTo: {
      type: "string",
      default: "",
      description: "KIS fid_input_price_2.",
    },
    volumeCount: {
      type: "string",
      default: "",
      description: "KIS fid_vol_cnt.",
    },
    inputOption1: {
      type: "string",
      default: "",
      description: "KIS fid_input_option_1. Example: 2025",
    },
    inputOption2: {
      type: "string",
      default: "3",
      description: "KIS fid_input_option_2. 0: 1Q, 1: half, 2: 3Q, 3: settlement.",
    },
    rankSortClassCode: {
      type: "string",
      default: "23",
      description: "KIS fid_rank_sort_cls_code. Example: 23 PER, 24 PBR, 25 PCR.",
    },
    belongingClassCode: {
      type: "string",
      default: "0",
      description: "KIS fid_blng_cls_code.",
    },
  },
} as const;

function toNumber(value: unknown): number {
  if (typeof value !== "string" && typeof value !== "number") return 0;

  const parsed = Number(String(value).replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toKoreaDailyTimestamp(businessDate: string): string {
  if (!/^\d{8}$/.test(businessDate)) {
    return "";
  }

  const year = businessDate.slice(0, 4);
  const month = businessDate.slice(4, 6);
  const day = businessDate.slice(6, 8);

  return `${year}-${month}-${day}T00:00:00+09:00`;
}

function toKoreaMinuteTimestamp(businessDate: string, tradeTime: string): string {
  if (!/^\d{8}$/.test(businessDate) || !/^\d{6}$/.test(tradeTime)) {
    return "";
  }

  const year = businessDate.slice(0, 4);
  const month = businessDate.slice(4, 6);
  const day = businessDate.slice(6, 8);
  const hour = tradeTime.slice(0, 2);
  const minute = tradeTime.slice(2, 4);
  const second = tradeTime.slice(4, 6);

  return `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
}

function toKoreaDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function toKisDateParam(date: string): string {
  return date.replaceAll("-", "");
}

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function isTimeParam(value: string): boolean {
  return /^([01]\d|2[0-3])[0-5]\d[0-5]\d$/.test(value);
}

function addUtcYears(date: string, years: number): string {
  const time = Date.parse(`${date}T00:00:00Z`);
  const next = new Date(time);
  next.setUTCFullYear(next.getUTCFullYear() + years);

  return next.toISOString().slice(0, 10);
}

function getPeriodDivisionCode(interval: Exclude<CandleQuery["interval"], "1m">): "D" | "W" | "M" | "Y" {
  switch (interval) {
    case "1w":
      return "W";
    case "1mo":
      return "M";
    case "1y":
      return "Y";
    case "1d":
      return "D";
  }
}

function getDefaultCandleRange(interval: CandleQuery["interval"], referenceDate = new Date()) {
  const today = toKoreaDateString(referenceDate);

  if (interval === "1mo" || interval === "1y") {
    const currentYear = Number(today.slice(0, 4));
    return {
      from: "2010-01-01",
      to: `${currentYear - 1}-12-31`,
    };
  }

  return {
    from: addUtcYears(today, -1),
    to: today,
  };
}

function addUtcDays(date: string, days: number): string {
  const time = Date.parse(`${date}T00:00:00Z`);
  const next = new Date(time + days * 86_400_000);

  return next.toISOString().slice(0, 10);
}

function getDefaultMinuteChartDate(referenceDate = new Date()): string {
  let date = addUtcDays(toKoreaDateString(referenceDate), -1);

  while (isWeekendDate(date)) {
    date = addUtcDays(date, -1);
  }

  return date;
}

function isWeekendDate(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();

  return day === 0 || day === 6;
}

function toCandle(output: KisDomesticStockTimeDailyChartPriceOutput2): Candle {
  return {
    time: toKoreaDailyTimestamp(output.stck_bsop_date ?? ""),
    open: toNumber(output.stck_oprc),
    high: toNumber(output.stck_hgpr),
    low: toNumber(output.stck_lwpr),
    close: toNumber(output.stck_clpr ?? output.stck_prpr),
    volume: toNumber(output.acml_vol),
    accumulatedTradeAmount: toNumber(output.acml_tr_pbmn),
  };
}

function toMinuteCandle(output: KisDomesticStockTimeMinuteChartPriceOutput2): Candle {
  return {
    time: toKoreaMinuteTimestamp(output.stck_bsop_date ?? "", output.stck_cntg_hour ?? ""),
    open: toNumber(output.stck_oprc ?? output.stck_prpr),
    high: toNumber(output.stck_hgpr ?? output.stck_prpr),
    low: toNumber(output.stck_lwpr ?? output.stck_prpr),
    close: toNumber(output.stck_prpr),
    volume: toNumber(output.cntg_vol ?? output.acml_vol),
    accumulatedTradeAmount: toNumber(output.acml_tr_pbmn),
  };
}

function toSummary(output: KisDomesticStockTimeDailyChartPriceOutput1 | undefined) {
  return {
    name: output?.hts_kor_isnm ?? "",
    currentPrice: toNumber(output?.stck_prpr),
    previousClosePrice: toNumber(output?.stck_prdy_clpr),
    previousChange: toNumber(output?.prdy_vrss),
    previousChangeSign: output?.prdy_vrss_sign ?? "",
    previousChangeRate: toNumber(output?.prdy_ctrt),
    accumulatedVolume: toNumber(output?.acml_vol),
    accumulatedTradeAmount: toNumber(output?.acml_tr_pbmn),
  };
}

function handleKisRouteError(error: unknown, reply: FastifyReply) {
  if (error instanceof KisConfigError || error instanceof KisAccessTokenConfigError) {
    reply.status(500);
    return fail({
      code: "INTERNAL_ERROR",
      message: error.message,
    });
  }

  if (error instanceof KisAccessTokenError || error instanceof KisApiError) {
    reply.status(error.statusCode >= 500 ? 502 : 400);
    return fail({
      code: "BROKER_API_ERROR",
      message: error.message,
      details: error.payload,
    });
  }

  throw error;
}

export const marketRoutes: FastifyPluginAsync = async (app) => {
  const fetchMarketValueRanking = async (
    request: MarketValueRankingRequest,
    reply: FastifyReply,
  ) => {
    const kisQuoteClient = new KisQuoteClient(app.config.kis);

    try {
      const response = await kisQuoteClient.fetchDomesticStockMarketValueRanking(request.query);

      return ok({
        market: "KR",
        provider: "KIS",
        ranking: "market-value",
        raw: response,
      });
    } catch (error) {
      if (error instanceof KisConfigError) {
        reply.status(500);
        return fail({
          code: "INTERNAL_ERROR",
          message: error.message,
        });
      }

      if (error instanceof KisApiError) {
        reply.status(error.statusCode >= 500 ? 502 : 400);
        return fail({
          code: "BROKER_API_ERROR",
          message: error.message,
          details: error.payload,
        });
      }

      throw error;
    }
  };

  app.get(
    "/markets/KR/rankings/market-value",
    {
      schema: {
        querystring: marketValueRankingQuerystringSchema,
      },
    },
    fetchMarketValueRanking,
  );

  app.get(
    "/uapi/domestic-stock/v1/ranking/market-value",
    {
      schema: {
        querystring: marketValueRankingQuerystringSchema,
      },
    },
    fetchMarketValueRanking,
  );

  app.get(
    "/markets/KR/quotes",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["symbols"],
          additionalProperties: false,
          properties: {
            symbols: {
              type: "string",
              minLength: 1,
              description: "Comma-separated domestic stock codes. Example: 005930,000660",
            },
            marketDivisionCode: {
              type: "string",
              default: "J",
            },
          },
        },
      },
    },
    async (request, reply) => {
      const query = request.query as { symbols: string; marketDivisionCode?: string };
      const symbols = query.symbols
        .split(",")
        .map((symbol) => symbol.trim())
        .filter(Boolean);

      if (symbols.length === 0) {
        reply.status(400);
        return fail({
          code: "INVALID_INPUT",
          message: "symbols query is required.",
        });
      }

      const kisQuoteClient = new KisQuoteClient(app.config.kis);

      try {
        const response = await kisQuoteClient.fetchDomesticStockQuotes({
          symbols,
          marketDivisionCode: query.marketDivisionCode,
        });

        return ok({
          market: "KR",
          symbols,
          provider: "KIS",
          raw: response,
        });
      } catch (error) {
        if (error instanceof KisConfigError) {
          reply.status(500);
          return fail({
            code: "INTERNAL_ERROR",
            message: error.message,
          });
        }

        if (error instanceof KisApiError) {
          reply.status(error.statusCode >= 500 ? 502 : 400);
          return fail({
            code: "BROKER_API_ERROR",
            message: error.message,
            details: error.payload,
          });
        }

        throw error;
      }
    },
  );

  app.get(
    "/markets/KR/symbols/:symbol/candles",
    {
      schema: {
        params: {
          type: "object",
          required: ["symbol"],
          properties: {
            symbol: { type: "string", minLength: 1 },
          },
        },
        querystring: {
          type: "object",
          required: ["interval"],
          additionalProperties: false,
          properties: {
            interval: { type: "string", enum: ["1m", "1d", "1w", "1mo", "1y"] },
            date: {
              type: "string",
              pattern: "^\\d{4}-\\d{2}-\\d{2}$",
              description: "1분봉 조회 날짜. Example: 2026-08-16",
            },
            hour: {
              type: "string",
              pattern: "^([01]\\d|2[0-3])[0-5]\\d[0-5]\\d$",
              description: "1분봉 조회 기준 시간. Example: 153000",
            },
            from: {
              type: "string",
              pattern: "^\\d{4}-\\d{2}-\\d{2}$",
              description: "조회 시작일. Example: 2026-01-01",
            },
            to: {
              type: "string",
              pattern: "^\\d{4}-\\d{2}-\\d{2}$",
              description: "조회 종료일. Example: 2026-06-19",
            },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 1000,
              default: 300,
              description: "반환할 최대 캔들 개수.",
            },
            marketDivisionCode: {
              type: "string",
              default: "J",
              description: "KIS fid_cond_mrkt_div_code. Example: J",
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { symbol } = request.params as { symbol: string };
      const query = request.query as CandleQuery;
      const normalizedSymbol = symbol.trim().toUpperCase();
      const limit = query.limit ?? 300;

      if (!isKisDomesticStockSymbol(normalizedSymbol)) {
        reply.status(400);
        return fail({
          code: "INVALID_INPUT",
          message: "symbol must be a domestic stock tr_key value.",
          details: { symbol },
        });
      }

      const kisAccessTokenClient = new KisAccessTokenClient(app.config.kis);
      const kisQuoteClient = new KisQuoteClient(app.config.kis);

      if (query.interval === "1m") {
        const today = toKoreaDateString(new Date());
        const date = query.date ?? getDefaultMinuteChartDate();
        const hour = query.hour ?? "153000";

        if (!isDateOnly(date) || date >= today || !isTimeParam(hour)) {
          reply.status(400);
          return fail({
            code: "INVALID_INPUT",
            message: "date must be before today and hour must be HHmmss for 1m candles.",
            details: { date, hour, today },
          });
        }

        try {
          const issued = await kisAccessTokenClient.issueAccessToken();
          app.config.kis.accessToken = issued.accessToken;

          const response = await kisQuoteClient.fetchDomesticStockTimeMinuteChartPrice({
            symbol: normalizedSymbol,
            marketDivisionCode: query.marketDivisionCode,
            inputDate: toKisDateParam(date),
            inputHour: hour,
            includePastData: "N",
            includeFakeTick: "",
          });
          const candles = (response.output2 ?? [])
            .map(toMinuteCandle)
            .filter((candle) => candle.time)
            .sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
          const limitedCandles = candles.slice(-limit);

          return ok({
            market: "KR",
            symbol: normalizedSymbol,
            interval: query.interval,
            source: "KIS",
            stale: false,
            summary: toSummary(response.output1),
            range: {
              date,
              hour,
              limit,
            },
            candles: limitedCandles,
            raw: {
              output1: response.output1,
              output2: response.output2 ?? [],
            },
          });
        } catch (error) {
          return handleKisRouteError(error, reply);
        }
      }

      const defaultRange = getDefaultCandleRange(query.interval);
      const to = query.to ?? defaultRange.to;
      const from = query.from ?? defaultRange.from;

      if (!isDateOnly(from) || !isDateOnly(to) || from > to) {
        reply.status(400);
        return fail({
          code: "INVALID_INPUT",
          message: "from and to must be YYYY-MM-DD dates, and from must be before or equal to to.",
          details: { from, to },
        });
      }

      try {
        const issued = await kisAccessTokenClient.issueAccessToken();
        app.config.kis.accessToken = issued.accessToken;

        const response = await kisQuoteClient.fetchDomesticStockTimeDailyChartPrice({
          symbol: normalizedSymbol,
          marketDivisionCode: query.marketDivisionCode,
          inputDateFrom: toKisDateParam(from),
          inputDateTo: toKisDateParam(to),
          periodDivisionCode: getPeriodDivisionCode(query.interval),
          orgAdjustedPrice: "0",
        });
        const candles = (response.output2 ?? [])
          .map(toCandle)
          .filter((candle) => candle.time)
          .sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
        const limitedCandles = candles.slice(-limit);

        return ok({
          market: "KR",
          symbol: normalizedSymbol,
          interval: query.interval,
          source: "KIS",
          stale: false,
          summary: toSummary(response.output1),
          range: {
            from,
            to,
            limit,
          },
          candles: limitedCandles,
          raw: {
            output1: response.output1,
            output2: response.output2 ?? [],
          },
        });
      } catch (error) {
        return handleKisRouteError(error, reply);
      }
    },
  );
};
