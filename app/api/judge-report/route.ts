import { NextResponse } from "next/server";
import { riskCaseLibrary } from "@/lib/riskCases";
import { buildJudgeReadyStrategySpec } from "@/lib/strategySpecService";

export const dynamic = "force-dynamic";

export async function GET() {
  const [live, stress] = await Promise.all([
    buildJudgeReadyStrategySpec({ mode: "live", timeframe: "4H" }),
    buildJudgeReadyStrategySpec({ mode: "stress", timeframe: "1H" })
  ]);
  const cmcApiKeyConfigured = Boolean(
    process.env.CMC_API_KEY &&
      process.env.CMC_API_KEY !== "replace_with_your_coinmarketcap_api_key"
  );
  const liveUsesCmcOhlcv = live.provenance.indicators === "cmc_ohlcv_historical";

  return NextResponse.json({
    ok: live.validation.valid && stress.validation.valid,
    generatedAt: new Date().toISOString(),
    project: {
      name: "Sentinel Alpha Skill",
      track: "BNB Hack: AI Trading Agent Edition - Track 2: Strategy Skills",
      pitch:
        "Risk-first CMC Skill that turns BNB market data into a validated, backtestable strategy spec and refuses unsafe simulated entries."
    },
    links: {
      dashboard: "/",
      liveStrategySpec: "/api/strategy-spec?mode=live&timeframe=4H",
      stressStrategySpec: "/api/strategy-spec?mode=stress&timeframe=1H",
      schema: "/strategy-spec.schema.json",
      repository: "https://github.com/TONiE8668/sentinel-alpha-skill",
      skillDefinition:
        "https://github.com/TONiE8668/sentinel-alpha-skill/blob/main/skill/sentinel-alpha/SKILL.md"
    },
    dataProof: {
      cmcApiKeyConfigured,
      marketData: live.provenance.marketData,
      indicators: live.provenance.indicators,
      backtest: live.provenance.backtest,
      cmcOhlcvActive: liveUsesCmcOhlcv,
      note: liveUsesCmcOhlcv
        ? "CMC OHLCV is active for indicators and backtest."
        : "CMC quote and Fear & Greed are active. Candle calculations are transparently using the best available labeled candle source until CMC OHLCV is enabled for the key."
    },
    artifacts: {
      live: {
        validation: live.validation,
        decision: live.spec.decision,
        riskGuard: live.spec.riskGuard.status,
        dataSource: live.spec.dataSource,
        backtestSummary: live.spec.backtestSummary
      },
      stress: {
        validation: stress.validation,
        decision: stress.spec.decision,
        riskGuard: stress.spec.riskGuard.status,
        blockedReasons: stress.spec.riskGuard.blockedReasons,
        dataSource: stress.spec.dataSource,
        backtestSummary: stress.spec.backtestSummary
      }
    },
    riskCaseLibrary: riskCaseLibrary.map((riskCase) => ({
      id: riskCase.id,
      title: riskCase.title,
      regime: riskCase.regime,
      source: riskCase.source,
      decision: riskCase.decision,
      guardStatus: riskCase.guardStatus,
      simulatedReturn: riskCase.simulatedReturn,
      buyHoldReturn: riskCase.buyHoldReturn,
      maxDrawdown: riskCase.maxDrawdown,
      drawdownSaved: riskCase.drawdownSaved,
      takeaway: riskCase.takeaway
    })),
    safety: {
      mode: "simulation_only",
      walletConnection: false,
      liveTrading: false,
      transactionSigning: false,
      financialAdvice: false
    },
    judgeChecklist: [
      {
        item: "Track 2 CMC Skill artifact",
        status: "ready",
        evidence: "skill/sentinel-alpha/SKILL.md plus JSON schema and examples."
      },
      {
        item: "Backtestable strategy spec",
        status: live.validation.valid ? "ready" : "needs_attention",
        evidence: "/api/strategy-spec?mode=live&timeframe=4H"
      },
      {
        item: "Risk refusal proof",
        status: stress.validation.valid && stress.spec.riskGuard.status === "BLOCKED" ? "ready" : "needs_attention",
        evidence: "/api/strategy-spec?mode=stress&timeframe=1H"
      },
      {
        item: "CMC data depth",
        status: liveUsesCmcOhlcv ? "strong" : "partial",
        evidence: live.provenance.indicators
      }
    ]
  });
}
