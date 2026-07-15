import WebSocket from "ws";

export type KisRealtimeClientConfig = {
  baseUrl: string;
  websocketUrl: string;
  appKey?: string;
  appSecret?: string;
};

export type DomesticStockTrade = {
  symbol: string;
  tradeTime: string;
  currentPrice: number;
  previousChangeSign: string;
  previousChange: number;
  previousChangeRate: number;
  weightedAveragePrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  askPrice: number;
  bidPrice: number;
  tradeVolume: number;
  accumulatedVolume: number;
  accumulatedTradeAmount: number;
  raw: Record<string, string>;
};

export type KisRealtimeStatus = {
  type: "open" | "subscribed" | "unsubscribed" | "upstream-message" | "closed";
  symbol?: string;
  payload?: unknown;
};

export type KisRealtimeConnection = {
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  close: () => void;
};

export type ConnectDomesticStockTradesInput = {
  symbols: string[];
  onTrade: (trade: DomesticStockTrade) => void;
  onStatus: (status: KisRealtimeStatus) => void;
  onError: (error: Error) => void;
};

type KisApprovalResponse = {
  approval_key?: string;
  [key: string]: unknown;
};

const DOMESTIC_STOCK_TRADE_TR_ID = "H0STCNT0";
const KIS_APPROVAL_PATH = "/oauth2/Approval";

const DOMESTIC_STOCK_TRADE_FIELDS = [
  "MKSC_SHRN_ISCD",
  "STCK_CNTG_HOUR",
  "STCK_PRPR",
  "PRDY_VRSS_SIGN",
  "PRDY_VRSS",
  "PRDY_CTRT",
  "WGHN_AVRG_STCK_PRC",
  "STCK_OPRC",
  "STCK_HGPR",
  "STCK_LWPR",
  "ASKP1",
  "BIDP1",
  "CNTG_VOL",
  "ACML_VOL",
  "ACML_TR_PBMN",
  "SELN_CNTG_CSNU",
  "SHNU_CNTG_CSNU",
  "NTBY_CNTG_CSNU",
  "CTTR",
  "SELN_CNTG_SMTN",
  "SHNU_CNTG_SMTN",
  "CCLD_DVSN",
  "SHNU_RATE",
  "PRDY_VOL_VRSS_ACML_VOL_RATE",
  "OPRC_HOUR",
  "OPRC_VRSS_PRPR_SIGN",
  "OPRC_VRSS_PRPR",
  "HGPR_HOUR",
  "HGPR_VRSS_PRPR_SIGN",
  "HGPR_VRSS_PRPR",
  "LWPR_HOUR",
  "LWPR_VRSS_PRPR_SIGN",
  "LWPR_VRSS_PRPR",
  "BSOP_DATE",
  "NEW_MKOP_CLS_CODE",
  "TRHT_YN",
  "ASKP_RSQN1",
  "BIDP_RSQN1",
  "TOTAL_ASKP_RSQN",
  "TOTAL_BIDP_RSQN",
  "VOL_TNRT",
  "PRDY_SMNS_HOUR_ACML_VOL",
  "PRDY_SMNS_HOUR_ACML_VOL_RATE",
  "HOUR_CLS_CODE",
  "MRKT_TRTM_CLS_CODE",
  "VI_STND_PRC",
] as const;

function toNumber(value: string | undefined): number {
  if (!value) return 0;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

export function isKisDomesticStockSymbol(symbol: string): boolean {
  return /^\d{6}$/.test(symbol) || /^Q\d{6}$/.test(symbol);
}

function parseTradeRecord(values: string[]): DomesticStockTrade {
  const raw = DOMESTIC_STOCK_TRADE_FIELDS.reduce<Record<string, string>>((acc, field, index) => {
    acc[field] = values[index] ?? "";
    return acc;
  }, {});

  return {
    symbol: raw.MKSC_SHRN_ISCD,
    tradeTime: raw.STCK_CNTG_HOUR,
    currentPrice: toNumber(raw.STCK_PRPR),
    previousChangeSign: raw.PRDY_VRSS_SIGN,
    previousChange: toNumber(raw.PRDY_VRSS),
    previousChangeRate: toNumber(raw.PRDY_CTRT),
    weightedAveragePrice: toNumber(raw.WGHN_AVRG_STCK_PRC),
    openPrice: toNumber(raw.STCK_OPRC),
    highPrice: toNumber(raw.STCK_HGPR),
    lowPrice: toNumber(raw.STCK_LWPR),
    askPrice: toNumber(raw.ASKP1),
    bidPrice: toNumber(raw.BIDP1),
    tradeVolume: toNumber(raw.CNTG_VOL),
    accumulatedVolume: toNumber(raw.ACML_VOL),
    accumulatedTradeAmount: toNumber(raw.ACML_TR_PBMN),
    raw,
  };
}

function parseTradeMessage(message: string): DomesticStockTrade[] {
  const [dataType, trId, countRaw, dataRaw] = message.split("|");
  if (dataType !== "0" || trId !== DOMESTIC_STOCK_TRADE_TR_ID || !dataRaw) return [];

  const count = toNumber(countRaw) || 1;
  const values = dataRaw.split("^");
  const fieldCount = DOMESTIC_STOCK_TRADE_FIELDS.length;
  const records: DomesticStockTrade[] = [];

  for (let index = 0; index < count; index += 1) {
    const offset = index * fieldCount;
    const recordValues = values.slice(offset, offset + fieldCount);
    if (recordValues.length === fieldCount) {
      records.push(parseTradeRecord(recordValues));
    }
  }

  return records;
}

function buildSubscribeMessage(approvalKey: string, symbol: string, trType: "1" | "2") {
  return JSON.stringify({
    header: {
      approval_key: approvalKey,
      custtype: "P",
      tr_type: trType,
      "content-type": "utf-8",
    },
    body: {
      input: {
        tr_id: DOMESTIC_STOCK_TRADE_TR_ID,
        tr_key: symbol,
      },
    },
  });
}

export class KisRealtimeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KisRealtimeConfigError";
  }
}

export class KisRealtimeClient {
  constructor(private readonly config: KisRealtimeClientConfig) {}

  async connectDomesticStockTrades(
    input: ConnectDomesticStockTradesInput,
  ): Promise<KisRealtimeConnection> {
    const approvalKey = await this.fetchApprovalKey();
    const socket = new WebSocket(this.config.websocketUrl);
    const subscribed = new Set<string>();

    const sendSubscription = (symbols: string[], trType: "1" | "2") => {
      if (socket.readyState !== WebSocket.OPEN) return;

      for (const symbolInput of symbols) {
        const symbol = normalizeSymbol(symbolInput);
        if (!isKisDomesticStockSymbol(symbol)) {
          input.onError(new Error(`Invalid domestic stock symbol: ${symbolInput}`));
          continue;
        }

        socket.send(buildSubscribeMessage(approvalKey, symbol, trType));

        if (trType === "1") {
          subscribed.add(symbol);
          input.onStatus({ type: "subscribed", symbol });
        } else {
          subscribed.delete(symbol);
          input.onStatus({ type: "unsubscribed", symbol });
        }
      }
    };

    socket.on("open", () => {
      input.onStatus({ type: "open" });
      sendSubscription(input.symbols, "1");
    });

    socket.on("message", (data) => {
      const message = data.toString("utf8");

      if (message.startsWith("{")) {
        try {
          input.onStatus({ type: "upstream-message", payload: JSON.parse(message) });
        } catch {
          input.onStatus({ type: "upstream-message", payload: message });
        }
        return;
      }

      for (const trade of parseTradeMessage(message)) {
        input.onTrade(trade);
      }
    });

    socket.on("error", (error) => {
      input.onError(error);
    });

    socket.on("close", () => {
      input.onStatus({ type: "closed" });
    });

    return {
      subscribe: (symbols) => sendSubscription(symbols, "1"),
      unsubscribe: (symbols) => sendSubscription(symbols, "2"),
      close: () => {
        if (socket.readyState === WebSocket.OPEN) {
          sendSubscription([...subscribed], "2");
        }

        socket.close();
      },
    };
  }

  private async fetchApprovalKey(): Promise<string> {
    this.assertConfigured();

    const response = await fetch(new URL(KIS_APPROVAL_PATH, this.config.baseUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        appkey: this.config.appKey,
        secretkey: this.config.appSecret,
      }),
    });

    const payload = (await response.json()) as KisApprovalResponse;

    if (!response.ok || !payload.approval_key) {
      throw new Error("KIS realtime approval key request failed.");
    }

    return payload.approval_key;
  }

  private assertConfigured(): void {
    const missing = [
      ["KIS_APP_KEY", this.config.appKey],
      ["KIS_APP_SECRET", this.config.appSecret],
      ["KIS_WEBSOCKET_URL", this.config.websocketUrl],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missing.length > 0) {
      throw new KisRealtimeConfigError(`Missing KIS realtime config: ${missing.join(", ")}`);
    }
  }
}
