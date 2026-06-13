"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { scenarios } from "@/lib/fixtures";
import { riskCaseLibrary } from "@/lib/riskCases";
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
  RiskGuard,
  Scenario,
  ScenarioId,
  StrategySpecification,
  TechnicalIndicatorsResponse
} from "@/types/strategy";

const scenarioOrder: ScenarioId[] = ["conservative", "rejected"];

type HealthStatusResponse = {
  ok: boolean;
  checkedAt: string;
  environment: {
    cmcApiKeyConfigured: boolean;
  };
};

type MarketTickerItem = {
  symbol: string;
  price: number | null;
  change24h: number | null;
};

type MarketTickerResponse =
  | {
      ok: true;
      data: {
        source: "coinmarketcap_rest";
        fetchedAt: string;
        items: Array<{
          symbol: string;
          price: number;
          change24h: number;
        }>;
      };
    }
  | {
      ok: false;
      error: string;
    };

const FALLBACK_TICKER_ITEMS: MarketTickerItem[] = [
  "BTC",
  "ETH",
  "BNB",
  "SOL",
  "XRP",
  "ADA",
  "DOGE",
  "TON",
  "TRX",
  "AVAX"
].map((symbol) => ({ symbol, price: null, change24h: null }));

// Staged reveal: 1..5 sweep the guards one by one, then the verdict stamps in.
const REVEAL_GUARD_COUNT = 5;
const REVEAL_DECISION = REVEAL_GUARD_COUNT + 1;
const REVEAL_DONE = REVEAL_DECISION + 1;

export function SentinelDashboard() {
  const [activeScenarioId, setActiveScenarioId] = useState<ScenarioId>("conservative");
  const [liveMarket, setLiveMarket] = useState<MarketSnapshotResponse | null>(null);
  const [liveTechnical, setLiveTechnical] = useState<TechnicalIndicatorsResponse | null>(null);
  const [liveBacktest, setLiveBacktest] = useState<BacktestResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatusResponse | null>(null);
  const [marketTicker, setMarketTicker] = useState<MarketTickerResponse | null>(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [isLoadingTechnical, setIsLoadingTechnical] = useState(false);
  const [isLoadingBacktest, setIsLoadingBacktest] = useState(false);
  const scenario = scenarios[activeScenarioId];
  const isLiveScenario = activeScenarioId === "conservative";
  const isStressScenario = activeScenarioId === "rejected";
  const displayScenario = useMemo<Scenario>(() => {
    const market = {
      ...scenario.market,
      ...(liveMarket?.ok
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

  const loadHealthStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/health", {
        cache: "no-store"
      });
      const payload = (await response.json()) as HealthStatusResponse;
      setHealthStatus(payload);
    } catch {
      setHealthStatus(null);
    }
  }, []);

  const loadMarketTicker = useCallback(async () => {
    try {
      const response = await fetch("/api/market-ticker", {
        cache: "no-store"
      });
      const payload = (await response.json()) as MarketTickerResponse;
      setMarketTicker(payload);
    } catch {
      setMarketTicker({
        ok: false,
        error: "Unable to reach local market ticker route."
      });
    }
  }, []);

  useEffect(() => {
    void loadHealthStatus();
    void loadMarketSnapshot();
    void loadMarketTicker();
  }, [loadHealthStatus, loadMarketSnapshot, loadMarketTicker]);

  useEffect(() => {
    void loadTechnicalIndicators(scenario.strategy.suggestedTimeframe);
    void loadBacktest(scenario.strategy.suggestedTimeframe);
  }, [loadBacktest, loadTechnicalIndicators, scenario.strategy.suggestedTimeframe]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadMarketSnapshot();
    }, 180_000);
    return () => window.clearInterval(interval);
  }, [loadMarketSnapshot]);

  const [revealStage, setRevealStage] = useState(0);

  useEffect(() => {
    setRevealStage(0);
  }, [activeScenarioId]);

  useEffect(() => {
    if (revealStage >= REVEAL_DONE) {
      return;
    }

    const timer = window.setTimeout(
      () => setRevealStage((stage) => stage + 1),
      revealStage === 0 ? 500 : 380
    );
    return () => window.clearTimeout(timer);
  }, [revealStage]);

  const snapshotRef = useRef<HTMLElement | null>(null);
  const refusalRef = useRef<HTMLDivElement | null>(null);
  const specRef = useRef<HTMLDivElement | null>(null);
  const demoRunIdRef = useRef(0);
  const [demoCaption, setDemoCaption] = useState<string | null>(null);

  const stopJudgeDemo = useCallback(() => {
    demoRunIdRef.current += 1;
    setDemoCaption(null);
  }, []);

  const runJudgeDemo = useCallback(async () => {
    const runId = ++demoRunIdRef.current;
    const stillRunning = () => demoRunIdRef.current === runId;
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    window.scrollTo({ top: 0, behavior: "smooth" });
    setActiveScenarioId("conservative");
    setDemoCaption("1/5 · Live market analysis - BNB quote, sentiment, and indicators from real data");
    await wait(8000);
    if (!stillRunning()) return;

    setDemoCaption("2/5 · The strategy output - every rule cites the indicator values on screen");
    snapshotRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    await wait(8000);
    if (!stillRunning()) return;

    setDemoCaption("3/5 · Stress test - watch the five risk guards sweep an overheated market");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setActiveScenarioId("rejected");
    await wait(8000);
    if (!stillRunning()) return;

    setDemoCaption("4/5 · The refusal - blocked evidence is shown and allocation stays at 0%");
    refusalRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    await wait(8000);
    if (!stillRunning()) return;

    setDemoCaption("5/5 · The artifact - a backtested, exportable strategy specification");
    specRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    await wait(9000);
    if (!stillRunning()) return;

    setDemoCaption(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const regime = useMemo(() => classifyMarketRegime(displayScenario.market), [displayScenario]);
  const riskGuard = useMemo(
    () => buildRiskGuard(displayScenario.market, displayScenario.backtest),
    [displayScenario]
  );
  const finalScenario = useMemo(
    () => applyRiskGuardDecision(displayScenario, riskGuard),
    [displayScenario, riskGuard]
  );
  const specGeneratedAt =
    isLiveScenario && liveBacktest?.ok === true
      ? liveBacktest.data.fetchedAt
      : isLiveScenario && liveTechnical?.ok === true
        ? liveTechnical.data.fetchedAt
        : liveMarket?.ok === true
          ? liveMarket.data.fetchedAt
          : undefined;
  const strategySpecification = useMemo(
    () =>
      buildStrategySpecification({
        scenario: finalScenario,
        regime,
        riskGuard,
        technical: isLiveScenario && liveTechnical?.ok ? liveTechnical.data : null,
        usesLiveMarketData: liveMarket?.ok === true,
        usesLiveTechnicalData:
          isLiveScenario &&
          liveTechnical?.ok === true &&
          liveTechnical.data.source !== "local_fixture_candles",
        usesLiveBacktestData:
          isLiveScenario &&
          liveBacktest?.ok === true &&
          liveBacktest.data.source !== "local_fixture_candles",
        generatedAt: specGeneratedAt
      }),
    [
      finalScenario,
      isLiveScenario,
      liveBacktest,
      liveMarket,
      liveTechnical,
      regime,
      riskGuard,
      specGeneratedAt
    ]
  );

  return (
    <main className="min-h-screen px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <CommandCenter
          market={displayScenario.market}
          strategy={finalScenario.strategy}
          riskGuard={riskGuard}
          backtest={displayScenario.backtest}
          marketStatus={liveMarket}
          technicalStatus={liveTechnical}
          isLiveScenario={isLiveScenario}
          isStressScenario={isStressScenario}
          revealStage={revealStage}
          onRunJudgeDemo={() => void runJudgeDemo()}
          demoRunning={demoCaption !== null}
        />
        <MarketTape tickerStatus={marketTicker} />
        <ScenarioControls
          activeScenarioId={activeScenarioId}
          onSelectScenario={setActiveScenarioId}
          marketStatus={liveMarket}
          technicalStatus={liveTechnical}
          backtestStatus={liveBacktest}
          isLoadingMarket={isLoadingMarket}
          isLoadingTechnical={isLoadingTechnical}
          isLoadingBacktest={isLoadingBacktest}
          isStressScenario={isStressScenario}
          onRefreshData={() => {
            void loadMarketSnapshot();
            void loadTechnicalIndicators(scenario.strategy.suggestedTimeframe);
            void loadBacktest(scenario.strategy.suggestedTimeframe);
          }}
        />
        <CmcDataProof
          healthStatus={healthStatus}
          marketStatus={liveMarket}
          technicalStatus={liveTechnical}
          backtestStatus={liveBacktest}
        />

        <section
          ref={snapshotRef}
          className="grid scroll-mt-5 gap-5 xl:grid-cols-[1.05fr_0.95fr]"
        >
          <MarketSnapshot
            scenario={displayScenario}
            marketStatus={liveMarket}
            technicalStatus={isLiveScenario ? liveTechnical : null}
            isStressScenario={isStressScenario}
          />
          <StrategyOutput scenario={finalScenario} riskBlocked={riskGuard.status === "BLOCKED"} />
        </section>

        <div ref={refusalRef}>
          <RefusalNarrativePanel
            scenario={finalScenario}
            riskGuardStatus={riskGuard.status}
            blockedReasons={riskGuard.blockedReasons}
            regime={regime.regime}
          />
        </div>

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
        <div ref={specRef} className="scroll-mt-5">
          <StrategySpecificationPanel specification={strategySpecification} />
        </div>
        <DemoReadout
          marketStatus={liveMarket}
          technicalStatus={liveTechnical}
          backtestStatus={liveBacktest}
        />
        <RiskCaseLibrary />
        <WhyThisExists />
        <Footer />
      </div>

      {demoCaption && (
        <div className="fixed bottom-5 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 items-center gap-3 rounded-full border border-signal/40 bg-ink/95 px-5 py-3 shadow-premium backdrop-blur">
          <span className="h-2 w-2 shrink-0 animate-pulse-dot rounded-full bg-signal" />
          <p className="flex-1 text-sm font-medium text-slate-200">{demoCaption}</p>
          <button
            type="button"
            onClick={stopJudgeDemo}
            className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-mist transition hover:border-white/30 hover:text-white"
          >
            Stop
          </button>
        </div>
      )}
    </main>
  );
}

function Footer() {
  const links = [
    {
      label: "GitHub repository",
      href: "https://github.com/TONiE8668/sentinel-alpha-skill"
    },
    {
      label: "LLM Skill definition",
      href: "https://github.com/TONiE8668/sentinel-alpha-skill/blob/main/skill/sentinel-alpha/SKILL.md"
    },
    {
      label: "Spec JSON Schema",
      href: "https://github.com/TONiE8668/sentinel-alpha-skill/blob/main/skill/sentinel-alpha/strategy-spec.schema.json"
    },
    {
      label: "CoinMarketCap AI Agent Hub",
      href: "https://coinmarketcap.com/api/agent"
    }
  ];

  return (
    <footer className="terminal-panel px-5 py-6 md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-mist underline-offset-4 transition-colors hover:text-signal hover:underline"
            >
              {link.label} ↗
            </a>
          ))}
        </div>
        <p className="text-xs leading-5 text-mist/80">
          Open source · Powered by CoinMarketCap data
        </p>
      </div>
      <p className="mt-4 border-t border-white/[0.06] pt-4 text-xs leading-5 text-mist/70">
        Sentinel Alpha Skill runs in simulation mode only. It does not connect to a wallet,
        execute trades, or sign transactions, and its output is not financial advice.
      </p>
    </footer>
  );
}

function CommandCenter({
  market,
  strategy,
  riskGuard,
  backtest,
  marketStatus,
  technicalStatus,
  isLiveScenario,
  isStressScenario,
  revealStage,
  onRunJudgeDemo,
  demoRunning
}: {
  market: Scenario["market"];
  strategy: Scenario["strategy"];
  riskGuard: RiskGuard;
  backtest: BacktestResult;
  marketStatus: MarketSnapshotResponse | null;
  technicalStatus: TechnicalIndicatorsResponse | null;
  isLiveScenario: boolean;
  isStressScenario: boolean;
  revealStage: number;
  onRunJudgeDemo: () => void;
  demoRunning: boolean;
}) {
  const blocked = riskGuard.status === "BLOCKED";
  const decisionRevealed = revealStage >= REVEAL_DECISION;
  const decisionTone =
    strategy.decision === "BUY"
      ? "text-signal"
      : strategy.decision === "EXIT"
        ? "text-danger"
        : "text-amber";
  const allocationFull = strategy.decision === "BUY" && !blocked;
  const guardShortValues = [
    market.emaTrend.replace(" EMA stack", " stack"),
    `RSI ${market.rsi}`,
    `ATR ${market.atrVolatility}`,
    `F&G ${market.fearGreedScore}`,
    `DD ${Math.abs(backtest.maxDrawdown).toFixed(1)}%`
  ];
  const failedGuards = riskGuard.checks.filter((check) => check.status === "Fail").length;
  const candleSourceShort = isStressScenario
    ? "controlled stress inputs"
    : technicalStatus?.ok
    ? {
        cmc_ohlcv_historical: "CMC candles",
        binance_public_klines: "Binance candles",
        okx_public_candles: "OKX candles",
        kucoin_public_candles: "KuCoin candles",
        local_fixture_candles: "fixture candles"
      }[technicalStatus.data.source]
    : "loading candles";

  return (
    <header className="terminal-panel p-5 md:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-signal/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-amber/[0.07] blur-3xl"
      />

      <div className="relative mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
            <span className="text-white">Sentinel Alpha</span>{" "}
            <span className="text-signal/90">Skill</span>
          </h1>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-mist">
            BNB Hack · Track 2
          </span>
          <span className="flex items-center gap-2 rounded-full border border-signal/35 bg-signal/10 px-3 py-1 text-xs font-semibold text-signal">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal" />
            Simulation Mode
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-mist">
          <span
            className={`h-2 w-2 animate-pulse-dot rounded-full ${marketStatus?.ok ? "bg-signal shadow-[0_0_12px_rgba(79,209,197,0.9)]" : "bg-amber"}`}
          />
          {marketStatus?.ok ? (
            <span>
              live · CMC quote + {candleSourceShort} · updated{" "}
              <LiveTicker fetchedAt={marketStatus.data.fetchedAt} />
            </span>
          ) : (
            <span>{marketStatus === null ? "connecting to live data..." : "fixture fallback mode"}</span>
          )}
        </div>
      </div>

      <div className="relative grid gap-3 md:grid-cols-3">
        <div className="terminal-card terminal-card-strong p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mist">
              {market.asset}
            </p>
            <p className={`text-sm font-semibold ${market.change24h >= 0 ? "text-signal" : "text-danger"}`}>
              {formatPercent(market.change24h)} · 24h
            </p>
          </div>
          <p className="mt-2 font-display text-4xl font-bold tracking-tight text-white">
            {formatUsd(market.currentPrice)}
          </p>
          <PriceSparkline points={backtest.chartPoints} />
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-mist/80">
            Backtest equity · {isLiveScenario ? "live candles" : "controlled stress test"}
          </p>
        </div>

        <div className="terminal-card terminal-card-strong overflow-visible p-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mist">AI decision</p>
          {decisionRevealed ? (
            <>
              <div className="mt-2 flex items-center justify-between gap-3 overflow-visible">
                <div className="relative">
                  <p
                    className={`font-display text-4xl font-bold tracking-tight ${decisionTone} animate-fade-up`}
                  >
                    {strategy.decision}
                  </p>
                  {blocked && (
                    <span className="glow-pill glow-pill-danger absolute -right-4 -top-3 animate-stamp-in rounded border-2 border-danger px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.2em] text-danger">
                      Blocked
                    </span>
                  )}
                </div>
                <div className="shrink-0 overflow-visible">
                  <ConfidenceRing value={strategy.confidenceScore} decision={strategy.decision} />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-medium text-mist">
                  <span className="uppercase tracking-[0.14em]">Simulated allocation</span>
                  <span className={allocationFull ? "text-signal" : "text-slate-200"}>
                    {allocationFull ? "25% cap" : "0%"}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${allocationFull ? "bg-signal" : "bg-danger"}`}
                    style={{ width: allocationFull ? "100%" : "0%" }}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="animate-pulse font-display text-3xl font-bold tracking-tight text-amber">
                  Analyzing...
                </p>
                <div className="h-[76px] w-[76px] shrink-0 rounded-full border-4 border-white/10 border-t-amber/70 animate-spin" />
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-medium text-mist">
                  <span className="uppercase tracking-[0.14em]">Simulated allocation</span>
                  <span className="text-amber">pending guards</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-full animate-pulse rounded-full bg-amber/60" />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="terminal-card terminal-card-strong p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mist">Risk guards</p>
            {decisionRevealed ? (
              <span
                className={`glow-pill rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] ${blocked ? "glow-pill-danger border-danger/45 bg-danger/10 text-danger" : "glow-pill-signal border-signal/45 bg-signal/10 text-signal"} animate-fade-up`}
              >
                {blocked ? `${failedGuards} blocked` : "All passed"}
              </span>
            ) : (
              <span className="animate-pulse rounded-full border border-amber/40 bg-amber/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-amber">
                Scanning
              </span>
            )}
          </div>
          <div className="mt-3 space-y-2">
            {riskGuard.checks.map((check, index) => {
              const revealed = revealStage >= index + 1;
              const dotClass =
                check.status === "Fail"
                  ? "bg-danger shadow-[0_0_10px_rgba(255,107,107,0.8)]"
                  : check.status === "Warning"
                    ? "bg-amber"
                    : "bg-signal";
              const valueClass =
                check.status === "Fail"
                  ? "text-danger"
                  : check.status === "Warning"
                    ? "text-amber"
                    : "text-signal";

              return (
                <div key={check.label} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${revealed ? dotClass : "animate-pulse bg-white/25"}`}
                    />
                    {check.label}
                  </span>
                  {revealed ? (
                    <span className={`animate-guard-in font-semibold ${valueClass}`}>
                      {guardShortValues[index]}
                    </span>
                  ) : (
                    <span className="animate-pulse text-mist/60">scanning...</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="relative mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onRunJudgeDemo}
          disabled={demoRunning}
          className="walkthrough-cta rounded-md border px-5 py-2.5 text-sm font-semibold text-signal disabled:cursor-not-allowed disabled:opacity-60"
        >
          {demoRunning ? (
            "Walkthrough running..."
          ) : (
            <>
              <span className="play-icon" aria-hidden>
                ▶
              </span>
              <span>Run product walkthrough · 45s</span>
            </>
          )}
        </button>
        <p className="text-xs leading-5 text-mist">
          Auto-plays the full product flow: live analysis → risk-guard stress test → refusal →
          the exportable strategy spec. No wallet, no execution - the risk manager for AI trading.
        </p>
      </div>
    </header>
  );
}

function MarketTape({ tickerStatus }: { tickerStatus: MarketTickerResponse | null }) {
  const liveItems: MarketTickerItem[] =
    tickerStatus?.ok === true
      ? tickerStatus.data.items.map((item) => ({
          symbol: item.symbol,
          price: item.price,
          change24h: item.change24h
        }))
      : FALLBACK_TICKER_ITEMS;
  const sourceLabel =
    tickerStatus?.ok === true
      ? "CMC live market tape"
      : tickerStatus === null
        ? "Connecting market tape"
        : "Fallback market tape";
  const sourceDetail =
    tickerStatus?.ok === true
      ? `updated ${new Date(tickerStatus.data.fetchedAt).toLocaleTimeString()}`
      : tickerStatus === null
        ? "loading quotes"
        : "live quotes unavailable";
  const visibleItems = [...liveItems, ...liveItems];

  return (
    <section
      className="terminal-panel px-0 py-2"
      aria-label="Top crypto market tape"
      title={tickerStatus?.ok === false ? tickerStatus.error : undefined}
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0 px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-mist">
          <span className={tickerStatus?.ok === true ? "text-signal" : "text-amber"}>
            {sourceLabel}
          </span>
          <span className="ml-2 hidden font-semibold normal-case tracking-normal text-mist/80 sm:inline">
            {sourceDetail}
          </span>
        </div>
        <div className="market-tape min-w-0 flex-1 border-l border-white/10">
          <p className="sr-only">
            {sourceLabel}:{" "}
            {liveItems
              .map((item) => {
                const { change24h, price, symbol } = item;

                return price === null || change24h === null
                  ? `${symbol} unavailable`
                  : `${symbol} ${formatTickerPrice(price)} ${formatPercent(change24h)}`;
              })
              .join(", ")}
          </p>
          <div className="market-tape-track gap-7 py-1 pr-7" aria-hidden>
            {visibleItems.map((item, index) => {
              const { change24h, price, symbol } = item;

              if (price === null || change24h === null) {
                return (
                  <div
                    key={`${symbol}-${index}`}
                    className="flex shrink-0 items-baseline gap-2 text-xs"
                  >
                    <span className="font-bold text-slate-100">{symbol}</span>
                    <span className="font-medium text-mist">--</span>
                    <span className="font-semibold text-mist/70">24h --</span>
                  </div>
                );
              }

              const isUp = change24h >= 0;

              return (
                <div
                  key={`${symbol}-${index}`}
                  className="flex shrink-0 items-baseline gap-2 text-xs"
                >
                  <span className="font-bold text-slate-100">{symbol}</span>
                  <span className="font-medium text-mist">{formatTickerPrice(price)}</span>
                  <span
                    className={`font-semibold ${isUp ? "text-signal" : "text-danger"}`}
                  >
                    {formatPercent(change24h)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function formatTickerPrice(value: number) {
  if (value >= 1000) {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }

  if (value >= 1) {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
}

function LiveTicker({ fetchedAt }: { fetchedAt: string }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const seconds = Math.max(0, Math.round((Date.now() - new Date(fetchedAt).getTime()) / 1000));
  const text =
    seconds < 60 ? `${seconds}s ago` : `${Math.floor(seconds / 60)}m ${seconds % 60}s ago`;

  return <span className="font-semibold text-slate-200">{text}</span>;
}

function PriceSparkline({ points }: { points: number[] }) {
  if (points.length < 2) {
    return null;
  }

  const width = 240;
  const height = 48;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(max - min, 0.5);
  const toX = (index: number) => (index / (points.length - 1)) * width;
  const toY = (value: number) => 4 + (1 - (value - min) / range) * (height - 8);
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${toX(index).toFixed(1)} ${toY(point).toFixed(1)}`)
    .join(" ");
  const up = points[points.length - 1] >= points[0];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-3 h-12 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke={up ? "#4fd1c5" : "#ff8585"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function WhyThisExists() {
  const cards = [
    {
      eyebrow: "The problem",
      accent: "text-danger",
      border: "border-t-danger/60",
      title: "Every AI signal bot says BUY",
      body: "Crypto is flooded with AI tools engineered to always sound confident. Their reasoning can't be re-tested, and nothing in the loop is allowed to say no. Users don't blow up from missing buy signals - they blow up because no one blocks the bad ones."
    },
    {
      eyebrow: "The approach",
      accent: "text-signal",
      border: "border-t-signal/60",
      title: "A spec you can test, not a tip you must trust",
      body: "Sentinel Alpha turns CoinMarketCap market data into a backtestable strategy specification: explicit entry, exit, stop-loss, and sizing rules with the actual indicator values, plus a candle-based backtest against Buy & Hold. Anyone can verify it. Nobody has to trust it."
    },
    {
      eyebrow: "The differentiator",
      accent: "text-amber",
      border: "border-t-amber/60",
      title: "An AI with veto power over itself",
      body: "Five risk guards - trend, momentum, volatility, sentiment, and backtest drawdown - can override a tempting BUY into WAIT with 0% allocation, and the refusal reasons are written into the exported spec. It is the risk manager that professional desks have and retail never gets."
    }
  ];

  return (
    <section className="terminal-panel p-5 md:p-6">
      <h2 className="mb-5 font-display text-xl font-semibold tracking-tight text-white">
        Why This Exists
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.eyebrow} className={`terminal-card border-t-2 p-5 ${card.border}`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${card.accent}`}>
              {card.eyebrow}
            </p>
            <p className="mt-2 font-display text-base font-semibold text-white">{card.title}</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">{card.body}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-md border border-amber/30 bg-amber/[0.06] px-4 py-3 text-sm leading-6 text-slate-300">
        <span className="font-semibold text-amber">Try it live below:</span> when a setup looks
        tempting but one or more risk guards fail, a naive bot may still chase - Sentinel Alpha
        refuses, shows its evidence, and records the refusal in the strategy spec.
      </p>
    </section>
  );
}

function CmcDataProof({
  healthStatus,
  marketStatus,
  technicalStatus,
  backtestStatus
}: {
  healthStatus: HealthStatusResponse | null;
  marketStatus: MarketSnapshotResponse | null;
  technicalStatus: TechnicalIndicatorsResponse | null;
  backtestStatus: BacktestResponse | null;
}) {
  const technicalSource = technicalStatus?.ok ? technicalStatus.data.source : null;
  const backtestSource = backtestStatus?.ok ? backtestStatus.data.source : null;
  const cmcOhlcvActive =
    technicalSource === "cmc_ohlcv_historical" && backtestSource === "cmc_ohlcv_historical";
  const proofItems = [
    {
      label: "CMC API key",
      value: healthStatus?.environment.cmcApiKeyConfigured ? "Configured" : "Not detected",
      status: healthStatus?.environment.cmcApiKeyConfigured ? "Ready" : "Needs key",
      detail:
        "Checked server-side only; the API key is never exposed to the browser."
    },
    {
      label: "Quote + sentiment",
      value: marketStatus?.ok ? "CoinMarketCap REST" : "Unavailable",
      status: marketStatus?.ok ? "Live" : "Fallback",
      detail: marketStatus?.ok
        ? `BNB quote and Fear & Greed fetched ${new Date(marketStatus.data.fetchedAt).toLocaleTimeString()}.`
        : marketStatus?.ok === false
          ? marketStatus.error
          : "Waiting for CMC market snapshot."
    },
    {
      label: "Indicator candles",
      value: technicalStatus?.ok ? describeCandleSource(technicalStatus.data.source) : "Unavailable",
      status: cmcOhlcvActive ? "CMC OHLCV" : technicalStatus?.ok ? "Labeled source" : "Fallback",
      detail: technicalStatus?.ok
        ? `${technicalStatus.data.candleCount} ${technicalStatus.data.timeframe} candles. ${technicalStatus.data.note}`
        : technicalStatus?.ok === false
          ? technicalStatus.error
          : "Waiting for candle source."
    },
    {
      label: "Backtest source",
      value: backtestStatus?.ok ? describeCandleSource(backtestStatus.data.source) : "Unavailable",
      status: cmcOhlcvActive ? "CMC OHLCV" : backtestStatus?.ok ? "Labeled source" : "Fallback",
      detail: backtestStatus?.ok
        ? `${backtestStatus.data.candleCount} candles, ${backtestStatus.data.transactionCostPercent.toFixed(1)}% cost per side.`
        : backtestStatus?.ok === false
          ? backtestStatus.error
          : "Waiting for backtest."
    }
  ];

  return (
    <Card title="CMC Data Proof" eyebrow="Judge-facing source audit" step="Data provenance">
      <div className="grid gap-3 lg:grid-cols-4">
        {proofItems.map((item) => (
          <div key={item.label} className="terminal-card p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <p className="min-w-0 text-xs font-medium uppercase tracking-[0.14em] text-mist">
                {item.label}
              </p>
              <ProofPill value={item.status} />
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{item.value}</p>
            <p className="mt-2 text-xs leading-5 text-mist">{item.detail}</p>
          </div>
        ))}
      </div>
      {!cmcOhlcvActive && (
        <div className="mt-4 rounded-md border border-amber/35 bg-amber/10 p-4 text-sm leading-6 text-amber">
          CMC quote and Fear &amp; Greed are live. CMC OHLCV becomes the primary candle
          source automatically when the API plan allows historical candles; until then,
          candle sources are labeled and carried into the exported strategy spec.
        </div>
      )}
    </Card>
  );
}

function RiskCaseLibrary() {
  return (
    <Card
      title="Risk Guard Case Library"
      eyebrow="Replay evidence for judge review"
      step="Strategy evidence"
    >
      <div className="grid gap-3 lg:grid-cols-3">
        {riskCaseLibrary.map((riskCase) => (
          <div key={riskCase.id} className="terminal-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal/80">
                  {riskCase.regime}
                </p>
                <h3 className="mt-1 text-base font-semibold text-white">{riskCase.title}</h3>
              </div>
              <CaseDecisionBadge decision={riskCase.decision} status={riskCase.guardStatus} />
            </div>
            <p className="mt-3 text-sm leading-6 text-mist">{riskCase.marketCondition}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <InfoLine label="Strategy" value={formatPercent(riskCase.simulatedReturn)} />
              <InfoLine label="Buy & Hold" value={formatPercent(riskCase.buyHoldReturn)} />
              <InfoLine label="Max DD" value={formatPercent(-Math.abs(riskCase.maxDrawdown))} />
              <InfoLine label="DD saved" value={formatPercent(riskCase.drawdownSaved)} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {riskCase.checks.map((check) => (
                <span
                  key={`${riskCase.id}-${check.label}`}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    check.status === "Fail"
                      ? "border-danger/40 bg-danger/10 text-danger"
                      : check.status === "Warning"
                        ? "border-amber/40 bg-amber/10 text-amber"
                        : "border-signal/35 bg-signal/10 text-signal"
                  }`}
                >
                  {check.label}: {check.status}
                </span>
              ))}
            </div>
            <p className="terminal-card terminal-card-strong mt-4 p-3 text-xs leading-5 text-slate-300">
              {riskCase.takeaway}
            </p>
          </div>
        ))}
      </div>
      <div className="terminal-card terminal-card-strong mt-4 p-4 text-sm leading-6 text-mist">
        Case library entries are controlled replay cases used to demonstrate the guard logic
        across bullish, sideways, and high-risk regimes. Live CMC market context remains visible
        separately in the CMC Data Proof and Strategy Specification JSON panels.
      </div>
    </Card>
  );
}

function ProofPill({ value }: { value: string }) {
  const isReady = value === "Ready" || value === "Live" || value === "CMC OHLCV";
  const isLabeledSource = value === "Labeled source";
  return (
    <span
      className={`glow-pill shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        isReady
          ? "glow-pill-signal border-signal/40 bg-signal/10 text-signal"
          : isLabeledSource
            ? "glow-pill-amber border-amber/40 bg-amber/10 text-amber"
            : "border-amber/40 bg-amber/10 text-amber"
      }`}
    >
      {value}
    </span>
  );
}

function CaseDecisionBadge({
  decision,
  status
}: {
  decision: "BUY" | "WAIT" | "EXIT";
  status: "PASSED" | "BLOCKED";
}) {
  const blocked = status === "BLOCKED";
  return (
    <span
      className={`glow-pill whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${
        blocked
          ? "glow-pill-danger border-danger/45 bg-danger/10 text-danger"
          : decision === "BUY"
            ? "glow-pill-signal border-signal/40 bg-signal/10 text-signal"
            : "glow-pill-amber border-amber/40 bg-amber/10 text-amber"
      }`}
    >
      {decision} · {status}
    </span>
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
      label: "Strategy output",
      value: "Backtestable spec",
      status: "Ready",
      detail: "Structured BUY / WAIT / EXIT decisions with entry, exit, stop, and sizing rules."
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
    <section className="terminal-panel p-5 md:p-6">
      <h2 className="mb-5 font-display text-xl font-semibold tracking-tight text-white">
        Live System Status
      </h2>

      <div className="grid gap-3 md:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="terminal-card p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <p className="min-w-0 text-xs font-medium uppercase tracking-[0.14em] text-mist">
                {item.label}
              </p>
              <ProofPill value={item.status} />
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
  isStressScenario,
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
  isStressScenario: boolean;
  onRefreshData: () => void;
}) {
  const isRefreshing = isLoadingMarket || isLoadingTechnical || isLoadingBacktest;

  return (
    <section className="terminal-panel p-3">
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <DataSourceBadge
          marketStatus={marketStatus}
          technicalStatus={technicalStatus}
          backtestStatus={backtestStatus}
          isLoadingMarket={isLoadingMarket}
          isLoadingTechnical={isLoadingTechnical}
          isLoadingBacktest={isLoadingBacktest}
          isStressScenario={isStressScenario}
        />
        <button
          type="button"
          onClick={onRefreshData}
          disabled={isRefreshing}
          className="w-full rounded-md border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition hover:border-signal/35 hover:bg-signal/[0.08] hover:text-signal disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
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
              className={`scenario-card border px-4 py-4 text-left ${
                isActive
                  ? "active-scenario-card bg-signal/[0.12] text-white"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-signal/35 hover:bg-white/[0.06]"
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
  isLoadingBacktest,
  isStressScenario
}: {
  marketStatus: MarketSnapshotResponse | null;
  technicalStatus: TechnicalIndicatorsResponse | null;
  backtestStatus: BacktestResponse | null;
  isLoadingMarket: boolean;
  isLoadingTechnical: boolean;
  isLoadingBacktest: boolean;
  isStressScenario: boolean;
}) {
  if (
    (isLoadingMarket && marketStatus === null) ||
    (isLoadingTechnical && technicalStatus === null) ||
    (isLoadingBacktest && backtestStatus === null)
  ) {
    return (
      <div className="glow-pill glow-pill-amber rounded-md border border-amber/35 bg-amber/10 px-4 py-2 text-sm font-semibold text-amber">
        Loading live data...
      </div>
    );
  }

  if (isStressScenario) {
    return (
      <div className="glow-pill glow-pill-amber rounded-md border border-amber/35 bg-amber/10 px-4 py-2 text-sm font-semibold text-amber">
        {marketStatus?.ok ? "Live CMC + controlled stress inputs" : "Controlled stress fallback"}
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
      <div className="glow-pill glow-pill-signal rounded-md border border-signal/35 bg-signal/10 px-4 py-2 text-sm font-semibold text-signal">
        Live CMC + {candleSource}
      </div>
    );
  }

  if (marketStatus?.ok) {
    return (
      <div className="glow-pill glow-pill-signal rounded-md border border-signal/35 bg-signal/10 px-4 py-2 text-sm font-semibold text-signal">
        Live CMC quote + fixture indicators
      </div>
    );
  }

  return (
    <div className="glow-pill glow-pill-amber rounded-md border border-amber/35 bg-amber/10 px-4 py-2 text-sm font-semibold text-amber">
      Fixture fallback mode
      {marketStatus?.ok === false ? `: ${marketStatus.error}` : ""}
    </div>
  );
}

function MarketSnapshot({
  scenario,
  marketStatus,
  technicalStatus,
  isStressScenario
}: {
  scenario: Scenario;
  marketStatus: MarketSnapshotResponse | null;
  technicalStatus: TechnicalIndicatorsResponse | null;
  isStressScenario: boolean;
}) {
  const { market } = scenario;
  const metrics: Array<{
    label: string;
    value: string;
    tone?: "positive" | "negative";
    meter?: { percent: number; kind: "rsi" | "sentiment" };
  }> = [
    { label: "Asset", value: market.asset },
    { label: "Current price", value: formatUsd(market.currentPrice) },
    {
      label: "24h change",
      value: formatPercent(market.change24h),
      tone: market.change24h >= 0 ? "positive" : "negative"
    },
    {
      label: isStressScenario ? "RSI stress input" : "RSI",
      value: market.rsi.toString(),
      meter: { percent: market.rsi, kind: "rsi" }
    },
    { label: isStressScenario ? "MACD stress input" : "MACD status", value: market.macdStatus },
    { label: isStressScenario ? "EMA stress input" : "EMA trend", value: market.emaTrend },
    { label: isStressScenario ? "ATR stress input" : "ATR volatility", value: market.atrVolatility },
    {
      label: "Fear & Greed",
      value: `${market.fearGreedScore} - ${market.fearGreedLabel}`,
      meter: { percent: market.fearGreedScore, kind: "sentiment" }
    }
  ];

  const eyebrow = marketStatus?.ok
    ? `Live CMC, fetched ${new Date(marketStatus.data.fetchedAt).toLocaleTimeString()}`
    : scenario.shortName;

  return (
    <Card title="Market Snapshot" eyebrow={eyebrow} step="Step 01 · Market evidence">
      {isStressScenario && (
        <div className="mb-4 rounded-md border border-amber/35 bg-amber/10 px-4 py-2.5 text-xs font-semibold leading-5 text-amber">
          Stress test mode: price, 24h change, and Fear &amp; Greed use live CMC data
          when available. RSI, MACD, EMA trend, ATR, and backtest are controlled stress
          inputs designed to prove the risk guard can refuse unsafe setups.
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="terminal-card p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mist">
              {metric.label}
            </p>
            <p className={`mt-2 text-lg font-semibold ${metric.tone === "negative" ? "text-danger" : metric.tone === "positive" ? "text-signal" : "text-white"}`}>
              {metric.value}
            </p>
            {metric.meter && <MeterBar percent={metric.meter.percent} kind={metric.meter.kind} />}
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
    <Card title="Market Regime">
      <div className={`glow-pill inline-flex rounded-md border px-4 py-2 text-xl font-semibold ${regimeClass}`}>
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
  const decisionGlow =
    strategy.decision === "BUY"
      ? "0 0 32px rgba(79,209,197,0.45)"
      : strategy.decision === "EXIT"
        ? "0 0 32px rgba(255,107,107,0.45)"
        : "0 0 32px rgba(246,196,83,0.4)";

  return (
    <Card title="AI Strategy Output" eyebrow="Backtestable strategy spec" step="Step 02 · The decision">
      <div className="grid gap-4 md:grid-cols-[minmax(19rem,0.82fr)_minmax(0,1.18fr)]">
        <div className="terminal-card terminal-card-strong overflow-visible p-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mist">Decision</p>
          <div className="mt-3 flex min-w-0 items-center justify-between gap-5 overflow-visible">
            <p
              className={`min-w-0 font-display text-5xl font-bold leading-none tracking-tight ${decisionTone}`}
              style={{ textShadow: decisionGlow }}
            >
              {strategy.decision}
            </p>
            <div className="shrink-0 overflow-visible">
              <ConfidenceRing value={strategy.confidenceScore} decision={strategy.decision} />
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm">
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

      <div className="terminal-card mt-5 p-4">
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
    <Card title={title} eyebrow="Decision narrative" step="Step 03 · The refusal">
      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="terminal-card terminal-card-strong p-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mist">Guard verdict</p>
          <div className={`glow-pill mt-3 inline-flex rounded-md border px-4 py-2 text-xl font-semibold ${blocked ? "glow-pill-danger" : "glow-pill-signal"} ${decisionClass}`}>
            {verdict}
          </div>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <InfoLine label="Decision" value={scenario.strategy.decision} />
            <InfoLine label="Regime" value={regime} />
            <InfoLine label="Allocation" value={blocked ? "0%" : "Risk-capped"} />
          </div>
        </div>

        <div className="terminal-card p-5">
          <p className="text-sm leading-6 text-slate-300">{narrative}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {reasons.map((reason, index) => (
              <div key={`${reason}-${index}`} className="terminal-card terminal-card-strong p-4">
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
    <Card title="Risk Guard" step="Step 04 · Guard detail">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mist">Status</p>
          <p
            className={`mt-2 font-display text-4xl font-bold tracking-tight ${blocked ? "glow-pill-danger text-danger" : "glow-pill-signal text-signal"}`}
            style={{
              textShadow: blocked
                ? "0 0 30px rgba(255,107,107,0.45)"
                : "0 0 30px rgba(79,209,197,0.45)"
            }}
          >
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
          <div
            key={check.label}
            className={`terminal-card p-4 ${
              check.status === "Fail"
                ? "border-danger/45 bg-danger/[0.08]"
                : check.status === "Warning"
                  ? "border-amber/35 bg-amber/[0.05]"
                  : "border-white/10 bg-white/[0.035]"
            }`}
          >
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
  const metrics: Array<{
    label: string;
    value: number;
    format: (value: number) => string;
    tone?: "positive" | "negative";
  }> = [
    {
      label: "Simulated return",
      value: backtest.simulatedReturn,
      format: formatPercent,
      tone: backtest.simulatedReturn >= 0 ? "positive" : "negative"
    },
    {
      label: "Max drawdown",
      value: -Math.abs(backtest.maxDrawdown),
      format: formatPercent,
      tone: "negative"
    },
    { label: "Win rate", value: backtest.winRate, format: (value) => `${Math.round(value)}%` },
    {
      label: "Number of trades",
      value: backtest.numberOfTrades,
      format: (value) => Math.round(value).toString()
    },
    {
      label: "Buy & Hold comparison",
      value: backtest.buyHoldReturn,
      format: formatPercent,
      tone: backtest.buyHoldReturn >= 0 ? "positive" : "negative"
    }
  ];
  const liveBacktest = backtestStatus?.ok ? backtestStatus.data : null;

  return (
    <Card
      step="Step 05 · Backtest proof"
      title={
        liveBacktest
          ? "Live Backtest Results"
          : isFixtureScenario
            ? "Backtest Results (Controlled Stress Test)"
            : "Backtest Results"
      }
      eyebrow={
        liveBacktest
          ? `${liveBacktest.timeframe} candles, ${liveBacktest.candleCount} samples`
          : isFixtureScenario
            ? "Controlled stress inputs for risk-guard rejection"
            : isLoadingBacktest
              ? "Loading live backtest..."
              : "Fixture fallback simulation"
      }
    >
      <div className="grid gap-3 md:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className="terminal-card p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-mist">
              {metric.label}
            </p>
            <p className={`mt-2 font-display text-2xl font-bold tracking-tight ${metric.tone === "negative" ? "text-danger" : metric.tone === "positive" ? "text-signal" : "text-white"}`}>
              <CountUp value={metric.value} format={metric.format} />
            </p>
          </div>
        ))}
      </div>
      <PlaceholderChart points={backtest.chartPoints} />
      {liveBacktest && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="terminal-card p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-mist">
              Candle source
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-200">
              {describeCandleSource(liveBacktest.source)}
            </p>
          </div>
          <div className="terminal-card p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-mist">
              Exposure time
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-200">
              {liveBacktest.exposureTime}%
            </p>
          </div>
          <div className="terminal-card p-4">
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
    <Card title="Strategy Specification JSON" eyebrow="Machine-readable strategy artifact" step="Step 06 · The artifact">
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="terminal-card p-4">
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
                  ? specification.scenario.includes("Risk Guard Stress Test")
                    ? "CMC + stress inputs"
                    : "CMC + fixtures"
                  : specification.dataSource.type ===
                      "fixture_market_plus_live_indicators_and_backtest"
                    ? "Fixture market + live backtest"
                    : specification.dataSource.type === "fixture_market_plus_live_indicators"
                      ? "Fixture market + live indicators"
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

        <pre className="terminal-card terminal-card-strong max-h-[28rem] overflow-auto p-4 text-xs leading-5 text-slate-300">
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
  const width = 720;
  const height = 220;
  const padX = 14;
  const padY = 22;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(max - min, 0.5);
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const toX = (index: number) =>
    padX + (points.length > 1 ? (index / (points.length - 1)) * innerW : innerW / 2);
  const toY = (value: number) => padY + (1 - (value - min) / range) * innerH;

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${toX(index).toFixed(1)} ${toY(point).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${toX(points.length - 1).toFixed(1)} ${height - padY} L ${toX(0).toFixed(1)} ${height - padY} Z`;

  const start = points[0];
  const end = points[points.length - 1];
  const up = end >= start;
  const startY = toY(start);
  const endX = toX(points.length - 1);
  const endY = toY(end);
  const stroke = up ? "#4fd1c5" : "#ff8585";
  const gradientId = up ? "equityFillUp" : "equityFillDown";

  return (
    <div className="terminal-card terminal-card-strong relative mt-5 p-3">
      <div className="absolute left-4 top-3 z-10 text-[11px] font-semibold uppercase tracking-[0.16em] text-mist">
        Equity curve · 100 = starting capital
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Equity curve from ${start} to ${end}`}
      >
        <defs>
          <linearGradient id="equityFillUp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4fd1c5" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#4fd1c5" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="equityFillDown" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff8585" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#ff8585" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1={padX}
            x2={width - padX}
            y1={padY + innerH * fraction}
            y2={padY + innerH * fraction}
            stroke="rgba(148,163,184,0.1)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <line
          x1={padX}
          x2={width - padX}
          y1={startY}
          y2={startY}
          stroke="rgba(246,196,83,0.5)"
          strokeWidth="1"
          strokeDasharray="5 5"
          vectorEffect="non-scaling-stroke"
        />

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          strokeDasharray="1200"
          className="animate-draw-line"
        />

        <circle cx={endX} cy={endY} r="9" fill={stroke} opacity="0.2" />
        <circle cx={endX} cy={endY} r="4" fill={stroke} />
      </svg>
      <div className="absolute bottom-3 right-4 z-10 rounded border border-white/10 bg-ink/85 px-2.5 py-1 text-xs font-semibold text-white">
        {end.toFixed(1)}{" "}
        <span className={up ? "text-signal" : "text-danger"}>
          ({up ? "+" : ""}
          {(end - start).toFixed(1)})
        </span>
      </div>
    </div>
  );
}

function Card({
  title,
  eyebrow,
  step,
  children
}: {
  title: string;
  eyebrow?: string;
  step?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="terminal-panel p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {step && (
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-signal/80">
              {step}
            </p>
          )}
          <h2 className="font-display text-xl font-semibold tracking-tight text-white">{title}</h2>
        </div>
        {eyebrow && <p className="max-w-xl text-sm leading-5 text-mist sm:text-right">{eyebrow}</p>}
      </div>
      {children}
    </section>
  );
}

function MeterBar({ percent, kind }: { percent: number; kind: "rsi" | "sentiment" }) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  const gradient =
    kind === "rsi"
      ? "bg-gradient-to-r from-signal/80 via-amber/80 to-danger/80"
      : "bg-gradient-to-r from-danger/80 via-amber/80 to-signal/80";

  return (
    <div className="relative mt-3" aria-hidden>
      <div className={`h-1.5 rounded-full ${gradient} opacity-80`} />
      {kind === "rsi" && (
        <>
          <span className="absolute -top-0.5 left-[30%] h-2.5 w-px bg-white/40" />
          <span className="absolute -top-0.5 left-[70%] h-2.5 w-px bg-white/40" />
        </>
      )}
      <span
        className="absolute -top-[3px] h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-ink shadow-[0_0_10px_rgba(255,255,255,0.45)]"
        style={{ left: `${clamped}%` }}
      />
    </div>
  );
}

function ConfidenceRing({
  value,
  decision
}: {
  value: number;
  decision: "BUY" | "WAIT" | "EXIT";
}) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(value, 0), 100) / 100;
  const stroke =
    decision === "BUY" ? "#4fd1c5" : decision === "EXIT" ? "#ff6b6b" : "#f6c453";

  return (
    <div className="relative h-20 w-20 shrink-0 overflow-visible" aria-label={`Confidence ${value} of 100`}>
      <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90 overflow-visible">
        <circle cx="38" cy="38" r={radius} fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="6" />
        <circle
          cx="38"
          cy="38"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg font-bold text-white">{value}</span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-mist">conf</span>
      </div>
    </div>
  );
}

function RuleBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="terminal-card p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-mist">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{value}</p>
    </div>
  );
}

function CountUp({ value, format }: { value: number; format: (value: number) => string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    let frame = 0;

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(value * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{format(display)}</>;
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
    Pass: "glow-pill-signal border-signal/40 bg-signal/10 text-signal",
    Warning: "glow-pill-amber border-amber/40 bg-amber/10 text-amber",
    Fail: "glow-pill-danger border-danger/40 bg-danger/10 text-danger"
  }[status];
  const icon = { Pass: "✓", Warning: "!", Fail: "✕" }[status];

  return (
    <span
      className={`glow-pill inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
    >
      <span aria-hidden>{icon}</span>
      {status}
    </span>
  );
}
