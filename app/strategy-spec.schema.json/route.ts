import { NextResponse } from "next/server";

import schema from "@/skill/sentinel-alpha/strategy-spec.schema.json";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(schema, {
    headers: {
      "Content-Type": "application/schema+json"
    }
  });
}
