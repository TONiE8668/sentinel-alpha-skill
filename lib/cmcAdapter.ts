import { cmcGet } from "@/lib/cmcClient";
import type { CmcFearGreedResponse, CmcQuoteLatestResponse } from "@/types/cmc";
import type { LiveMarketOverlay, MarketSnapshot } from "@/types/strategy";

export async function getLiveBnbMarketOverlay(): Promise<LiveMarketOverlay> {
  const [quote, fearGreed] = await Promise.all([
    cmcGet<CmcQuoteLatestResponse>("/v1/cryptocurrency/quotes/latest", {
      symbol: "BNB",
      convert: "USD"
    }),
    cmcGet<CmcFearGreedResponse>("/v3/fear-and-greed/latest")
  ]);

  const usdQuote = quote.data?.BNB?.quote?.USD;
  const currentPrice = usdQuote?.price;
  const change24h = usdQuote?.percent_change_24h;
  const fearGreedValue = Number(fearGreed.data?.value);

  if (
    typeof currentPrice !== "number" ||
    typeof change24h !== "number" ||
    !Number.isFinite(fearGreedValue)
  ) {
    throw new Error("CoinMarketCap response did not include required market fields.");
  }

  return {
    currentPrice,
    change24h,
    fearGreedScore: fearGreedValue,
    fearGreedLabel: normalizeFearGreedLabel(
      fearGreed.data?.value_classification,
      fearGreedValue
    ),
    fetchedAt: new Date().toISOString(),
    source: "coinmarketcap_rest",
    note: "Live CMC quote and Fear & Greed. Technical indicators and backtests are calculated by the candle routes."
  };
}

function normalizeFearGreedLabel(
  valueClassification: string | undefined,
  score: number
): MarketSnapshot["fearGreedLabel"] {
  const normalized = valueClassification?.trim().toLowerCase();

  if (normalized === "extreme fear") {
    return "Extreme Fear";
  }

  if (normalized === "fear") {
    return "Fear";
  }

  if (normalized === "neutral") {
    return "Neutral";
  }

  if (normalized === "greed") {
    return "Greed";
  }

  if (normalized === "extreme greed") {
    return "Extreme Greed";
  }

  if (score <= 20) {
    return "Extreme Fear";
  }

  if (score <= 40) {
    return "Fear";
  }

  if (score < 60) {
    return "Neutral";
  }

  if (score < 80) {
    return "Greed";
  }

  return "Extreme Greed";
}
