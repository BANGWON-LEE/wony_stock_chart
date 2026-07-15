import type { FastifyPluginAsync } from "fastify";
import { ok } from "../utils/http.js";

export const portfolioRoutes: FastifyPluginAsync = async (app) => {
  app.get("/portfolio/summary", async () =>
    ok({
      baseCurrency: "KRW",
      totalValue: "0",
      totalPnl: "0",
      totalReturn: "0",
      updatedAt: new Date().toISOString(),
    }),
  );

  app.get(
    "/portfolio/positions",
    {
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            market: { type: "string", enum: ["KR", "US"] },
          },
        },
      },
    },
    async () => ok({ positions: [] }),
  );
};
