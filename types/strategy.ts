export type ScenarioId = "conservative" | "rejected";

export type Decision = "BUY" | "WAIT" | "EXIT";

export type MarketRegime = "Bullish" | "Bearish" | "Sideways" | "High Risk";

export type GuardStatus = "PASSED" | "BLOCKED";

export type GuardCheckStatus = "Pass" | "Warning" | "Fail";

export type MarketSnapshot = {
  asset: "BNB/USDT";
  currentPrice: number;
  change24h: number;
  rsi: number;
  macdStatus: "Bullish crossover" | "Bearish crossover" | "Flat momentum";
  emaTrend: "Above EMA stack" | "Below EMA stack" | "Mixed EMA stack";
  atrVolatility: "Low" | "Normal" | "Elevated" | "Extreme";
  fearGreedScore: number;
  fearGreedLabel: "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";
};

export type LiveMarketOverlay = {
  currentPrice: number;
  change24h: number;
  fearGreedScore: number;
  fearGreedLabel: MarketSnapshot["fearGreedLabel"];
  fetchedAt: string;
  source: "coinmarketcap_rest";
  note: string;
};

export type MarketSnapshotResponse =
  | {
      ok: true;
      data: LiveMarketOverlay;
    }
  | {
      ok: false;
      error: string;
    };

export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type TechnicalOverlay = {
  timeframe: "1H" | "4H";
  rsi: number;
  macdStatus: MarketSnapshot["macdStatus"];
  emaTrend: MarketSnapshot["emaTrend"];
  atrVolatility: MarketSnapshot["atrVolatility"];
  ema20: number;
  ema50: number;
  atr: number;
  macd: number;
  macdSignal: number;
  latestClose: number;
  candleCount: number;
  fetchedAt: string;
  source: CandleSource;
  note: string;
};

export type CandleSource =
  | "cmc_ohlcv_historical"
  | "binance_public_klines"
  | "okx_public_candles"
  | "kucoin_public_candles"
  | "local_fixture_candles";

export type TechnicalIndicatorsResponse =
  | {
      ok: true;
      data: TechnicalOverlay;
    }
  | {
      ok: false;
      error: string;
    };

export type StrategyOutput = {
  decision: Decision;
  confidenceScore: number;
  suggestedTimeframe: "1H" | "4H";
  entryRule: string;
  exitRule: string;
  stopLossRule: string;
  positionSizingRule: string;
  reasoning: string[];
};

export type RiskGuard = {
  status: GuardStatus;
  checks: Array<{
    label: string;
    status: GuardCheckStatus;
    detail: string;
  }>;
  blockedReasons: string[];
};

export type BacktestResult = {
  simulatedReturn: number;
  maxDrawdown: number;
  winRate: number;
  numberOfTrades: number;
  buyHoldReturn: number;
  chartPoints: number[];
};

export type LiveBacktestResult = BacktestResult & {
  timeframe: "1H" | "4H";
  source: TechnicalOverlay["source"];
  candleCount: number;
  exposureTime: number;
  transactionCostPercent: number;
  fetchedAt: string;
  note: string;
};

export type BacktestResponse =
  | {
      ok: true;
      data: LiveBacktestResult;
    }
  | {
      ok: false;
      error: string;
    };

export type Scenario = {
  id: ScenarioId;
  name: string;
  shortName: string;
  description: string;
  market: MarketSnapshot;
  strategy: StrategyOutput;
  backtest: BacktestResult;
};

export type StrategySpecification = {
  specVersion: "0.3.0-live-strategy";
  product: "Sentinel Alpha Skill";
  mode: "simulation_only";
  asset: "BNB/USDT";
  scenario: string;
  generatedAt: string;
  marketContext: {
    currentPrice: number;
    change24h: number;
    rsi: number;
    macdStatus: MarketSnapshot["macdStatus"];
    emaTrend: MarketSnapshot["emaTrend"];
    atrVolatility: MarketSnapshot["atrVolatility"];
    fearGreed: {
      score: number;
      label: MarketSnapshot["fearGreedLabel"];
    };
    indicators?: {
      ema20: number;
      ema50: number;
      atr: number;
      macd: number;
      macdSignal: number;
      candleCount: number;
      candleSource: CandleSource;
    };
  };
  marketRegime: {
    label: MarketRegime;
    explanation: string;
  };
  decision: {
    action: Decision;
    confidenceScore: number;
    suggestedTimeframe: "1H" | "4H";
  };
  rules: {
    entry: string;
    exit: string;
    stopLoss: string;
    positionSizing: string;
  };
  riskGuard: {
    status: GuardStatus;
    blockedReasons: string[];
    checks: RiskGuard["checks"];
    principle: "No trade is also a valid strategy.";
  };
  backtestSummary: {
    simulatedReturn: number;
    maxDrawdown: number;
    winRate: number;
    numberOfTrades: number;
    buyHoldReturn: number;
  };
  safetyConstraints: string[];
  dataSource: {
    type:
      | "mock_fixture"
      | "coinmarketcap_rest_plus_fixture_indicators"
      | "coinmarketcap_rest_plus_live_indicators"
      | "coinmarketcap_rest_plus_live_indicators_and_backtest";
    marketData: "coinmarketcap_rest" | "fixture";
    indicators: "live_candles" | "fixture";
    backtest: "live_candles" | "fixture";
    note: string;
  };
};
