import { NextResponse } from "next/server";
import { getLiveBnbMarketOverlay } from "@/lib/cmcAdapter";
import { CmcClientError } from "@/lib/cmcClient";
import type { MarketSnapshotResponse } from "@/types/strategy";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getLiveBnbMarketOverlay();
    return NextResponse.json<MarketSnapshotResponse>({ ok: true, data });
  } catch (error) {
    const message =
      error instanceof CmcClientError || error instanceof Error
        ? error.message
        : "Unable to load CoinMarketCap data.";

    return NextResponse.json<MarketSnapshotResponse>(
      {
        ok: false,
        error: message
      },
      { status: 200 }
    );
  }
}
