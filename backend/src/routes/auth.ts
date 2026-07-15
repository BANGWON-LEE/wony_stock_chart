import type { FastifyPluginAsync } from "fastify";
import { ok, sendNoContent } from "../utils/http.js";

const credentialsBodySchema = {
  type: "object",
  required: ["email", "password"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 10 },
  },
} as const;

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/auth/signup", { schema: { body: credentialsBodySchema } }, async (_request, reply) => {
    reply.status(201);
    return ok({
      user: {
        id: "u_stub",
        email: "user@example.com",
        createdAt: new Date().toISOString(),
      },
    });
  });

  app.post("/auth/login", { schema: { body: credentialsBodySchema } }, async () =>
    ok({
      accessToken: "stub-access-token",
      expiresIn: 3600,
      user: {
        id: "u_stub",
        email: "user@example.com",
      },
    }),
  );

  app.post(
    "/auth/refresh",
    {
      schema: {
        body: {
          type: "object",
          required: ["refreshToken"],
          additionalProperties: false,
          properties: {
            refreshToken: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async () =>
      ok({
        accessToken: "stub-access-token",
        expiresIn: 3600,
        refreshToken: "stub-refresh-token",
      }),
  );

  app.post(
    "/auth/logout",
    {
      schema: {
        body: {
          type: "object",
          required: ["refreshToken"],
          additionalProperties: false,
          properties: {
            refreshToken: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (_request, reply) => sendNoContent(reply),
  );
};
