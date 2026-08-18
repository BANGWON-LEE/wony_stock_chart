import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

export type AppConfig = {
  nodeEnv: string;
  host: string;
  port: number;
  logLevel: string;
  auth: {
    jwtAccessSecret: string;
    jwtRefreshSecret: string;
    googleClientId?: string;
    googleClientSecret?: string;
    googleRedirectUri?: string;
    frontendUrl?: string;
  };
  kis: {
    baseUrl: string;
    websocketUrl: string;
    appKey?: string;
    appSecret?: string;
    accessToken?: string;
    intstockMultpriceTrId?: string;
    marketValueTrId?: string;
    timeDailyChartPriceTrId?: string;
    timeMinuteChartPriceTrId?: string;
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

function readRequiredSecret(name: string, fallback: string): string {
  const value = readEnv(name);
  if (value) return value;

  if (readEnv("NODE_ENV") === "production") {
    throw new Error(`${name} is required in production`);
  }

  return fallback;
}

export function loadConfig(): AppConfig {
  loadEnvFiles();

  return {
    nodeEnv: readEnv("NODE_ENV") ?? "development",
    host: readEnv("HOST") ?? "0.0.0.0",
    port: readNumber("PORT", 4000),
    logLevel: readEnv("LOG_LEVEL") ?? "info",
    auth: {
      jwtAccessSecret: readRequiredSecret("JWT_ACCESS_SECRET", "dev-access-secret"),
      jwtRefreshSecret: readRequiredSecret("JWT_REFRESH_SECRET", "dev-refresh-secret"),
      googleClientId: readEnv("GOOGLE_CLIENT_ID"),
      googleClientSecret: readEnv("GOOGLE_CLIENT_SECRET"),
      googleRedirectUri: readEnv("GOOGLE_REDIRECT_URI"),
      frontendUrl: readEnv("FRONTEND_URL"),
    },
    kis: {
      baseUrl:
        readEnv("KIS_BASE_URL") ??
        "https://openapi.koreainvestment.com:9443",
      websocketUrl:
        readEnv("KIS_WEBSOCKET_URL") ??
        "ws://ops.koreainvestment.com:21000/tryitout/H0STCNT0",
      appKey: readEnv("KIS_APP_KEY", "VITE_KIS_APP_KEY"),
      appSecret: readEnv("KIS_APP_SECRET", "VITE_KIS_APP_SECRET"),
      accessToken: readEnv("KIS_ACCESS_TOKEN"),
      intstockMultpriceTrId: readEnv("KIS_INTSTOCK_MULTPRICE_TR_ID"),
      marketValueTrId: readEnv("KIS_MARKET_VALUE_TR_ID") ?? "FHPST01790000",
      timeDailyChartPriceTrId:
        readEnv("KIS_DAILY_ITEM_CHART_PRICE_TR_ID", "KIS_TIME_DAILY_CHART_PRICE_TR_ID", "KIS_TIME_ITEM_CHART_PRICE_TR_ID") ??
        "FHKST03010100",
      timeMinuteChartPriceTrId:
        readEnv("KIS_TIME_MINUTE_CHART_PRICE_TR_ID") ??
        "FHKST03010230",
    },
  };
}
