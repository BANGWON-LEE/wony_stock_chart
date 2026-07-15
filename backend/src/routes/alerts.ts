import type { FastifyPluginAsync } from "fastify";
import { ok, sendNoContent } from "../utils/http.js";

const alertRuleBodySchema = {
  type: "object",
  required: ["scope", "direction", "targetValue", "channels", "enabled"],
  additionalProperties: false,
  properties: {
    scope: { type: "string", enum: ["portfolio", "symbol"] },
    symbol: { type: "string", minLength: 1 },
    direction: { type: "string", enum: ["above", "below"] },
    targetValue: { type: "string", pattern: "^(?!0+(?:\\.0+)?$)\\d+(?:\\.\\d+)?$" },
    channels: {
      type: "array",
      minItems: 1,
      maxItems: 1,
      items: { type: "string", enum: ["IN_APP"] },
    },
    enabled: { type: "boolean" },
  },
} as const;

export const alertRoutes: FastifyPluginAsync = async (app) => {
  app.post("/alerts/rules", { schema: { body: alertRuleBodySchema } }, async (_request, reply) => {
    reply.status(201);
    return ok({
      rule: {
        id: "ar_stub",
        scope: "symbol",
        symbol: "005930",
        direction: "above",
        targetValue: "80000",
        channels: ["IN_APP"],
        state: "armed",
        enabled: true,
      },
    });
  });

  app.get("/alerts/rules", async () => ok({ rules: [] }));

  app.patch(
    "/alerts/rules/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1 },
          },
        },
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            targetValue: { type: "string", pattern: "^(?!0+(?:\\.0+)?$)\\d+(?:\\.\\d+)?$" },
            enabled: { type: "boolean" },
          },
        },
      },
    },
    async () =>
      ok({
        rule: {
          id: "ar_stub",
          targetValue: "81000",
          enabled: true,
          updatedAt: new Date().toISOString(),
        },
      }),
  );

  app.delete(
    "/alerts/rules/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (_request, reply) => sendNoContent(reply),
  );

  app.get(
    "/alerts/history",
    {
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            cursor: { type: "string", minLength: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
        },
      },
    },
    async () => ok({ events: [], nextCursor: null }),
  );
};
