import type { Candle, LiveBacktestResult, TechnicalOverlay } from "@/types/strategy";

const START_EQUITY = 100;
const TRANSACTION_COST = 0.001;
const WARMUP = 60;

type IndicatorPoint = {
  close: number;
  ema20: number;
  ema50: number;
  rsi: number;
  macd: number;
  signal: number;
  atrPercent: number;
};

type Trade = {
  entry: number;
  exit: number;
  returnPercent: number;
};

export function runSentinelBacktest({
  candles,
  timeframe,
  source,
  note
}: {
  candles: Candle[];
  timeframe: "1H" | "4H";
  source: TechnicalOverlay["source"];
  note: string;
}): LiveBacktestResult {
  const cleanCandles = candles.filter((candle) =>
    [candle.open, candle.high, candle.low, candle.close].every(Number.isFinite)
  );

  if (cleanCandles.length < WARMUP + 10) {
    throw new Error("Not enough candles to run backtest.");
  }

  const indicators = buildIndicatorSeries(cleanCandles);
  let equity = START_EQUITY;
  let peakEquity = START_EQUITY;
  let maxDrawdown = 0;
  let inPosition = false;
  let entryPrice = 0;
  let entryEquity = START_EQUITY;
  let exposureCandles = 0;
  const trades: Trade[] = [];
  const equityCurve: number[] = [];

  for (let index = WARMUP; index < indicators.length; index += 1) {
    const point = indicators[index];

    if (inPosition) {
      exposureCandles += 1;
      const markToMarket = entryEquity * (point.close / entryPrice) * (1 - TRANSACTION_COST);
      equity = markToMarket;
    }

    const shouldEnter =
      !inPosition &&
      point.close > point.ema20 &&
      point.ema20 > point.ema50 &&
      point.macd > point.signal &&
      point.rsi < 70 &&
      point.atrPercent < 3;

    const shouldExit =
      inPosition &&
      (point.close < point.ema20 ||
        point.macd < point.signal ||
        point.rsi > 75 ||
        point.atrPercent >= 4.5);

    if (shouldEnter) {
      inPosition = true;
      entryPrice = point.close;
      equity *= 1 - TRANSACTION_COST;
      entryEquity = equity;
    }

    if (shouldExit) {
      const exitEquity = entryEquity * (point.close / entryPrice) * (1 - TRANSACTION_COST);
      const returnPercent = ((exitEquity - entryEquity) / entryEquity) * 100;
      equity = exitEquity;
      trades.push({
        entry: entryPrice,
        exit: point.close,
        returnPercent
      });
      inPosition = false;
      entryPrice = 0;
      entryEquity = equity;
    }

    peakEquity = Math.max(peakEquity, equity);
    maxDrawdown = Math.max(maxDrawdown, ((peakEquity - equity) / peakEquity) * 100);
    equityCurve.push(equity);
  }

  if (inPosition) {
    const lastPoint = indicators.at(-1);

    if (lastPoint) {
      const exitEquity = entryEquity * (lastPoint.close / entryPrice) * (1 - TRANSACTION_COST);
      const returnPercent = ((exitEquity - entryEquity) / entryEquity) * 100;
      equity = exitEquity;
      trades.push({
        entry: entryPrice,
        exit: lastPoint.close,
        returnPercent
      });
    }
  }

  const firstClose = cleanCandles[WARMUP].close;
  const lastClose = cleanCandles.at(-1)?.close ?? firstClose;
  const buyHoldReturn = ((lastClose - firstClose) / firstClose) * 100;
  const wins = trades.filter((trade) => trade.returnPercent > 0).length;

  return {
    timeframe,
    simulatedReturn: round(((equity - START_EQUITY) / START_EQUITY) * 100, 1),
    maxDrawdown: round(maxDrawdown, 1),
    winRate: trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0,
    numberOfTrades: trades.length,
    buyHoldReturn: round(buyHoldReturn, 1),
    chartPoints: compressChartPoints(equityCurve),
    source,
    candleCount: cleanCandles.length,
    exposureTime: Math.round((exposureCandles / Math.max(indicators.length - WARMUP, 1)) * 100),
    transactionCostPercent: TRANSACTION_COST * 100,
    fetchedAt: new Date().toISOString(),
    note
  };
}

function buildIndicatorSeries(candles: Candle[]) {
  const closes = candles.map((candle) => candle.close);
  const ema20 = fullEma(closes, 20);
  const ema50 = fullEma(closes, 50);
  const rsi = fullRsi(closes, 14);
  const atr = fullAtr(candles, 14);
  const { macd, signal } = fullMacd(closes);

  return candles.map((candle, index): IndicatorPoint => {
    const atrValue = atr[index] ?? 0;

    return {
      close: candle.close,
      ema20: ema20[index] ?? candle.close,
      ema50: ema50[index] ?? candle.close,
      rsi: rsi[index] ?? 50,
      macd: macd[index] ?? 0,
      signal: signal[index] ?? 0,
      atrPercent: candle.close > 0 ? (atrValue / candle.close) * 100 : 0
    };
  });
}

function fullEma(values: number[], period: number) {
  const result = Array<number | null>(values.length).fill(null);

  if (values.length < period) {
    return result;
  }

  const multiplier = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  result[period - 1] = ema;

  for (let index = period; index < values.length; index += 1) {
    ema = (values[index] - ema) * multiplier + ema;
    result[index] = ema;
  }

  return result;
}

function fullRsi(closes: number[], period: number) {
  const result = Array<number | null>(closes.length).fill(null);

  if (closes.length <= period) {
    return result;
  }

  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const change = closes[index] - closes[index - 1];
    gains += Math.max(change, 0);
    losses += Math.max(-change, 0);
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;
  result[period] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);

  for (let index = period + 1; index < closes.length; index += 1) {
    const change = closes[index] - closes[index - 1];
    averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
    result[index] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
  }

  return result;
}

function fullAtr(candles: Candle[], period: number) {
  const result = Array<number | null>(candles.length).fill(null);
  const trueRanges: number[] = [];

  for (let index = 1; index < candles.length; index += 1) {
    const current = candles[index];
    const previous = candles[index - 1];
    trueRanges.push(
      Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      )
    );
  }

  if (trueRanges.length < period) {
    return result;
  }

  let atr = trueRanges.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  result[period] = atr;

  for (let index = period; index < trueRanges.length; index += 1) {
    atr = (atr * (period - 1) + trueRanges[index]) / period;
    result[index + 1] = atr;
  }

  return result;
}

function fullMacd(closes: number[]) {
  const ema12 = fullEma(closes, 12);
  const ema26 = fullEma(closes, 26);
  const macd = closes.map((_, index) =>
    ema12[index] !== null && ema26[index] !== null ? ema12[index] - ema26[index] : null
  );
  const signal = emaFromNullable(macd, 9);

  return { macd, signal };
}

function emaFromNullable(values: Array<number | null>, period: number) {
  const result = Array<number | null>(values.length).fill(null);
  const validValues: number[] = [];
  const validIndexes: number[] = [];

  values.forEach((value, index) => {
    if (value !== null) {
      validValues.push(value);
      validIndexes.push(index);
    }
  });

  if (validValues.length < period) {
    return result;
  }

  const multiplier = 2 / (period + 1);
  let ema = validValues.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  result[validIndexes[period - 1]] = ema;

  for (let index = period; index < validValues.length; index += 1) {
    ema = (validValues[index] - ema) * multiplier + ema;
    result[validIndexes[index]] = ema;
  }

  return result;
}

function compressChartPoints(points: number[]) {
  if (points.length === 0) {
    return [START_EQUITY];
  }

  const bucketCount = Math.min(24, points.length);
  const result: number[] = [];

  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const index = Math.floor((bucket / (bucketCount - 1 || 1)) * (points.length - 1));
    result.push(round(points[index], 2));
  }

  return result;
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
