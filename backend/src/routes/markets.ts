import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { KisApiError, KisConfigError, KisQuoteClient } from "../adapters/brokers/kis/index.js";
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
    "/markets/:market/symbols/:symbol/candles",
    {
      schema: {
        params: {
          type: "object",
          required: ["market", "symbol"],
          properties: {
            market: { type: "string", enum: ["KR", "US"] },
            symbol: { type: "string", minLength: 1 },
          },
        },
        querystring: {
          type: "object",
          required: ["interval"],
          additionalProperties: false,
          properties: {
            interval: { type: "string", enum: ["1d"] },
            from: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            to: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            limit: { type: "integer", minimum: 1, maximum: 1000, default: 300 },
          },
        },
      },
    },
    async (request) => {
      const { market, symbol } = request.params as { market: "KR" | "US"; symbol: string };

      return ok({
        market,
        symbol,
        interval: "1d",
        source: "CACHE",
        stale: false,
        candles: [],
      });
    },
  );
};
