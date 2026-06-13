import { runSentinelBacktest } from "@/lib/backtestEngine";
import { getBnbCandles } from "@/lib/candleSources";
import { getLiveBnbMarketOverlay } from "@/lib/cmcAdapter";
import { scenarios } from "@/lib/fixtures";
import { calculateTechnicalOverlay } from "@/lib/indicatorMath";
import { validateStrategySpecification } from "@/lib/specValidation";
import {
  applyRiskGuardDecision,
  buildRiskGuard,
  buildStrategySpecification,
  classifyMarketRegime,
  deriveLiveStrategy
} from "@/lib/strategy";
import type {
  BacktestResult,
  Scenario,
  StrategySpecification,
  TechnicalOverlay
} from "@/types/strategy";

export type StrategySpecBuildMode = "live" | "stress";

export type StrategySpecBuildResult = {
  spec: StrategySpecification;
  validation: ReturnType<typeof validateStrategySpecification>;
  provenance: {
    mode: StrategySpecBuildMode;
    timeframe: "1H" | "4H";
    marketData: "coinmarketcap_rest" | "fixture";
    indicators: TechnicalOverlay["source"] | "fixture";
    backtest: TechnicalOverlay["source"] | "fixture";
    notes: string[];
  };
};

export async function buildJudgeReadyStrategySpec({
  mode,
  timeframe
}: {
  mode: StrategySpecBuildMode;
  timeframe: "1H" | "4H";
}): Promise<StrategySpecBuildResult> {
  const result =
    mode === "stress"
      ? await buildStressStrategySpec(timeframe)
      : await buildLiveStrategySpec(timeframe);

  return {
    ...result,
    validation: validateStrategySpecification(result.spec)
  };
}

async function buildStressStrategySpec(timeframe: "1H" | "4H") {
  const base = scenarios.rejected;
  const notes: string[] = [
    "Controlled stress indicators prove the skill can refuse unsafe setups."
  ];
  let market = { ...base.market };
  let marketData: "coinmarketcap_rest" | "fixture" = "fixture";

  try {
    const overlay = await getLiveBnbMarketOverlay();
    market = {
      ...market,
      currentPrice: overlay.currentPrice,
      change24h: overlay.change24h,
      fearGreedScore: overlay.fearGreedScore,
      fearGreedLabel: overlay.fearGreedLabel
    };
    marketData = "coinmarketcap_rest";
    notes.push(overlay.note);
  } catch (error) {
    notes.push(
      error instanceof Error
        ? `CMC market overlay unavailable: ${error.message}`
        : "CMC market overlay unavailable."
    );
  }

  const scenario: Scenario = {
    ...base,
    market,
    strategy: deriveLiveStrategy(market, timeframe, null)
  };
  const regime = classifyMarketRegime(scenario.market);
  const riskGuard = buildRiskGuard(scenario.market, scenario.backtest);
  const finalScenario = applyRiskGuardDecision(scenario, riskGuard);

  const spec = buildStrategySpecification({
    scenario: finalScenario,
    regime,
    riskGuard,
    usesLiveMarketData: marketData === "coinmarketcap_rest",
    usesLiveTechnicalData: false,
    usesLiveBacktestData: false,
    generatedAt: new Date().toISOString()
  });

  return {
    spec,
    validation: validateStrategySpecification(spec),
    provenance: {
      mode: "stress" as const,
      timeframe,
      marketData,
      indicators: "fixture" as const,
      backtest: "fixture" as const,
      notes
    }
  };
}

async function buildLiveStrategySpec(timeframe: "1H" | "4H") {
  const base = scenarios.conservative;
  const notes: string[] = [];
  let market: Scenario["market"] = { ...base.market };
  let technical: TechnicalOverlay | null = null;
  let backtest: BacktestResult = base.backtest;
  let marketData: "coinmarketcap_rest" | "fixture" = "fixture";
  let indicatorSource: TechnicalOverlay["source"] | "fixture" = "fixture";
  let backtestSource: TechnicalOverlay["source"] | "fixture" = "fixture";

  try {
    const overlay = await getLiveBnbMarketOverlay();
    market = {
      ...market,
      currentPrice: overlay.currentPrice,
      change24h: overlay.change24h,
      fearGreedScore: overlay.fearGreedScore,
      fearGreedLabel: overlay.fearGreedLabel
    };
    marketData = "coinmarketcap_rest";
    notes.push(overlay.note);
  } catch (error) {
    notes.push(
      error instanceof Error
        ? `CMC market overlay unavailable: ${error.message}`
        : "CMC market overlay unavailable."
    );
  }

  try {
    const candleResult = await getBnbCandles(timeframe);
    technical = calculateTechnicalOverlay(
      candleResult.candles,
      timeframe,
      candleResult.source,
      candleResult.note
    );
    const liveBacktest = runSentinelBacktest({
      candles: candleResult.candles,
      timeframe,
      source: candleResult.source,
      note: candleResult.note
    });

    market = {
      ...market,
      rsi: technical.rsi,
      macdStatus: technical.macdStatus,
      emaTrend: technical.emaTrend,
      atrVolatility: technical.atrVolatility
    };
    backtest = liveBacktest;
    indicatorSource = technical.source;
    backtestSource = liveBacktest.source;
    notes.push(candleResult.note);
  } catch (error) {
    notes.push(
      error instanceof Error
        ? `Candle indicators unavailable: ${error.message}`
        : "Candle indicators unavailable."
    );
  }

  const strategy = deriveLiveStrategy(market, timeframe, technical);
  const scenario: Scenario = {
    ...base,
    market,
    strategy,
    backtest
  };
  const regime = classifyMarketRegime(scenario.market);
  const riskGuard = buildRiskGuard(scenario.market, scenario.backtest);
  const finalScenario = applyRiskGuardDecision(scenario, riskGuard);
  const usesLiveTechnicalData = indicatorSource !== "fixture" && indicatorSource !== "local_fixture_candles";
  const usesLiveBacktestData = backtestSource !== "fixture" && backtestSource !== "local_fixture_candles";

  const spec = buildStrategySpecification({
    scenario: finalScenario,
    regime,
    riskGuard,
    technical,
    usesLiveMarketData: marketData === "coinmarketcap_rest",
    usesLiveTechnicalData,
    usesLiveBacktestData,
    generatedAt: new Date().toISOString()
  });

  return {
    spec,
    validation: validateStrategySpecification(spec),
    provenance: {
      mode: "live" as const,
      timeframe,
      marketData,
      indicators: indicatorSource,
      backtest: backtestSource,
      notes
    }
  };
}

export function parseStrategySpecMode(value: string | null): StrategySpecBuildMode {
  return value === "stress" ? "stress" : "live";
}

export function parseStrategySpecTimeframe(value: string | null): "1H" | "4H" {
  return value === "1H" ? "1H" : "4H";
}
