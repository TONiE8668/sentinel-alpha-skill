import type {
  BacktestResult,
  CandleSource,
  GuardCheckStatus,
  MarketRegime,
  MarketSnapshot,
  RiskGuard,
  Scenario,
  StrategyOutput,
  StrategySpecification,
  TechnicalOverlay
} from "@/types/strategy";

export function classifyMarketRegime(market: MarketSnapshot): {
  regime: MarketRegime;
  explanation: string;
} {
  if (market.atrVolatility === "Extreme") {
    return {
      regime: "High Risk",
      explanation:
        "Volatility is extreme, so the strategy must prioritize capital preservation over new entries."
    };
  }

  if (market.emaTrend === "Below EMA stack" && market.macdStatus === "Bearish crossover") {
    return {
      regime: "Bearish",
      explanation:
        "Price structure and momentum are both pointing lower, so bullish entries need extra confirmation."
    };
  }

  if (
    market.emaTrend === "Above EMA stack" &&
    market.macdStatus === "Bullish crossover" &&
    market.rsi < 70
  ) {
    return {
      regime: "Bullish",
      explanation:
        "Trend and momentum agree while RSI is not overheated, creating a cleaner test environment."
    };
  }

  return {
    regime: "Sideways",
    explanation:
      "Signals are mixed, so the skill waits for cleaner confirmation before approving a new trade."
  };
}

export function deriveLiveStrategy(
  market: MarketSnapshot,
  timeframe: "1H" | "4H",
  technical?: TechnicalOverlay | null
): StrategyOutput {
  const trendUp = market.emaTrend === "Above EMA stack";
  const trendDown = market.emaTrend === "Below EMA stack";
  const momentumUp = market.macdStatus === "Bullish crossover";
  const momentumDown = market.macdStatus === "Bearish crossover";
  const overheated = market.rsi >= 70;
  const oversold = market.rsi <= 30;
  const atrExtreme = market.atrVolatility === "Extreme";
  const atrElevated = market.atrVolatility === "Elevated";
  const sentimentExtreme = market.fearGreedScore >= 80 || market.fearGreedScore <= 20;

  const decision: StrategyOutput["decision"] =
    trendDown && momentumDown
      ? "EXIT"
      : trendUp && momentumUp && !overheated && !atrExtreme
        ? "BUY"
        : "WAIT";

  let confidence = 50;
  if (trendUp) confidence += 10;
  if (trendDown) confidence -= 10;
  if (momentumUp) confidence += 10;
  if (momentumDown) confidence -= 10;
  if (market.rsi >= 40 && market.rsi <= 65) confidence += 10;
  if (overheated || oversold) confidence -= 10;
  if (market.atrVolatility === "Normal" || market.atrVolatility === "Low") confidence += 5;
  if (atrExtreme) confidence -= 10;
  if (sentimentExtreme) confidence -= 10;
  else if (market.fearGreedScore > 30 && market.fearGreedScore < 70) confidence += 5;
  confidence = Math.min(90, Math.max(20, confidence));

  const rsiText = overheated
    ? `RSI ${market.rsi} is overheated (70 or above), so chasing a fresh entry is rejected.`
    : oversold
      ? `RSI ${market.rsi} is deeply oversold (30 or below); the skill treats this as exhaustion risk, not an automatic buy signal.`
      : `RSI ${market.rsi} sits in a workable range, neither exhausted nor oversold.`;

  const macdText = momentumUp
    ? "MACD is in a bullish crossover, confirming upside momentum."
    : momentumDown
      ? "MACD is in a bearish crossover, so momentum is working against long entries."
      : "MACD is flat, offering no momentum confirmation either way.";

  const ema20Text = technical ? ` (EMA20 ${technical.ema20}, EMA50 ${technical.ema50})` : "";
  const emaText = trendUp
    ? `Price holds above the EMA stack${ema20Text}, so buyers control the current structure.`
    : trendDown
      ? `Price trades below the EMA stack${ema20Text}, so the trend filter rejects long setups.`
      : `The EMA stack is mixed${ema20Text}, so trend confirmation is incomplete.`;

  const atrText = atrExtreme
    ? "ATR volatility is extreme, which makes simulated stop placement unreliable."
    : atrElevated
      ? "ATR volatility is elevated, so position sizing must stay conservative."
      : `ATR volatility is ${market.atrVolatility.toLowerCase()}, so simulated stop sizing stays controlled.`;

  const sentimentText = sentimentExtreme
    ? `Fear & Greed at ${market.fearGreedScore} (${market.fearGreedLabel}) is an extreme reading, which blocks fresh entries.`
    : `Fear & Greed at ${market.fearGreedScore} (${market.fearGreedLabel}) is not extreme enough to block the setup.`;

  const ema20Value = technical ? technical.ema20.toFixed(2) : "the 20 EMA";
  const stopDistance = technical ? (1.4 * technical.atr).toFixed(2) : null;
  const stopLevel =
    technical && stopDistance
      ? (technical.latestClose - 1.4 * technical.atr).toFixed(2)
      : null;

  const entryRule =
    decision === "BUY"
      ? `Enter only after a ${timeframe} candle closes above the 20 EMA${technical ? ` (${ema20Value})` : ""} while MACD stays bullish and RSI holds below 65.`
      : `Do not enter until trend, momentum, volatility, and sentiment guards align; re-evaluate on the next ${timeframe} candle close.`;

  const exitRule = `Exit when price closes below the 20 EMA${technical ? ` (${ema20Value})` : ""} or MACD flips bearish on the ${timeframe} chart.`;

  const stopLossRule =
    decision === "BUY"
      ? stopDistance && stopLevel
        ? `Place a simulated stop 1.4x ATR (${stopDistance}) below entry, near ${stopLevel}; trail only after price moves in favor.`
        : "Place a simulated stop 1.4x ATR below entry, then trail only after price moves in favor."
      : "No new stop is proposed because no new entry is approved.";

  const positionSizingRule =
    decision === "BUY"
      ? "Use a small simulated allocation capped at 25% of test capital; no leverage."
      : "Keep simulated allocation at 0% until trend, momentum, volatility, and sentiment conditions improve.";

  return {
    decision,
    confidenceScore: confidence,
    suggestedTimeframe: timeframe,
    entryRule,
    exitRule,
    stopLossRule,
    positionSizingRule,
    reasoning: [rsiText, macdText, emaText, atrText, sentimentText]
  };
}

export function describeCandleSource(source: CandleSource): string {
  return {
    cmc_ohlcv_historical: "CoinMarketCap OHLCV",
    binance_public_klines: "public BNBUSDT klines (Binance)",
    okx_public_candles: "public BNB-USDT candles (OKX)",
    kucoin_public_candles: "public BNB-USDT candles (KuCoin)",
    local_fixture_candles: "deterministic local candle fallback"
  }[source];
}

export function buildRiskGuard(market: MarketSnapshot, backtest: BacktestResult): RiskGuard {
  const checks = [
    {
      label: "Trend confirmation",
      status: market.emaTrend === "Above EMA stack" ? "Pass" : "Warning",
      detail:
        market.emaTrend === "Above EMA stack"
          ? "BNB is trading above the EMA stack."
          : "EMA structure is not clean enough for a confident long setup."
    },
    {
      label: "Momentum quality",
      status:
        market.rsi >= 70 || market.macdStatus === "Bearish crossover" ? "Fail" : "Pass",
      detail:
        market.rsi >= 70 || market.macdStatus === "Bearish crossover"
          ? "Momentum is stretched or turning against the setup."
          : "RSI and MACD support a measured strategy test."
    },
    {
      label: "Volatility control",
      status:
        market.atrVolatility === "Extreme"
          ? "Fail"
          : market.atrVolatility === "Elevated"
            ? "Warning"
            : "Pass",
      detail:
        market.atrVolatility === "Extreme"
          ? "ATR is too high for a conservative entry."
          : "ATR is within an acceptable range for simulated stop sizing."
    },
    {
      label: "Sentiment risk",
      status:
        market.fearGreedScore >= 80 || market.fearGreedScore <= 20
          ? "Fail"
          : market.fearGreedScore >= 70 || market.fearGreedScore <= 30
            ? "Warning"
            : "Pass",
      detail:
        market.fearGreedScore >= 80 || market.fearGreedScore <= 20
          ? "Fear & Greed is in an extreme zone."
          : "Sentiment is not extreme enough to block the setup."
    },
    {
      label: "Backtest drawdown",
      status: backtest.maxDrawdown > 12 ? "Fail" : "Pass",
      detail:
        backtest.maxDrawdown > 12
          ? "Recent simulated drawdown exceeds the risk cap."
          : "Recent simulated drawdown stays inside the risk cap."
    }
  ] satisfies Array<{
    label: string;
    status: GuardCheckStatus;
    detail: string;
  }>;

  const blockedReasons = checks
    .filter((check) => check.status === "Fail")
    .map((check) => `${check.label}: ${check.detail}`);

  return {
    status: blockedReasons.length > 0 ? "BLOCKED" : "PASSED",
    checks,
    blockedReasons
  };
}

export function buildStrategySpecification({
  scenario,
  regime,
  riskGuard,
  technical = null,
  usesLiveMarketData = false,
  usesLiveTechnicalData = false,
  usesLiveBacktestData = false,
  generatedAt = "2026-06-07T00:00:00.000Z"
}: {
  scenario: Scenario;
  regime: ReturnType<typeof classifyMarketRegime>;
  riskGuard: RiskGuard;
  technical?: TechnicalOverlay | null;
  usesLiveMarketData?: boolean;
  usesLiveTechnicalData?: boolean;
  usesLiveBacktestData?: boolean;
  generatedAt?: string;
}): StrategySpecification {
  return {
    specVersion: "0.3.0-live-strategy",
    product: "Sentinel Alpha Skill",
    mode: "simulation_only",
    asset: scenario.market.asset,
    scenario: scenario.name,
    generatedAt,
    marketContext: {
      currentPrice: scenario.market.currentPrice,
      change24h: scenario.market.change24h,
      rsi: scenario.market.rsi,
      macdStatus: scenario.market.macdStatus,
      emaTrend: scenario.market.emaTrend,
      atrVolatility: scenario.market.atrVolatility,
      fearGreed: {
        score: scenario.market.fearGreedScore,
        label: scenario.market.fearGreedLabel
      },
      ...(technical
        ? {
            indicators: {
              ema20: technical.ema20,
              ema50: technical.ema50,
              atr: technical.atr,
              macd: technical.macd,
              macdSignal: technical.macdSignal,
              candleCount: technical.candleCount,
              candleSource: technical.source
            }
          }
        : {})
    },
    marketRegime: {
      label: regime.regime,
      explanation: regime.explanation
    },
    decision: {
      action: scenario.strategy.decision,
      confidenceScore: scenario.strategy.confidenceScore,
      suggestedTimeframe: scenario.strategy.suggestedTimeframe
    },
    rules: {
      entry: scenario.strategy.entryRule,
      exit: scenario.strategy.exitRule,
      stopLoss: scenario.strategy.stopLossRule,
      positionSizing: scenario.strategy.positionSizingRule
    },
    riskGuard: {
      status: riskGuard.status,
      blockedReasons: riskGuard.blockedReasons,
      checks: riskGuard.checks,
      principle: "No trade is also a valid strategy."
    },
    backtestSummary: {
      simulatedReturn: scenario.backtest.simulatedReturn,
      maxDrawdown: scenario.backtest.maxDrawdown,
      winRate: scenario.backtest.winRate,
      numberOfTrades: scenario.backtest.numberOfTrades,
      buyHoldReturn: scenario.backtest.buyHoldReturn
    },
    safetyConstraints: [
      "Simulation only.",
      "No wallet connection.",
      "No live trading.",
      "No transaction signing.",
      "No financial advice.",
      "Market and backtest outputs are for strategy testing only."
    ],
    dataSource: {
      type: usesLiveTechnicalData
        ? usesLiveBacktestData
          ? "coinmarketcap_rest_plus_live_indicators_and_backtest"
          : "coinmarketcap_rest_plus_live_indicators"
        : usesLiveMarketData
          ? "coinmarketcap_rest_plus_fixture_indicators"
          : "mock_fixture",
      marketData: usesLiveMarketData ? "coinmarketcap_rest" : "fixture",
      indicators: usesLiveTechnicalData ? "live_candles" : "fixture",
      backtest: usesLiveBacktestData ? "live_candles" : "fixture",
      note: usesLiveBacktestData
        ? "BNB quote and Fear & Greed are loaded from CoinMarketCap REST API. RSI, MACD, EMA, ATR, and the backtest are calculated from live candles. If CMC OHLCV is unavailable, candle-based calculations transparently use the public BNBUSDT fallback."
        : usesLiveTechnicalData
          ? "BNB quote and Fear & Greed are loaded from CoinMarketCap REST API. RSI, MACD, EMA, and ATR are calculated from live candles. Backtest values are using fixture fallback."
          : usesLiveMarketData
            ? "BNB quote and Fear & Greed are loaded from CoinMarketCap REST API. RSI, MACD, EMA, ATR, and backtest values are using fixture fallback."
            : "This run uses local fixture data because live market or candle data is unavailable."
    }
  };
}

export function applyRiskGuardDecision(scenario: Scenario, riskGuard: RiskGuard): Scenario {
  if (riskGuard.status !== "BLOCKED" || scenario.strategy.decision !== "BUY") {
    return scenario;
  }

  return {
    ...scenario,
    strategy: {
      ...scenario.strategy,
      decision: "WAIT",
      confidenceScore: Math.min(scenario.strategy.confidenceScore, 45),
      entryRule:
        "Do not enter while one or more risk guards are blocked; wait for risk conditions to normalize.",
      stopLossRule:
        "No new stop is proposed because the strategy is blocked before entry.",
      positionSizingRule:
        "Keep simulated allocation at 0% until the blocked risk guards clear.",
      reasoning: [
        "Risk Guard blocked the original BUY setup, so Sentinel Alpha overrides the decision to WAIT.",
        ...riskGuard.blockedReasons,
        ...scenario.strategy.reasoning
      ]
    }
  };
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}
