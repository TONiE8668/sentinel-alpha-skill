import { NextRequest, NextResponse } from "next/server";
import {
  buildJudgeReadyStrategySpec,
  parseStrategySpecMode,
  parseStrategySpecTimeframe
} from "@/lib/strategySpecService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const mode = parseStrategySpecMode(request.nextUrl.searchParams.get("mode"));
  const timeframe = parseStrategySpecTimeframe(request.nextUrl.searchParams.get("timeframe"));
  const includeValidation = request.nextUrl.searchParams.get("validate") !== "false";

  const result = await buildJudgeReadyStrategySpec({ mode, timeframe });

  return NextResponse.json({
    ok: result.validation.valid,
    track: "BNB Hack Track 2: Strategy Skills",
    artifact: "backtestable_strategy_spec",
    mode,
    timeframe,
    spec: result.spec,
    provenance: result.provenance,
    ...(includeValidation ? { validation: result.validation } : {})
  });
}
