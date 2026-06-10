import { cmcGet } from "@/lib/cmcClient";
import type { CmcOhlcvHistoricalResponse } from "@/types/cmc";
import type { Candle, TechnicalOverlay } from "@/types/strategy";

const CANDLE_LIMIT = 160;
const REQUEST_TIMEOUT_MS = 8000;
const MIN_CANDLES = 60;

type CandleSourceResult = {
  candles: Candle[];
  source: TechnicalOverlay["source"];
  note: string;
};

export async function getBnbCandles(timeframe: "1H" | "4H"): Promise<CandleSourceResult> {
  const loaders: Array<() => Promise<CandleSourceResult>> = [
    async () => ({
      candles: await getCmcHourlyCandles(timeframe),
      source: "cmc_ohlcv_historical",
      note: "Candles loaded from CoinMarketCap OHLCV historical endpoint."
    }),
    async () => ({
      candles: await getBinanceCandles(timeframe, "https://api.binance.com"),
      source: "binance_public_klines",
      note: "CMC OHLCV was unavailable for this key/plan, so indicators use public BNBUSDT klines (Binance) as a transparent fallback."
    }),
    async () => ({
      candles: await getBinanceCandles(timeframe, "https://data-api.binance.vision"),
      source: "binance_public_klines",
      note: "CMC OHLCV was unavailable for this key/plan, so indicators use public BNBUSDT klines (Binance data mirror) as a transparent fallback."
    }),
    async () => ({
      candles: await getOkxCandles(timeframe),
      source: "okx_public_candles",
      note: "CMC OHLCV and Binance klines were unavailable in this deployment region, so indicators use public BNB-USDT candles from OKX as a transparent fallback."
    }),
    async () => ({
      candles: await getKucoinCandles(timeframe),
      source: "kucoin_public_candles",
      note: "CMC OHLCV and other exchange klines were unavailable in this deployment region, so indicators use public BNB-USDT candles from KuCoin as a transparent fallback."
    })
  ];

  for (const loader of loaders) {
    try {
      const result = await loader();

      if (result.candles.length >= MIN_CANDLES) {
        return result;
      }
    } catch {
      // Try the next candle source in the chain.
    }
  }

  return {
    candles: getLocalFixtureCandles(timeframe),
    source: "local_fixture_candles",
    note: "All live candle sources were unavailable in this deployment region, so the app uses deterministic local candles to keep the strategy spec and backtest demo reproducible. Outputs in this mode are clearly labeled as fixture data."
  };
}

async function getCmcHourlyCandles(timeframe: "1H" | "4H") {
  const hourlyCount = timeframe === "4H" ? CANDLE_LIMIT * 4 : CANDLE_LIMIT;
  const payload = await cmcGet<CmcOhlcvHistoricalResponse>(
    "/v2/cryptocurrency/ohlcv/historical",
    {
      symbol: "BNB",
      convert: "USD",
      interval: "hourly",
      count: String(hourlyCount)
    }
  );

  const hourlyCandles =
    payload.data?.quotes?.flatMap((quote): Candle[] => {
      const usd = quote.quote?.USD;

      if (
        !quote.time_close ||
        typeof usd?.open !== "number" ||
        typeof usd.high !== "number" ||
        typeof usd.low !== "number" ||
        typeof usd.close !== "number"
      ) {
        return [];
      }

      return [
        {
          time: quote.time_close,
          open: usd.open,
          high: usd.high,
          low: usd.low,
          close: usd.close,
          volume: usd.volume ?? 0
        }
      ];
    }) ?? [];

  if (hourlyCandles.length < MIN_CANDLES) {
    throw new Error("CMC OHLCV returned too few candles.");
  }

  return timeframe === "4H" ? aggregateCandles(hourlyCandles, 4) : hourlyCandles;
}

async function getBinanceCandles(timeframe: "1H" | "4H", baseUrl: string) {
  const url = new URL("/api/v3/klines", baseUrl);
  url.searchParams.set("symbol", "BNBUSDT");
  url.searchParams.set("interval", timeframe === "4H" ? "4h" : "1h");
  url.searchParams.set("limit", String(CANDLE_LIMIT));

  const rows = await fetchPublicJson<unknown[][]>(url);

  return rows.flatMap((row): Candle[] => {
    const openTime = Number(row[0]);
    const open = Number(row[1]);
    const high = Number(row[2]);
    const low = Number(row[3]);
    const close = Number(row[4]);
    const volume = Number(row[5]);

    if (![openTime, open, high, low, close, volume].every(Number.isFinite)) {
      return [];
    }

    return [
      {
        time: new Date(openTime).toISOString(),
        open,
        high,
        low,
        close,
        volume
      }
    ];
  });
}

async function getOkxCandles(timeframe: "1H" | "4H") {
  const url = new URL("https://www.okx.com/api/v5/market/candles");
  url.searchParams.set("instId", "BNB-USDT");
  url.searchParams.set("bar", timeframe === "4H" ? "4H" : "1H");
  url.searchParams.set("limit", String(CANDLE_LIMIT));

  const payload = await fetchPublicJson<{ code?: string; data?: string[][] }>(url);

  if (payload.code !== "0" || !Array.isArray(payload.data)) {
    throw new Error("OKX candle request returned an error payload.");
  }

  // OKX returns rows newest-first: [ts, open, high, low, close, vol, ...]
  return payload.data
    .slice()
    .reverse()
    .flatMap((row): Candle[] => {
      const timestamp = Number(row[0]);
      const open = Number(row[1]);
      const high = Number(row[2]);
      const low = Number(row[3]);
      const close = Number(row[4]);
      const volume = Number(row[5]);

      if (![timestamp, open, high, low, close, volume].every(Number.isFinite)) {
        return [];
      }

      return [
        {
          time: new Date(timestamp).toISOString(),
          open,
          high,
          low,
          close,
          volume
        }
      ];
    });
}

async function getKucoinCandles(timeframe: "1H" | "4H") {
  const intervalSeconds = timeframe === "4H" ? 4 * 3600 : 3600;
  const endAt = Math.floor(Date.now() / 1000);
  const startAt = endAt - CANDLE_LIMIT * intervalSeconds;

  const url = new URL("https://api.kucoin.com/api/v1/market/candles");
  url.searchParams.set("symbol", "BNB-USDT");
  url.searchParams.set("type", timeframe === "4H" ? "4hour" : "1hour");
  url.searchParams.set("startAt", String(startAt));
  url.searchParams.set("endAt", String(endAt));

  const payload = await fetchPublicJson<{ code?: string; data?: string[][] }>(url);

  if (payload.code !== "200000" || !Array.isArray(payload.data)) {
    throw new Error("KuCoin candle request returned an error payload.");
  }

  // KuCoin returns rows newest-first: [time(sec), open, close, high, low, volume, turnover]
  return payload.data
    .slice()
    .reverse()
    .flatMap((row): Candle[] => {
      const timestampSeconds = Number(row[0]);
      const open = Number(row[1]);
      const close = Number(row[2]);
      const high = Number(row[3]);
      const low = Number(row[4]);
      const volume = Number(row[5]);

      if (![timestampSeconds, open, high, low, close, volume].every(Number.isFinite)) {
        return [];
      }

      return [
        {
          time: new Date(timestampSeconds * 1000).toISOString(),
          open,
          high,
          low,
          close,
          volume
        }
      ];
    });
}

async function fetchPublicJson<T>(url: URL): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Candle request failed with ${response.status}.`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function aggregateCandles(candles: Candle[], groupSize: number) {
  const groups: Candle[] = [];

  for (let index = 0; index + groupSize <= candles.length; index += groupSize) {
    const group = candles.slice(index, index + groupSize);
    groups.push({
      time: group.at(-1)?.time ?? group[0].time,
      open: group[0].open,
      high: Math.max(...group.map((candle) => candle.high)),
      low: Math.min(...group.map((candle) => candle.low)),
      close: group.at(-1)?.close ?? group[0].close,
      volume: group.reduce((sum, candle) => sum + candle.volume, 0)
    });
  }

  return groups;
}

function getLocalFixtureCandles(timeframe: "1H" | "4H") {
  const intervalMs = timeframe === "4H" ? 4 * 60 * 60 * 1000 : 60 * 60 * 1000;
  const start = Date.now() - CANDLE_LIMIT * intervalMs;

  return Array.from({ length: CANDLE_LIMIT }, (_, index): Candle => {
    const time = new Date(start + index * intervalMs).toISOString();

    if (timeframe === "1H") {
      const close = 640 - index * 0.28 + Math.sin(index / 3) * 18 - Math.max(index - 125, 0) * 0.9;
      const open = close + Math.sin(index / 2) * 7;
      const wick = 18 + Math.abs(Math.sin(index / 5)) * 17;

      return {
        time,
        open,
        high: Math.max(open, close) + wick,
        low: Math.min(open, close) - wick,
        close,
        volume: 180000 + index * 850
      };
    }

    // Mixed up/down waves so fixture indicators stay in realistic ranges
    // (a monotonic ramp previously pushed RSI to ~100).
    const close = 560 + Math.sin(index / 9) * 26 + Math.sin(index / 23) * 14 - index * 0.05;
    const open = close + Math.sin(index / 4) * 4;
    const wick = 4 + Math.abs(Math.sin(index / 7)) * 5;

    return {
      time,
      open,
      high: Math.max(open, close) + wick,
      low: Math.min(open, close) - wick,
      close,
      volume: 240000 + index * 1200
    };
  });
}
