import websocket from "@fastify/websocket";
import type { FastifyPluginAsync } from "fastify";
import type WebSocket from "ws";
import { isKisDomesticStockSymbol, KisRealtimeClient } from "../adapters/brokers/kis/index.js";

type ClientWsMessage = {
  type?: string;
  symbol?: string;
  symbols?: string[];
};

function sendJson(socket: WebSocket, payload: unknown): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function parseSymbolsFromQuery(symbolsQuery: unknown): string[] {
  if (typeof symbolsQuery !== "string") return [];

  return symbolsQuery
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);
}

function parseSymbolsFromMessage(message: ClientWsMessage): string[] {
  if (Array.isArray(message.symbols)) {
    return message.symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean);
  }

  if (typeof message.symbol === "string") {
    return [message.symbol.trim().toUpperCase()].filter(Boolean);
  }

  return [];
}

export const websocketRoutes: FastifyPluginAsync = async (app) => {
  await app.register(websocket);

  app.get("/ws", { websocket: true }, (socket) => {
    socket.send(
      JSON.stringify({
        event: "error",
        data: {
          code: "WS_UNAUTHORIZED",
          message: "인증이 필요합니다.",
        },
      }),
    );
  });

  app.get("/ws/kis/domestic-stock/trades", { websocket: true }, (socket, request) => {
    const query = request.query as { symbols?: string };
    const initialSymbols = parseSymbolsFromQuery(query.symbols);
    const invalidSymbols = initialSymbols.filter((symbol) => !isKisDomesticStockSymbol(symbol));

    if (invalidSymbols.length > 0) {
      sendJson(socket, {
        event: "error",
        data: {
          code: "INVALID_INPUT",
          message: "symbols query contains invalid domestic stock symbols.",
          details: { symbols: invalidSymbols },
        },
      });
      socket.close();
      return;
    }

    const kisRealtimeClient = new KisRealtimeClient(app.config.kis);
    let upstreamClose: (() => void) | undefined;

    socket.on("message", (data) => {
      let message: ClientWsMessage;

      try {
        message = JSON.parse(data.toString("utf8")) as ClientWsMessage;
      } catch {
        sendJson(socket, {
          event: "error",
          data: {
            code: "INVALID_INPUT",
            message: "WebSocket message must be valid JSON.",
          },
        });
        return;
      }

      const symbols = parseSymbolsFromMessage(message);
      const invalidMessageSymbols = symbols.filter((symbol) => !isKisDomesticStockSymbol(symbol));

      if (invalidMessageSymbols.length > 0) {
        sendJson(socket, {
          event: "error",
          data: {
            code: "INVALID_INPUT",
            message: "message contains invalid domestic stock symbols.",
            details: { symbols: invalidMessageSymbols },
          },
        });
        return;
      }

      if (message.type === "subscribe") {
        void connectionPromise.then((connection) => connection.subscribe(symbols));
        return;
      }

      if (message.type === "unsubscribe") {
        void connectionPromise.then((connection) => connection.unsubscribe(symbols));
        return;
      }

      sendJson(socket, {
        event: "error",
        data: {
          code: "INVALID_INPUT",
          message: "Unsupported WebSocket message type.",
        },
      });
    });

    const connectionPromise = kisRealtimeClient.connectDomesticStockTrades({
      symbols: initialSymbols,
      onTrade: (trade) => {
        sendJson(socket, {
          event: "kis.trade",
          data: trade,
        });
      },
      onStatus: (status) => {
        sendJson(socket, {
          event: "kis.status",
          data: status,
        });
      },
      onError: (error) => {
        sendJson(socket, {
          event: "error",
          data: {
            code: "KIS_REALTIME_ERROR",
            message: error.message,
          },
        });
      },
    });

    void connectionPromise
      .then((connection) => {
        upstreamClose = connection.close;
      })
      .catch((error: Error) => {
        sendJson(socket, {
          event: "error",
          data: {
            code: "KIS_REALTIME_ERROR",
            message: error.message,
          },
        });
        socket.close();
      });

    socket.on("close", () => {
      upstreamClose?.();
    });
  });
};
