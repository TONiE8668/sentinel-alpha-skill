// Regenerates skill/sentinel-alpha/examples/*.json through the actual reference
// implementation, so every derived field (decision, confidence, rules, guard
// verdicts) is reproducible from the documented market context.
//
// Run from the repo root: npx tsx scripts/generate-example-specs.mts

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  applyRiskGuardDecision,
  buildRiskGuard,
  buildStrategySpecification,
  classifyMarketRegime,
  deriveLiveStrategy
} from "../lib/strategy";
import type {
  BacktestResult,
  MarketSnapshot,
  Scenario,
  TechnicalOverlay
} from "../types/strategy";

const EXAMPLES_DIR = join(import.meta.dirname, "..", "skill", "sentinel-alpha", "examples");

type ExampleInput = {
  file: string;
  generatedAt: string;
  market: MarketSnapshot;
  technical: TechnicalOverlay;
  backtest: BacktestResult;
};

const examples: ExampleInput[] = [
  {
    file: "spec-buy-approved.json",
    generatedAt: "2026-06-05T09:00:00.000Z",
    market: {
      asset: "BNB/USDT",
      currentPrice: 684.42,
      change24h: 2.18,
      rsi: 58.3,
      macdStatus: "Bullish crossover",
      emaTrend: "Above EMA stack",
      atrVolatility: "Normal",
      fearGreedScore: 54,
      fearGreedLabel: "Neutral"
    },
    technical: {
      timeframe: "4H",
      rsi: 58.3,
      macdStatus: "Bullish crossover",
      emaTrend: "Above EMA stack",
      atrVolatility: "Normal",
      ema20: 671.15,
      ema50: 655.4,
      atr: 11.62,
      macd: 4.1182,
      macdSignal: 2.7741,
      latestClose: 684.42,
      candleCount: 160,
      fetchedAt: "2026-06-05T09:00:00.000Z",
      source: "cmc_ohlcv_historical",
      note: "Candles loaded from CoinMarketCap OHLCV historical endpoint."
    },
    backtest: {
      simulatedReturn: 9.8,
      maxDrawdown: 5.4,
      winRate: 57,
      numberOfTrades: 14,
      buyHoldReturn: 6.1,
      chartPoints: []
    }
  },
  {
    file: "spec-wait-blocked.json",
    generatedAt: "2026-06-10T02:04:54.527Z",
    market: {
      asset: "BNB/USDT",
      currentPrice: 591.72,
      change24h: -1.0,
      rsi: 71.4,
      macdStatus: "Bullish crossover",
      emaTrend: "Above EMA stack",
      atrVolatility: "Normal",
      fearGreedScore: 15,
      fearGreedLabel: "Extreme Fear"
    },
    technical: {
      timeframe: "4H",
      rsi: 71.4,
      macdStatus: "Bullish crossover",
      emaTrend: "Above EMA stack",
      atrVolatility: "Normal",
      ema20: 586.9,
      ema50: 579.73,
      atr: 9.08,
      macd: 2.4055,
      macdSignal: 1.9012,
      latestClose: 591.72,
      candleCount: 160,
      fetchedAt: "2026-06-10T02:04:54.527Z",
      source: "okx_public_candles",
      note: "CMC OHLCV and Binance klines were unavailable in this deployment region, so indicators use public BNB-USDT candles from OKX as a transparent fallback."
    },
    backtest: {
      simulatedReturn: 4.2,
      maxDrawdown: 7.9,
      winRate: 52,
      numberOfTrades: 11,
      buyHoldReturn: -2.3,
      chartPoints: []
    }
  }
];

for (const example of examples) {
  const strategy = deriveLiveStrategy(example.market, example.technical.timeframe, example.technical);
  const scenario: Scenario = {
    id: "conservative",
    name: "Live Market Analysis",
    shortName: "Live Market Analysis",
    description: "Example generated through the Sentinel Alpha reference implementation.",
    market: example.market,
    strategy,
    backtest: example.backtest
  };

  const regime = classifyMarketRegime(example.market);
  const riskGuard = buildRiskGuard(example.market, example.backtest);
  const finalScenario = applyRiskGuardDecision(scenario, riskGuard);
  const specification = buildStrategySpecification({
    scenario: finalScenario,
    regime,
    riskGuard,
    technical: example.technical,
    usesLiveMarketData: true,
    usesLiveTechnicalData: true,
    usesLiveBacktestData: true,
    generatedAt: example.generatedAt
  });

  const target = join(EXAMPLES_DIR, example.file);
  writeFileSync(target, `${JSON.stringify(specification, null, 2)}\n`);
  console.log(
    `${example.file}: decision=${specification.decision.action} confidence=${specification.decision.confidenceScore} guard=${specification.riskGuard.status}`
  );
}
