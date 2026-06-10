import type { Candle, MarketSnapshot, TechnicalOverlay } from "@/types/strategy";

const RSI_PERIOD = 14;
const ATR_PERIOD = 14;
const EMA_FAST = 12;
const EMA_SLOW = 26;
const EMA_SIGNAL = 9;

export function calculateTechnicalOverlay(
  candles: Candle[],
  timeframe: "1H" | "4H",
  source: TechnicalOverlay["source"],
  note: string
): TechnicalOverlay {
  const cleanCandles = candles.filter((candle) =>
    [candle.open, candle.high, candle.low, candle.close].every(Number.isFinite)
  );

  if (cleanCandles.length < 60) {
    throw new Error("Not enough candles to calculate indicators.");
  }

  const closes = cleanCandles.map((candle) => candle.close);
  const rsi = calculateRsi(closes, RSI_PERIOD);
  const ema20 = last(calculateEma(closes, 20));
  const ema50 = last(calculateEma(closes, 50));
  const atr = calculateAtr(cleanCandles, ATR_PERIOD);
  const { macd, signal } = calculateMacd(closes);
  const latestClose = last(closes);
  const atrPercent = (atr / latestClose) * 100;

  return {
    timeframe,
    rsi: round(rsi, 1),
    macdStatus: classifyMacd(macd, signal),
    emaTrend: classifyEmaTrend(latestClose, ema20, ema50),
    atrVolatility: classifyAtrVolatility(atrPercent),
    ema20: round(ema20, 2),
    ema50: round(ema50, 2),
    atr: round(atr, 2),
    macd: round(macd, 4),
    macdSignal: round(signal, 4),
    latestClose: round(latestClose, 2),
    candleCount: cleanCandles.length,
    fetchedAt: new Date().toISOString(),
    source,
    note
  };
}

function calculateRsi(closes: number[], period: number) {
  if (closes.length <= period) {
    throw new Error("Not enough closes for RSI.");
  }

  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const change = closes[index] - closes[index - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (let index = period + 1; index < closes.length; index += 1) {
    const change = closes[index] - closes[index - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
  }

  if (averageLoss === 0) {
    return 100;
  }

  const relativeStrength = averageGain / averageLoss;
  return 100 - 100 / (1 + relativeStrength);
}

function calculateEma(values: number[], period: number) {
  if (values.length < period) {
    throw new Error("Not enough values for EMA.");
  }

  const multiplier = 2 / (period + 1);
  const seed = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  const emaValues = [seed];

  for (let index = period; index < values.length; index += 1) {
    const previous = last(emaValues);
    emaValues.push((values[index] - previous) * multiplier + previous);
  }

  return emaValues;
}

function calculateMacd(closes: number[]) {
  const emaFast = calculateEma(closes, EMA_FAST);
  const emaSlow = calculateEma(closes, EMA_SLOW);
  const offset = emaFast.length - emaSlow.length;
  const macdLine = emaSlow.map((slowValue, index) => emaFast[index + offset] - slowValue);
  const signalLine = calculateEma(macdLine, EMA_SIGNAL);

  return {
    macd: last(macdLine),
    signal: last(signalLine)
  };
}

function calculateAtr(candles: Candle[], period: number) {
  if (candles.length <= period) {
    throw new Error("Not enough candles for ATR.");
  }

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

  let atr = trueRanges.slice(0, period).reduce((sum, value) => sum + value, 0) / period;

  for (let index = period; index < trueRanges.length; index += 1) {
    atr = (atr * (period - 1) + trueRanges[index]) / period;
  }

  return atr;
}

function classifyMacd(macd: number, signal: number): MarketSnapshot["macdStatus"] {
  const spread = macd - signal;

  if (Math.abs(spread) < 0.05) {
    return "Flat momentum";
  }

  return spread > 0 ? "Bullish crossover" : "Bearish crossover";
}

function classifyEmaTrend(
  latestClose: number,
  ema20: number,
  ema50: number
): MarketSnapshot["emaTrend"] {
  if (latestClose > ema20 && ema20 > ema50) {
    return "Above EMA stack";
  }

  if (latestClose < ema20 && ema20 < ema50) {
    return "Below EMA stack";
  }

  return "Mixed EMA stack";
}

function classifyAtrVolatility(atrPercent: number): MarketSnapshot["atrVolatility"] {
  if (atrPercent >= 4.5) {
    return "Extreme";
  }

  if (atrPercent >= 3) {
    return "Elevated";
  }

  if (atrPercent >= 1.2) {
    return "Normal";
  }

  return "Low";
}

function last<T>(items: T[]) {
  const value = items.at(-1);

  if (value === undefined) {
    throw new Error("Expected at least one value.");
  }

  return value;
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
