import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    projectName: "Sentinel Alpha Skill",
    oneLinePitch:
      "A risk-first AI strategy skill for BNB markets that generates backtestable strategy specs and refuses unsafe simulated entries.",
    hackathonTrack: "BNB Hack: AI Trading Agent Edition - Track 2: Strategy Skills",
    primaryDemoPath: "/",
    coreDifferentiator: "No trade is also a valid strategy.",
    judgeMoment:
      "Scenario B opens the Why The AI Refused panel: the Risk Guard overrides a tempting setup into WAIT, keeps allocation at 0%, and records the refusal in the exported JSON spec.",
    llmSkillArtifact: {
      definition: "skill/sentinel-alpha/SKILL.md",
      outputSchema: "skill/sentinel-alpha/strategy-spec.schema.json",
      examples: [
        "skill/sentinel-alpha/examples/spec-buy-approved.json",
        "skill/sentinel-alpha/examples/spec-wait-blocked.json"
      ],
      format:
        "CoinMarketCap AI Agent Hub Skills format (SKILL.md with YAML frontmatter and CMC MCP tool references)"
    },
    dataUsage: {
      coinMarketCap: [
        "BNB latest quote",
        "BNB 24h percentage change",
        "Fear & Greed latest value",
        "CoinMarketCap OHLCV historical candles when available"
      ],
      fallback:
        "If CMC OHLCV is unavailable for the active API plan, candle-based indicators and backtests transparently fall back through public BNBUSDT candles (Binance, OKX, KuCoin), each labeled in the dashboard and exported spec."
    },
    strategyOutputs: ["BUY", "WAIT", "EXIT"],
    generatedArtifact: {
      name: "Strategy Specification JSON",
      includes: [
        "market regime",
        "decision and confidence",
        "entry, exit, stop-loss, and sizing rules",
        "risk guard checks",
        "blocked reasons",
        "backtest summary",
        "safety constraints",
        "data source notes"
      ]
    },
    safetyBoundaries: [
      "Simulation only",
      "No wallet connection",
      "No trade execution",
      "No transaction signing",
      "No financial advice"
    ],
    recommendedDemoFlow: [
      "Open the dashboard",
      "Show Hackathon Demo Readout",
      "Show Scenario A: Live Market Analysis with live CMC market context",
      "Click Scenario B: Stress Test - Volatility Rejection (Fixture)",
      "Pause on Why The AI Refused",
      "Show Live Backtest Results",
      "Copy or download Strategy Specification JSON",
      "Open skill/sentinel-alpha/SKILL.md to show the Track 2 LLM Skill artifact"
    ]
  });
}
