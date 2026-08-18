import WebSocket from "ws";

export type KisRealtimeClientConfig = {
  baseUrl: string;
  websocketUrl: string;
  appKey?: string;
  appSecret?: string;
};

export type DomesticStockTrade = {
  trKey: string;
  symbol: string;
  businessDate: string;
  tradeTime: string;
  timestamp: string;
  price: number;
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
  sellTradeCount: number;
  buyTradeCount: number;
  netBuyTradeCount: number;
  tradeStrength: number;
  totalSellQuantity: number;
  totalBuyQuantity: number;
  tradeType: string;
  buyRate: number;
  previousVolumeChangeRate: number;
  openTime: string;
  openPriceChangeSign: string;
  openPriceChange: number;
  highTime: string;
  highPriceChangeSign: string;
  highPriceChange: number;
  lowTime: string;
  lowPriceChangeSign: string;
  lowPriceChange: number;
  marketOperationCode: string;
  tradingHalt: boolean;
  askRemainQuantity1: number;
  bidRemainQuantity1: number;
  totalAskRemainQuantity: number;
  totalBidRemainQuantity: number;
  volumeTurnoverRate: number;
  previousSameTimeAccumulatedVolume: number;
  previousSameTimeAccumulatedVolumeRate: number;
  hourClassCode: string;
  marketTerminationClassCode: string;
  staticViStandardPrice: number;
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
const KIS_DOMESTIC_STOCK_TRADE_WS_PATH = "/tryitout/H0STCNT0";

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

function toKoreaMarketTimestamp(businessDate: string, tradeTime: string): string {
  if (!/^\d{8}$/.test(businessDate) || !/^\d{6}$/.test(tradeTime)) {
    return "";
  }

  const year = businessDate.slice(0, 4);
  const month = businessDate.slice(4, 6);
  const day = businessDate.slice(6, 8);
  const hour = tradeTime.slice(0, 2);
  const minute = tradeTime.slice(2, 4);
  const second = tradeTime.slice(4, 6);

  return `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
}

function parseTradeRecord(values: string[]): DomesticStockTrade {
  const raw = DOMESTIC_STOCK_TRADE_FIELDS.reduce<Record<string, string>>((acc, field, index) => {
    acc[field] = values[index] ?? "";
    return acc;
  }, {});
  const currentPrice = toNumber(raw.STCK_PRPR);

  return {
    trKey: raw.MKSC_SHRN_ISCD,
    symbol: raw.MKSC_SHRN_ISCD,
    businessDate: raw.BSOP_DATE,
    tradeTime: raw.STCK_CNTG_HOUR,
    timestamp: toKoreaMarketTimestamp(raw.BSOP_DATE, raw.STCK_CNTG_HOUR),
    price: currentPrice,
    currentPrice,
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
    sellTradeCount: toNumber(raw.SELN_CNTG_CSNU),
    buyTradeCount: toNumber(raw.SHNU_CNTG_CSNU),
    netBuyTradeCount: toNumber(raw.NTBY_CNTG_CSNU),
    tradeStrength: toNumber(raw.CTTR),
    totalSellQuantity: toNumber(raw.SELN_CNTG_SMTN),
    totalBuyQuantity: toNumber(raw.SHNU_CNTG_SMTN),
    tradeType: raw.CCLD_DVSN,
    buyRate: toNumber(raw.SHNU_RATE),
    previousVolumeChangeRate: toNumber(raw.PRDY_VOL_VRSS_ACML_VOL_RATE),
    openTime: raw.OPRC_HOUR,
    openPriceChangeSign: raw.OPRC_VRSS_PRPR_SIGN,
    openPriceChange: toNumber(raw.OPRC_VRSS_PRPR),
    highTime: raw.HGPR_HOUR,
    highPriceChangeSign: raw.HGPR_VRSS_PRPR_SIGN,
    highPriceChange: toNumber(raw.HGPR_VRSS_PRPR),
    lowTime: raw.LWPR_HOUR,
    lowPriceChangeSign: raw.LWPR_VRSS_PRPR_SIGN,
    lowPriceChange: toNumber(raw.LWPR_VRSS_PRPR),
    marketOperationCode: raw.NEW_MKOP_CLS_CODE,
    tradingHalt: raw.TRHT_YN === "Y",
    askRemainQuantity1: toNumber(raw.ASKP_RSQN1),
    bidRemainQuantity1: toNumber(raw.BIDP_RSQN1),
    totalAskRemainQuantity: toNumber(raw.TOTAL_ASKP_RSQN),
    totalBidRemainQuantity: toNumber(raw.TOTAL_BIDP_RSQN),
    volumeTurnoverRate: toNumber(raw.VOL_TNRT),
    previousSameTimeAccumulatedVolume: toNumber(raw.PRDY_SMNS_HOUR_ACML_VOL),
    previousSameTimeAccumulatedVolumeRate: toNumber(raw.PRDY_SMNS_HOUR_ACML_VOL_RATE),
    hourClassCode: raw.HOUR_CLS_CODE,
    marketTerminationClassCode: raw.MRKT_TRTM_CLS_CODE,
    staticViStandardPrice: toNumber(raw.VI_STND_PRC),
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

function buildRealtimeWebSocketUrl(websocketUrl: string): string {
  const url = new URL(websocketUrl);

  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = KIS_DOMESTIC_STOCK_TRADE_WS_PATH;
  }

  return url.toString();
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
    const socket = new WebSocket(buildRealtimeWebSocketUrl(this.config.websocketUrl));
    const requestedSubscriptions = new Set<string>();
    const activeSubscriptions = new Set<string>();

    const sendSubscription = (symbol: string, trType: "1" | "2") => {
      if (socket.readyState !== WebSocket.OPEN) return;

      socket.send(buildSubscribeMessage(approvalKey, symbol, trType));

      if (trType === "1") {
        activeSubscriptions.add(symbol);
        input.onStatus({ type: "subscribed", symbol });
      } else {
        activeSubscriptions.delete(symbol);
        input.onStatus({ type: "unsubscribed", symbol });
      }
    };

    const updateSubscriptions = (symbols: string[], trType: "1" | "2") => {
      for (const symbolInput of symbols) {
        const symbol = normalizeSymbol(symbolInput);
        if (!isKisDomesticStockSymbol(symbol)) {
          input.onError(new Error(`Invalid domestic stock symbol: ${symbolInput}`));
          continue;
        }

        if (trType === "1") {
          requestedSubscriptions.add(symbol);
          if (!activeSubscriptions.has(symbol)) {
            sendSubscription(symbol, "1");
          }
        } else {
          requestedSubscriptions.delete(symbol);
          if (activeSubscriptions.has(symbol)) {
            sendSubscription(symbol, "2");
          }
        }
      }
    };

    updateSubscriptions(input.symbols, "1");

    socket.on("open", () => {
      input.onStatus({ type: "open" });
      for (const symbol of requestedSubscriptions) {
        sendSubscription(symbol, "1");
      }
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
      subscribe: (symbols) => updateSubscriptions(symbols, "1"),
      unsubscribe: (symbols) => updateSubscriptions(symbols, "2"),
      close: () => {
        if (socket.readyState === WebSocket.OPEN) {
          for (const symbol of activeSubscriptions) {
            sendSubscription(symbol, "2");
          }
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
