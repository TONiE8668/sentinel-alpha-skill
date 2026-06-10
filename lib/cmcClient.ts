const CMC_BASE_URL = "https://pro-api.coinmarketcap.com";
const REQUEST_TIMEOUT_MS = 8000;

export class CmcClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CmcClientError";
  }
}

export async function cmcGet<T>(path: string, params?: Record<string, string>) {
  const apiKey = process.env.CMC_API_KEY;

  if (!apiKey || apiKey === "replace_with_your_coinmarketcap_api_key") {
    throw new CmcClientError("CMC_API_KEY is not configured.");
  }

  const url = new URL(path, CMC_BASE_URL);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  const controller = new AbortController();
  const timeout = windowlessSetTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-CMC_PRO_API_KEY": apiKey
      },
      signal: controller.signal,
      cache: "no-store"
    });

    const payload = (await response.json()) as T & {
      status?: { error_message?: string | null };
    };

    if (!response.ok) {
      throw new CmcClientError(
        payload.status?.error_message || `CoinMarketCap request failed with ${response.status}.`
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof CmcClientError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new CmcClientError("CoinMarketCap request timed out.");
    }

    throw new CmcClientError("CoinMarketCap request failed.");
  } finally {
    clearTimeout(timeout);
  }
}

function windowlessSetTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms);
}
