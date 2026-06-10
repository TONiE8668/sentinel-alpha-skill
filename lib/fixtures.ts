import type { Scenario } from "@/types/strategy";

export const scenarios: Record<Scenario["id"], Scenario> = {
  conservative: {
    id: "conservative",
    name: "Scenario A: Live Market Analysis",
    shortName: "Live Market Analysis",
    description:
      "Live CMC quote, Fear & Greed, and indicators plus a backtest computed from real BNB candles.",
    market: {
      asset: "BNB/USDT",
      currentPrice: 684.42,
      change24h: 2.18,
      rsi: 58,
      macdStatus: "Bullish crossover",
      emaTrend: "Above EMA stack",
      atrVolatility: "Normal",
      fearGreedScore: 54,
      fearGreedLabel: "Neutral"
    },
    strategy: {
      decision: "BUY",
      confidenceScore: 78,
      suggestedTimeframe: "4H",
      entryRule:
        "Enter only after a 4H candle closes above the 20 EMA while MACD remains bullish and RSI stays below 65.",
      exitRule:
        "Exit when price closes below the 20 EMA or MACD flips bearish on the 4H chart.",
      stopLossRule:
        "Place a simulated stop 1.4x ATR below entry, then trail only after price moves in favor.",
      positionSizingRule:
        "Use a small simulated allocation capped at 25% of test capital; no leverage.",
      reasoning: [
        "Momentum is constructive without showing an overheated RSI reading.",
        "EMA trend confirms that buyers are still controlling the current structure.",
        "ATR volatility is normal, so stop placement is not unusually wide."
      ]
    },
    backtest: {
      simulatedReturn: 12.4,
      maxDrawdown: 6.8,
      winRate: 61,
      numberOfTrades: 18,
      buyHoldReturn: 7.2,
      chartPoints: [18, 23, 25, 22, 30, 35, 34, 42, 47, 52, 49, 58, 62, 66]
    }
  },
  rejected: {
    id: "rejected",
    name: "Scenario B: Stress Test - Volatility Rejection (Fixture)",
    shortName: "Volatility Rejection Stress Test",
    description:
      "Deterministic fixture that demonstrates how the Risk Guard rejects a fast, overheated market.",
    market: {
      asset: "BNB/USDT",
      currentPrice: 641.09,
      change24h: -7.84,
      rsi: 76,
      macdStatus: "Bearish crossover",
      emaTrend: "Mixed EMA stack",
      atrVolatility: "Extreme",
      fearGreedScore: 82,
      fearGreedLabel: "Extreme Greed"
    },
    strategy: {
      decision: "WAIT",
      confidenceScore: 34,
      suggestedTimeframe: "1H",
      entryRule:
        "Do not enter while ATR remains extreme and RSI is above 70; wait for volatility compression.",
      exitRule:
        "Exit any simulated long exposure if a 1H candle closes below the prior swing low.",
      stopLossRule:
        "No new stop is proposed because the strategy is blocked before entry.",
      positionSizingRule:
        "Keep simulated allocation at 0% until volatility and sentiment risk normalize.",
      reasoning: [
        "ATR is extreme, which makes stop placement unstable for a conservative strategy.",
        "RSI is overheated while MACD momentum has turned bearish.",
        "Fear & Greed is in an extreme zone, so chasing entries is rejected."
      ]
    },
    backtest: {
      simulatedReturn: -3.6,
      maxDrawdown: 14.9,
      winRate: 38,
      numberOfTrades: 27,
      buyHoldReturn: -8.1,
      chartPoints: [60, 57, 54, 58, 49, 44, 47, 42, 40, 43, 38, 36, 39, 34]
    }
  }
};

