import { NextRequest, NextResponse } from "next/server";
import { getBnbCandles } from "@/lib/candleSources";
import { calculateTechnicalOverlay } from "@/lib/indicatorMath";
import type { TechnicalIndicatorsResponse } from "@/types/strategy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const timeframeParam = request.nextUrl.searchParams.get("timeframe");
  const timeframe = timeframeParam === "1H" ? "1H" : "4H";

  try {
    const { candles, source, note } = await getBnbCandles(timeframe);
    const data = calculateTechnicalOverlay(candles, timeframe, source, note);
    return NextResponse.json<TechnicalIndicatorsResponse>({ ok: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to calculate technical indicators.";

    return NextResponse.json<TechnicalIndicatorsResponse>(
      {
        ok: false,
        error: message
      },
      { status: 200 }
    );
  }
}
