import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasCmcApiKey = Boolean(
    process.env.CMC_API_KEY &&
      process.env.CMC_API_KEY !== "replace_with_your_coinmarketcap_api_key"
  );

  return NextResponse.json({
    ok: true,
    project: "Sentinel Alpha Skill",
    track: "BNB Hack Track 2: Strategy Skills",
    mode: "simulation_only",
    checkedAt: new Date().toISOString(),
    environment: {
      cmcApiKeyConfigured: hasCmcApiKey
    },
    safety: {
      walletConnection: false,
      liveTrading: false,
      transactionSigning: false,
      financialAdvice: false
    },
    routes: {
      dashboard: "/",
      marketSnapshot: "/api/market-snapshot",
      technicalIndicators: "/api/technical-indicators?timeframe=4H",
      backtest: "/api/backtest?timeframe=4H",
      submissionManifest: "/api/submission-manifest"
    }
  });
}
