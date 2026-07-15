import Fastify from "fastify";
import type { AppConfig } from "./config/env.js";
import { alertRoutes } from "./routes/alerts.js";
import { authRoutes } from "./routes/auth.js";
import { brokerRoutes } from "./routes/brokers.js";
import { healthRoutes } from "./routes/health.js";
import { marketRoutes } from "./routes/markets.js";
import { portfolioRoutes } from "./routes/portfolio.js";
import { stockRoutes } from "./routes/stocks.js";
import { websocketRoutes } from "./routes/ws.js";
import { commonPlugin } from "./plugins/common.js";

declare module "fastify" {
  interface FastifyInstance {
    config: AppConfig;
  }
}

export function buildApp(config: AppConfig) {
  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
    genReqId: (request) => {
      const requestId = request.headers["x-request-id"];
      return Array.isArray(requestId) ? requestId[0] : requestId ?? crypto.randomUUID();
    },
  });

  app.decorate("config", config);

  app.register(commonPlugin);
  app.register(healthRoutes);
  app.register(authRoutes);
  app.register(brokerRoutes);
  app.register(portfolioRoutes);
  app.register(alertRoutes);
  app.register(marketRoutes);
  app.register(stockRoutes);
  app.register(websocketRoutes);

  return app;
}
