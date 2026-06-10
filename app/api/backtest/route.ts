import { NextRequest, NextResponse } from "next/server";
import { runSentinelBacktest } from "@/lib/backtestEngine";
import { getBnbCandles } from "@/lib/candleSources";
import type { BacktestResponse } from "@/types/strategy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const timeframeParam = request.nextUrl.searchParams.get("timeframe");
  const timeframe = timeframeParam === "1H" ? "1H" : "4H";

  try {
    const { candles, source, note } = await getBnbCandles(timeframe);
    const data = runSentinelBacktest({
      candles,
      timeframe,
      source,
      note
    });

    return NextResponse.json<BacktestResponse>({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to run backtest.";

    return NextResponse.json<BacktestResponse>(
      {
        ok: false,
        error: message
      },
      { status: 200 }
    );
  }
}
