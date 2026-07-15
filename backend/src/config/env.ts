import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

export type AppConfig = {
  nodeEnv: string;
  host: string;
  port: number;
  logLevel: string;
  kis: {
    baseUrl: string;
    websocketUrl: string;
    appKey?: string;
    appSecret?: string;
    accessToken?: string;
    intstockMultpriceTrId?: string;
    marketValueTrId?: string;
  };
};

let envFilesLoaded = false;

function loadEnvFiles(): void {
  if (envFilesLoaded) return;

  for (const path of [".env", "../.env"]) {
    if (existsSync(path)) loadEnvFile(path);
  }

  envFilesLoaded = true;
}

function readEnv(name: string, ...fallbackNames: string[]): string | undefined {
  for (const key of [name, ...fallbackNames]) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  return undefined;
}

function readNumber(name: string, fallback: number): number {
  const raw = readEnv(name);
  if (!raw) return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

export function loadConfig(): AppConfig {
  loadEnvFiles();

  return {
    nodeEnv: readEnv("NODE_ENV") ?? "development",
    host: readEnv("HOST") ?? "0.0.0.0",
    port: readNumber("PORT", 4000),
    logLevel: readEnv("LOG_LEVEL") ?? "info",
    kis: {
      baseUrl:
        readEnv("KIS_BASE_URL") ??
        "https://openapi.koreainvestment.com:9443",
      websocketUrl:
        readEnv("KIS_WEBSOCKET_URL") ?? "ws://ops.koreainvestment.com:21000",
      appKey: readEnv("KIS_APP_KEY", "VITE_KIS_APP_KEY"),
      appSecret: readEnv("KIS_APP_SECRET", "VITE_KIS_APP_SECRET"),
      accessToken: readEnv("KIS_ACCESS_TOKEN"),
      intstockMultpriceTrId: readEnv("KIS_INTSTOCK_MULTPRICE_TR_ID"),
      marketValueTrId: readEnv("KIS_MARKET_VALUE_TR_ID") ?? "FHPST01790000",
    },
  };
}
