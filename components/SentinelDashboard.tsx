"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { scenarios } from "@/lib/fixtures";
import {
  applyRiskGuardDecision,
  buildRiskGuard,
  buildStrategySpecification,
  classifyMarketRegime,
  deriveLiveStrategy,
  describeCandleSource,
  formatPercent,
  formatUsd
} from "@/lib/strategy";
import type {
  BacktestResult,
  BacktestResponse,
  GuardCheckStatus,
  MarketRegime,
  MarketSnapshotResponse,
  Scenario,
  ScenarioId,
  StrategySpecification,
  TechnicalIndicatorsResponse
} from "@/types/strategy";

const scenarioOrder: ScenarioId[] = ["conservative", "rejected"];

export function SentinelDashboard() {
  const [activeScenarioId, setActiveScenarioId] = useState<ScenarioId>("conservative");
  const [liveMarket, setLiveMarket] = useState<MarketSnapshotResponse | null>(null);
  const [liveTechnical, setLiveTechnical] = useState<TechnicalIndicatorsResponse | null>(null);
  const [liveBacktest, setLiveBacktest] = useState<BacktestResponse | null>(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [isLoadingTechnical, setIsLoadingTechnical] = useState(false);
  const [isLoadingBacktest, setIsLoadingBacktest] = useState(false);
  const scenario = scenarios[activeScenarioId];
  const isLiveScenario = activeScenarioId === "conservative";
  const displayScenario = useMemo<Scenario>(() => {
    const market = {
      ...scenario.market,
      ...(isLiveScenario && liveMarket?.ok
        ? {
            currentPrice: liveMarket.data.currentPrice,
            change24h: liveMarket.data.change24h,
            fearGreedScore: liveMarket.data.fearGreedScore,
            fearGreedLabel: liveMarket.data.fearGreedLabel
          }
        : {}),
      ...(isLiveScenario && liveTechnical?.ok
        ? {
            rsi: liveTechnical.data.rsi,
            macdStatus: liveTechnical.data.macdStatus,
            emaTrend: liveTechnical.data.emaTrend,
            atrVolatility: liveTechnical.data.atrVolatility
          }
        : {})
    };

    // The strategy output is always derived from the market values shown on
    // screen, so reasoning and rules can never contradict the snapshot.
    const strategy = deriveLiveStrategy(
      market,
      scenario.strategy.suggestedTimeframe,
      isLiveScenario && liveTechnical?.ok ? liveTechnical.data : null
    );

    return {
      ...scenario,
      market,
      strategy,
      backtest:
        isLiveScenario && liveBacktest?.ok ? liveBacktest.data : scenario.backtest
    };
  }, [isLiveScenario, liveBacktest, liveMarket, liveTechnical, scenario]);

  const loadMarketSnapshot = useCallback(async () => {
    setIsLoadingMarket(true);

    try {
      const response = await fetch("/api/market-snapshot", {
        cache: "no-store"
      });
      const payload = (await response.json()) as MarketSnapshotResponse;
      setLiveMarket(payload);
    } catch {
      setLiveMarket({
        ok: false,
        error: "Unable to reach local market snapshot route."
      });
    } finally {
      setIsLoadingMarket(false);
    }
  }, []);

  const loadTechnicalIndicators = useCallback(async (timeframe: "1H" | "4H") => {
    setIsLoadingTechnical(true);

    try {
      const response = await fetch(`/api/technical-indicators?timeframe=${timeframe}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as TechnicalIndicatorsResponse;
      setLiveTechnical(payload);
    } catch {
      setLiveTechnical({
        ok: false,
        error: "Unable to reach local technical indicators route."
      });
    } finally {
      setIsLoadingTechnical(false);
    }
  }, []);

  const loadBacktest = useCallback(async (timeframe: "1H" | "4H") => {
    setIsLoadingBacktest(true);

    try {
      const response = await fetch(`/api/backtest?timeframe=${timeframe}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as BacktestResponse;
      setLiveBacktest(payload);
    } catch {
      setLiveBacktest({
        ok: false,
        error: "Unable to reach local backtest route."
      });
    } finally {
      setIsLoadingBacktest(false);
    }
  }, []);

  useEffect(() => {
    void loadMarketSnapshot();
  }, [loadMarketSnapshot]);

  useEffect(() => {
    void loadTechnicalIndicators(scenario.strategy.suggestedTimeframe);
    void loadBacktest(scenario.strategy.suggestedTimeframe);
  }, [loadBacktest, loadTechnicalIndicators, scenario.strategy.suggestedTimeframe]);

  const regime = useMemo(() => classifyMarketRegime(displayScenario.market), [displayScenario]);
  const riskGuard = useMemo(
    () => buildRiskGuard(displayScenario.market, displayScenario.backtest),
    [displayScenario]
  );
  const finalScenario = useMemo(
    () => applyRiskGuardDecision(displayScenario, riskGuard),
    [displayScenario, riskGuard]
  );
  const strategySpecification = useMemo(
    () =>
      buildStrategySpecification({
        scenario: finalScenario,
        regime,
        riskGuard,
        technical: isLiveScenario && liveTechnical?.ok ? liveTechnical.data : null,
        usesLiveMarketData: isLiveScenario && liveMarket?.ok === true,
        usesLiveTechnicalData:
          isLiveScenario &&
          liveTechnical?.ok === true &&
          liveTechnical.data.source !== "local_fixture_candles",
        usesLiveBacktestData:
          isLiveScenario &&
          liveBacktest?.ok === true &&
          liveBacktest.data.source !== "local_fixture_candles",
        generatedAt:
          liveBacktest?.ok === true
            ? liveBacktest.data.fetchedAt
            : liveTechnical?.ok === true
              ? liveTechnical.data.fetchedAt
              : liveMarket?.ok === true
                ? liveMarket.data.fetchedAt
                : undefined
      }),
    [finalScenario, isLiveScenario, regime, riskGuard, liveBacktest, liveMarket, liveTechnical]
  );

  return (
    <main className="min-h-screen px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <Header />
        <DemoReadout
          marketStatus={liveMarket}
          technicalStatus={liveTechnical}
          backtestStatus={liveBacktest}
        />
        <ScenarioControls
          activeScenarioId={activeScenarioId}
          onSelectScenario={setActiveScenarioId}
          marketStatus={liveMarket}
          technicalStatus={liveTechnical}
          backtestStatus={liveBacktest}
          isLoadingMarket={isLoadingMarket}
          isLoadingTechnical={isLoadingTechnical}
          isLoadingBacktest={isLoadingBacktest}
          onRefreshData={() => {
            void loadMarketSnapshot();
            void loadTechnicalIndicators(scenario.strategy.suggestedTimeframe);
            void loadBacktest(scenario.strategy.suggestedTimeframe);
          }}
        />

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <MarketSnapshot
            scenario={displayScenario}
            marketStatus={isLiveScenario ? liveMarket : null}
            technicalStatus={isLiveScenario ? liveTechnical : null}
          />
          <StrategyOutput scenario={finalScenario} riskBlocked={riskGuard.status === "BLOCKED"} />
        </section>

        <RefusalNarrativePanel
          scenario={finalScenario}
          riskGuardStatus={riskGuard.status}
          blockedReasons={riskGuard.blockedReasons}
          regime={regime.regime}
        />

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <MarketRegimePanel regime={regime.regime} explanation={regime.explanation} />
          <RiskGuardPanel
            status={riskGuard.status}
            blockedReasons={riskGuard.blockedReasons}
            checks={riskGuard.checks}
          />
        </section>

        <BacktestPanel
          backtest={displayScenario.backtest}
          backtestStatus={isLiveScenario ? liveBacktest : null}
          isLoadingBacktest={isLiveScenario && isLoadingBacktest}
          isFixtureScenario={!isLiveScenario}
        />
        <StrategySpecificationPanel specification={strategySpecification} />
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="rounded-lg border border-white/10 bg-panel/80 p-5 shadow-premium backdrop-blur md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal text-white md:text-4xl">
            Sentinel Alpha Skill
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mist md:text-base">
            Risk-first AI strategy skill for BNB markets
          </p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-full border border-signal/35 bg-signal/10 px-4 py-2 text-sm font-semibold text-signal">
          <span className="h-2 w-2 rounded-full bg-signal shadow-[0_0_16px_rgba(79,209,197,0.8)]" />
          Simulation Mode
        </div>
      </div>
    </header>
  );
}

function DemoReadout({
  marketStatus,
  technicalStatus,
  backtestStatus
}: {
  marketStatus: MarketSnapshotResponse | null;
  technicalStatus: TechnicalIndicatorsResponse | null;
  backtestStatus: BacktestResponse | null;
}) {
  const hasFixtureIndicators =
    technicalStatus?.ok === true && technicalStatus.data.source === "local_fixture_candles";
  const hasFixtureBacktest =
    backtestStatus?.ok === true && backtestStatus.data.source === "local_fixture_candles";
  const items = [
    {
      label: "Track 2 fit",
      value: "Backtestable strategy spec",
      status: "Ready",
      detail: "Generates structured BUY / WAIT / EXIT strategy outputs for BNB markets."
    },
    {
      label: "CMC data",
      value: marketStatus?.ok ? "Live" : "Fallback",
      status: marketStatus?.ok ? "Ready" : "Fallback",
      detail: marketStatus?.ok
        ? "BNB quote and Fear & Greed are loaded from CoinMarketCap REST."
        : "Fixture data remains available if CMC is unavailable."
    },
    {
      label: "Indicators",
      value: technicalStatus?.ok ? (hasFixtureIndicators ? "Fixture candles" : "Live candles") : "Fallback",
      status: technicalStatus?.ok && !hasFixtureIndicators ? "Ready" : "Fallback",
      detail: technicalStatus?.ok
        ? hasFixtureIndicators
          ? "CMC quote is live; local candle fallback keeps indicators reproducible."
          : "RSI, MACD, EMA and ATR are calculated from candle data."
        : "Fixture indicators are used until candle data is available."
    },
    {
      label: "Backtest",
      value: backtestStatus?.ok ? (hasFixtureBacktest ? "Fixture candles" : "Live") : "Fallback",
      status: backtestStatus?.ok && !hasFixtureBacktest ? "Ready" : "Fallback",
      detail: backtestStatus?.ok
        ? hasFixtureBacktest
          ? "Backtest remains reproducible when hosted candle APIs are unavailable."
          : "Strategy result is compared with Buy & Hold over the same candles."
        : "Fixture backtest remains available if candles are unavailable."
    },
    {
      label: "Safety",
      value: "No execution",
      status: "Ready",
      detail: "No wallet, no live trading, no transaction signing, simulation only."
    }
  ];

  return (
    <section className="rounded-lg border border-white/10 bg-panel/80 p-5 shadow-premium backdrop-blur md:p-6">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Hackathon Demo Readout</h2>
          <p className="mt-2 text-sm leading-6 text-mist">
            Built for BNB Hack Track 2: Strategy Skills. Sentinel Alpha produces a
            testable strategy spec and rejects unsafe setups before any simulated entry.
          </p>
        </div>
        <div className="rounded-md border border-amber/35 bg-amber/10 px-4 py-2 text-sm font-semibold text-amber">
          No trade is also a valid strategy.
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="rounded-md border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-mist">
                {item.label}
              </p>
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  item.status === "Ready"
                    ? "border-signal/40 bg-signal/10 text-signal"
                    : "border-amber/40 bg-amber/10 text-amber"
                }`}
              >
                {item.status}
              </span>
            </div>
            <p className="mt-3 text-base font-semibold text-white">{item.value}</p>
            <p className="mt-2 text-xs leading-5 text-mist">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScenarioControls({
  activeScenarioId,
  onSelectScenario,
  marketStatus,
  technicalStatus,
  backtestStatus,
  isLoadingMarket,
  isLoadingTechnical,
  isLoadingBacktest,
  onRefreshData
}: {
  activeScenarioId: ScenarioId;
  onSelectScenario: (id: ScenarioId) => void;
  marketStatus: MarketSnapshotResponse | null;
  technicalStatus: TechnicalIndicatorsResponse | null;
  backtestStatus: BacktestResponse | null;
  isLoadingMarket: boolean;
  isLoadingTechnical: boolean;
  isLoadingBacktest: boolean;
  onRefreshData: () => void;
}) {
  const isRefreshing = isLoadingMarket || isLoadingTechnical || isLoadingBacktest;

  return (
    <section className="rounded-lg border border-white/10 bg-panel/75 p-3 backdrop-blur">
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <DataSourceBadge
          marketStatus={marketStatus}
          technicalStatus={technicalStatus}
          backtestStatus={backtestStatus}
          isLoadingMarket={isLoadingMarket}
          isLoadingTechnical={isLoadingTechnical}
          isLoadingBacktest={isLoadingBacktest}
        />
        <button
          type="button"
          onClick={onRefreshData}
          disabled={isRefreshing}
          className="w-full rounded-md border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
        >
          {isRefreshing ? "Refreshing data..." : "Refresh Live Data"}
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {scenarioOrder.map((scenarioId) => {
          const scenario = scenarios[scenarioId];
          const isActive = activeScenarioId === scenarioId;

          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => onSelectScenario(scenario.id)}
              className={`rounded-md border px-4 py-4 text-left transition ${
                isActive
                  ? "border-signal/70 bg-signal/12 text-white"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:bg-white/[0.06]"
              }`}
            >
              <span className="block text-sm font-semibold">{scenario.name}</span>
              <span className="mt-1 block text-xs leading-5 text-mist">{scenario.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DataSourceBadge({
  marketStatus,
  technicalStatus,
  backtestStatus,
  isLoadingMarket,
  isLoadingTechnical,
  isLoadingBacktest
}: {
  marketStatus: MarketSnapshotResponse | null;
  technicalStatus: TechnicalIndicatorsResponse | null;
  backtestStatus: BacktestResponse | null;
  isLoadingMarket: boolean;
  isLoadingTechnical: boolean;
  isLoadingBacktest: boolean;
}) {
  if (
    (isLoadingMarket && marketStatus === null) ||
    (isLoadingTechnical && technicalStatus === null) ||
    (isLoadingBacktest && backtestStatus === null)
  ) {
    return (
      <div className="rounded-md border border-amber/35 bg-amber/10 px-4 py-2 text-sm font-semibold text-amber">
        Loading live data...
      </div>
    );
  }

  if (marketStatus?.ok && technicalStatus?.ok && backtestStatus?.ok) {
    const candleSource =
      technicalStatus.data.source === "local_fixture_candles" ||
      backtestStatus.data.source === "local_fixture_candles"
        ? "fixture candle fallback"
        : "live indicators + live backtest";

    return (
      <div className="rounded-md border border-signal/35 bg-signal/10 px-4 py-2 text-sm font-semibold text-signal">
        Live CMC + {candleSource}
      </div>
    );
  }

  if (marketStatus?.ok) {
    return (
      <div className="rounded-md border border-signal/35 bg-signal/10 px-4 py-2 text-sm font-semibold text-signal">
        Live CMC quote + fixture indicators
      </div>
    );
  }

  return (
    <div className="rounded-md border border-amber/35 bg-amber/10 px-4 py-2 text-sm font-semibold text-amber">
      Fixture fallback mode
      {marketStatus?.ok === false ? `: ${marketStatus.error}` : ""}
    </div>
  );
}

function MarketSnapshot({
  scenario,
  marketStatus,
  technicalStatus
}: {
  scenario: Scenario;
  marketStatus: MarketSnapshotResponse | null;
  technicalStatus: TechnicalIndicatorsResponse | null;
}) {
  const { market } = scenario;
  const metrics = [
    { label: "Asset", value: market.asset },
    { label: "Current price", value: formatUsd(market.currentPrice) },
    {
      label: "24h change",
      value: formatPercent(market.change24h),
      tone: market.change24h >= 0 ? "positive" : "negative"
    },
    { label: "RSI", value: market.rsi.toString() },
    { label: "MACD status", value: market.macdStatus },
    { label: "EMA trend", value: market.emaTrend },
    { label: "ATR volatility", value: market.atrVolatility },
    {
      label: "Fear & Greed",
      value: `${market.fearGreedScore} - ${market.fearGreedLabel}`
    }
  ];

  const eyebrow = marketStatus?.ok
    ? `Live CMC, fetched ${new Date(marketStatus.data.fetchedAt).toLocaleTimeString()}`
    : scenario.shortName;

  return (
    <Card title="Market Snapshot" eyebrow={eyebrow}>
      <div className="grid gap-3 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-md border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mist">
              {metric.label}
            </p>
            <p className={`mt-2 text-lg font-semibold ${metric.tone === "negative" ? "text-danger" : metric.tone === "positive" ? "text-signal" : "text-white"}`}>
              {metric.value}
            </p>
          </div>
        ))}
      </div>
      {technicalStatus?.ok && (
        <div className="mt-4 rounded-md border border-signal/25 bg-signal/10 p-4 text-sm leading-6 text-slate-300">
          Indicators calculated from {technicalStatus.data.candleCount}{" "}
          {technicalStatus.data.timeframe} candles via{" "}
          <span className="font-semibold text-signal">
            {describeCandleSource(technicalStatus.data.source)}
          </span>
          . EMA20 {technicalStatus.data.ema20}, EMA50 {technicalStatus.data.ema50}, ATR{" "}
          {technicalStatus.data.atr}.
        </div>
      )}
      {technicalStatus?.ok === false && (
        <div className="mt-4 rounded-md border border-amber/35 bg-amber/10 p-4 text-sm leading-6 text-amber">
          Indicator fallback active: {technicalStatus.error}
        </div>
      )}
    </Card>
  );
}

function MarketRegimePanel({
  regime,
  explanation
}: {
  regime: MarketRegime;
  explanation: string;
}) {
  const regimeClass = {
    Bullish: "border-signal/45 bg-signal/10 text-signal",
    Bearish: "border-danger/45 bg-danger/10 text-danger",
    Sideways: "border-amber/45 bg-amber/10 text-amber",
    "High Risk": "border-danger/60 bg-danger/15 text-danger"
  }[regime];

  return (
    <Card title="Market Regime Panel">
      <div className={`inline-flex rounded-md border px-4 py-2 text-xl font-semibold ${regimeClass}`}>
        {regime}
      </div>
      <p className="mt-5 text-sm leading-6 text-slate-300">{explanation}</p>
    </Card>
  );
}

function StrategyOutput({
  scenario,
  riskBlocked
}: {
  scenario: Scenario;
  riskBlocked: boolean;
}) {
  const { strategy } = scenario;
  const decisionTone =
    strategy.decision === "BUY"
      ? "text-signal"
      : strategy.decision === "EXIT"
        ? "text-danger"
        : "text-amber";

  return (
    <Card title="AI Strategy Output" eyebrow="Backtestable strategy spec">
      <div className="grid gap-4 md:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-md border border-white/10 bg-ink/70 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mist">Decision</p>
          <p className={`mt-3 text-5xl font-bold ${decisionTone}`}>{strategy.decision}</p>
          <div className="mt-5 space-y-3 text-sm">
            <InfoLine label="Confidence" value={`${strategy.confidenceScore}/100`} />
            <InfoLine label="Timeframe" value={strategy.suggestedTimeframe} />
            <InfoLine label="Risk state" value={riskBlocked ? "Blocked" : "Approved"} />
          </div>
        </div>

        <div className="space-y-3">
          <RuleBlock label="Entry rule" value={strategy.entryRule} />
          <RuleBlock label="Exit rule" value={strategy.exitRule} />
          <RuleBlock label="Stop-loss rule" value={strategy.stopLossRule} />
          <RuleBlock label="Position sizing rule" value={strategy.positionSizingRule} />
        </div>
      </div>

      <div className="mt-5 rounded-md border border-white/10 bg-white/[0.035] p-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-mist">Reasoning</p>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
          {strategy.reasoning.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function RefusalNarrativePanel({
  scenario,
  riskGuardStatus,
  blockedReasons,
  regime
}: {
  scenario: Scenario;
  riskGuardStatus: "PASSED" | "BLOCKED";
  blockedReasons: string[];
  regime: MarketRegime;
}) {
  const blocked = riskGuardStatus === "BLOCKED";
  const title = blocked ? "Why The AI Refused" : "Why The AI Stayed Disciplined";
  const verdict = blocked ? "Unsafe setup rejected" : "Setup allowed by guardrails";
  const decisionClass = blocked ? "border-danger/45 bg-danger/10 text-danger" : "border-signal/40 bg-signal/10 text-signal";
  const narrative = blocked
    ? "Sentinel Alpha treats a blocked risk guard as stronger evidence than a tempting entry signal. The output becomes WAIT, allocation stays at 0%, and the rejected reasons are written into the strategy spec."
    : "Sentinel Alpha only allows a simulated BUY when trend, momentum, volatility, sentiment, and recent drawdown stay inside the risk envelope.";
  const reasons = blockedReasons.length > 0 ? blockedReasons.slice(0, 3) : scenario.strategy.reasoning.slice(0, 3);

  return (
    <Card title={title} eyebrow="Judge-facing decision narrative">
      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-md border border-white/10 bg-ink/70 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mist">Guard verdict</p>
          <div className={`mt-3 inline-flex rounded-md border px-4 py-2 text-xl font-semibold ${decisionClass}`}>
            {verdict}
          </div>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <InfoLine label="Decision" value={scenario.strategy.decision} />
            <InfoLine label="Regime" value={regime} />
            <InfoLine label="Allocation" value={blocked ? "0%" : "Risk-capped"} />
          </div>
        </div>

        <div className="rounded-md border border-white/10 bg-white/[0.035] p-5">
          <p className="text-sm leading-6 text-slate-300">{narrative}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {reasons.map((reason, index) => (
              <div key={`${reason}-${index}`} className="rounded-md border border-white/10 bg-ink/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mist">
                  Evidence {index + 1}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-200">{reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function RiskGuardPanel({
  status,
  checks,
  blockedReasons
}: {
  status: "PASSED" | "BLOCKED";
  checks: Array<{ label: string; status: GuardCheckStatus; detail: string }>;
  blockedReasons: string[];
}) {
  const blocked = status === "BLOCKED";

  return (
    <Card title="Risk Guard">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mist">Status</p>
          <p className={`mt-2 text-4xl font-bold ${blocked ? "text-danger" : "text-signal"}`}>
            {status}
          </p>
        </div>
        <div className="rounded-md border border-amber/35 bg-amber/10 px-4 py-3 text-sm font-semibold text-amber">
          No trade is also a valid strategy.
        </div>
      </div>

      {blockedReasons.length > 0 && (
        <div className="mt-5 rounded-md border border-danger/35 bg-danger/10 p-4">
          <p className="text-sm font-semibold text-danger">Blocked reasons</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            {blockedReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {checks.map((check) => (
          <div key={check.label} className="rounded-md border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">{check.label}</p>
              <StatusPill status={check.status} />
            </div>
            <p className="mt-2 text-sm leading-6 text-mist">{check.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function BacktestPanel({
  backtest,
  backtestStatus,
  isLoadingBacktest,
  isFixtureScenario
}: {
  backtest: BacktestResult;
  backtestStatus: BacktestResponse | null;
  isLoadingBacktest: boolean;
  isFixtureScenario: boolean;
}) {
  const metrics = [
    { label: "Simulated return", value: formatPercent(backtest.simulatedReturn), tone: backtest.simulatedReturn >= 0 ? "positive" : "negative" },
    { label: "Max drawdown", value: formatPercent(-Math.abs(backtest.maxDrawdown)), tone: "negative" },
    { label: "Win rate", value: `${backtest.winRate}%` },
    { label: "Number of trades", value: backtest.numberOfTrades.toString() },
    { label: "Buy & Hold comparison", value: formatPercent(backtest.buyHoldReturn), tone: backtest.buyHoldReturn >= 0 ? "positive" : "negative" }
  ];
  const liveBacktest = backtestStatus?.ok ? backtestStatus.data : null;

  return (
    <Card
      title={
        liveBacktest
          ? "Live Backtest Results"
          : isFixtureScenario
            ? "Backtest Results (Fixture Stress Test)"
            : "Backtest Results"
      }
      eyebrow={
        liveBacktest
          ? `${liveBacktest.timeframe} candles, ${liveBacktest.candleCount} samples`
          : isFixtureScenario
            ? "Deterministic fixture scenario for the rejection demo"
            : isLoadingBacktest
              ? "Loading live backtest..."
              : "Fixture fallback simulation"
      }
    >
      <div className="grid gap-3 md:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-md border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-mist">
              {metric.label}
            </p>
            <p className={`mt-2 text-xl font-semibold ${metric.tone === "negative" ? "text-danger" : metric.tone === "positive" ? "text-signal" : "text-white"}`}>
              {metric.value}
            </p>
          </div>
        ))}
      </div>
      <PlaceholderChart points={backtest.chartPoints} />
      {liveBacktest && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-mist">
              Candle source
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-200">
              {describeCandleSource(liveBacktest.source)}
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-mist">
              Exposure time
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-200">
              {liveBacktest.exposureTime}%
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-mist">
              Cost assumption
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-200">
              {liveBacktest.transactionCostPercent.toFixed(1)}% per trade side
            </p>
          </div>
        </div>
      )}
      {backtestStatus?.ok === false && (
        <div className="mt-4 rounded-md border border-amber/35 bg-amber/10 p-4 text-sm leading-6 text-amber">
          Backtest fallback active: {backtestStatus.error}
        </div>
      )}
    </Card>
  );
}

function StrategySpecificationPanel({
  specification
}: {
  specification: StrategySpecification;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const specJson = useMemo(() => JSON.stringify(specification, null, 2), [specification]);

  async function handleCopy() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(specJson);
      } else {
        copyWithTextareaFallback(specJson);
      }
      setCopyState("copied");
    } catch {
      try {
        copyWithTextareaFallback(specJson);
        setCopyState("copied");
      } catch {
        setCopyState("failed");
      }
    }

    window.setTimeout(() => setCopyState("idle"), 1800);
  }

  function handleDownload() {
    const blob = new Blob([specJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sentinel-alpha-${specification.decision.action.toLowerCase()}-${specification.decision.suggestedTimeframe.toLowerCase()}-spec.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card title="Strategy Specification JSON" eyebrow="Track 2 deliverable preview">
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mist">
            Spec summary
          </p>
          <div className="mt-4 space-y-3 text-sm">
            <InfoLine label="Mode" value="Simulation only" />
            <InfoLine label="Asset" value={specification.asset} />
            <InfoLine label="Decision" value={specification.decision.action} />
            <InfoLine label="Timeframe" value={specification.decision.suggestedTimeframe} />
            <InfoLine label="Risk guard" value={specification.riskGuard.status} />
            <InfoLine
              label="Data source"
              value={
                specification.dataSource.type === "coinmarketcap_rest_plus_live_indicators"
                  ? "CMC + live indicators"
                  : specification.dataSource.type ===
                    "coinmarketcap_rest_plus_live_indicators_and_backtest"
                  ? "CMC + live backtest"
                  : specification.dataSource.type === "coinmarketcap_rest_plus_fixture_indicators"
                  ? "CMC + fixtures"
                  : "Mock fixture"
              }
            />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md border border-signal/45 bg-signal/10 px-4 py-3 text-sm font-semibold text-signal transition hover:bg-signal/15"
            >
              {copyState === "copied"
                ? "Copied"
                : copyState === "failed"
                  ? "Copy failed"
                  : "Copy JSON"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-md border border-white/15 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Download JSON
            </button>
          </div>
        </div>

        <pre className="max-h-[28rem] overflow-auto rounded-md border border-white/10 bg-ink/80 p-4 text-xs leading-5 text-slate-300">
          <code>{specJson}</code>
        </pre>
      </div>
    </Card>
  );
}

function copyWithTextareaFallback(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function PlaceholderChart({ points }: { points: number[] }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(max - min, 1);

  return (
    <div className="mt-5 h-56 rounded-md border border-white/10 bg-ink/70 p-4">
      <div className="flex h-full items-end gap-2">
        {points.map((point, index) => {
          const height = 18 + ((point - min) / range) * 78;
          const isLast = index === points.length - 1;

          return (
            <div key={`${point}-${index}`} className="flex flex-1 items-end">
              <div
                className={`w-full rounded-t-sm ${isLast ? "bg-amber" : "bg-signal/75"}`}
                style={{ height: `${height}%` }}
                aria-label={`Equity point ${index + 1}: ${point}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Card({
  title,
  eyebrow,
  children
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-panel/80 p-5 shadow-premium backdrop-blur md:p-6">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {eyebrow && <p className="text-sm text-mist">{eyebrow}</p>}
      </div>
      {children}
    </section>
  );
}

function RuleBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-mist">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 last:border-0">
      <span className="text-mist">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function StatusPill({ status }: { status: GuardCheckStatus }) {
  const className = {
    Pass: "border-signal/40 bg-signal/10 text-signal",
    Warning: "border-amber/40 bg-amber/10 text-amber",
    Fail: "border-danger/40 bg-danger/10 text-danger"
  }[status];

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>
      {status}
    </span>
  );
}
