import { NextResponse } from "next/server";
import { CmcClientError, cmcGet } from "@/lib/cmcClient";

export const dynamic = "force-dynamic";

const TICKER_SYMBOLS = ["BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "TON", "TRX", "AVAX"];

type CmcTickerQuoteResponse = {
  data?: Record<
    string,
    {
      symbol?: string;
      quote?: {
        USD?: {
          price?: number;
          percent_change_24h?: number;
        };
      };
    }
  >;
  status?: {
    error_code?: number;
    error_message?: string | null;
  };
};

type MarketTickerItem = {
  symbol: string;
  price: number;
  change24h: number;
};

type MarketTickerResponse =
  | {
      ok: true;
      data: {
        source: "coinmarketcap_rest";
        fetchedAt: string;
        items: MarketTickerItem[];
      };
    }
  | {
      ok: false;
      error: string;
    };

export async function GET() {
  try {
    const quote = await cmcGet<CmcTickerQuoteResponse>("/v1/cryptocurrency/quotes/latest", {
      symbol: TICKER_SYMBOLS.join(","),
      convert: "USD"
    });

    const items = TICKER_SYMBOLS.map((symbol) => {
      const usdQuote = quote.data?.[symbol]?.quote?.USD;
      const price = usdQuote?.price;
      const change24h = usdQuote?.percent_change_24h;

      if (typeof price !== "number" || typeof change24h !== "number") {
        return null;
      }

      return { symbol, price, change24h };
    }).filter((item): item is MarketTickerItem => item !== null);

    if (items.length === 0) {
      throw new CmcClientError("CoinMarketCap ticker response did not include quote data.");
    }

    return NextResponse.json<MarketTickerResponse>({
      ok: true,
      data: {
        source: "coinmarketcap_rest",
        fetchedAt: new Date().toISOString(),
        items
      }
    });
  } catch (error) {
    const message =
      error instanceof CmcClientError || error instanceof Error
        ? error.message
        : "Unable to load CoinMarketCap market ticker.";

    return NextResponse.json<MarketTickerResponse>(
      {
        ok: false,
        error: message
      },
      { status: 200 }
    );
  }
}
