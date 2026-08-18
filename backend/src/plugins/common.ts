import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";
import type { FastifyError, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { fail } from "../utils/http.js";

const commonPluginImpl: FastifyPluginAsync = async (app) => {
  await app.register(helmet);
  await app.register(jwt, {
    secret: app.config.auth.jwtAccessSecret,
  });
  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Accept",
      "Authorization",
      "Content-Type",
      "Origin",
      "X-Requested-With",
      "X-Request-Id",
    ],
    exposedHeaders: ["X-Request-Id"],
    strictPreflight: false,
  });
  await app.register(sensible);

  app.addHook("onRequest", async (request, reply) => {
    const requestId = request.headers["x-request-id"] ?? request.id;
    reply.header("X-Request-Id", requestId);
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send(
      fail({
        code: "NOT_FOUND",
        message: `${request.method} ${request.url} not found`,
      }),
    );
  });

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error.validation) {
      reply.status(400).send(
        fail({
          code: "INVALID_INPUT",
          message: "요청 필드가 올바르지 않습니다.",
          details: error.validation,
        }),
      );
      return;
    }

    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    reply.status(statusCode).send(
      fail({
        code: statusCode >= 500 ? "INTERNAL_ERROR" : "INVALID_INPUT",
        message: statusCode >= 500 ? "서버 내부 오류가 발생했습니다." : error.message,
      }),
    );
  });
};

export const commonPlugin = fp(commonPluginImpl, {
  name: "common-plugin",
});
