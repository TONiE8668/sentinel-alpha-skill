# CMC Integration Guide - Step 1

This guide explains how to integrate CoinMarketCap data into Sentinel Alpha Skill safely.

Goal of Step 1:

- Keep the current dashboard working.
- Replace only the top-level mock market snapshot with live CoinMarketCap data.
- Do not connect wallet.
- Do not enable live trading.
- Do not expose API keys in frontend code.

## Recommended Path

Use CoinMarketCap REST API first.

Why:

- Easier to run inside this standalone Next.js app.
- Easier to deploy to Vercel.
- Keeps the API key safely on the server.
- MCP can be added later behind the same data adapter.

## What You Need From CoinMarketCap

Create a CoinMarketCap API key:

1. Go to https://pro.coinmarketcap.com/
2. Sign up or log in.
3. Open the developer dashboard.
4. Copy the API key.

Important:

- Do not paste the API key into ChatGPT/Codex chat.
- Do not put the API key in React components.
- Do not commit the API key to GitHub.

## Environment Setup

Create a local file:

```text
.env.local
```

Add this:

```env
CMC_API_KEY=your_coinmarketcap_api_key_here
```

This file is already ignored by `.gitignore`.

## First Endpoints To Use

### 1. Latest BNB Quote

Use this endpoint:

```text
GET https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest
```

Headers:

```text
X-CMC_PRO_API_KEY: your_api_key
Accept: application/json
```

Recommended query:

```text
symbol=BNB&convert=USD
```

Expected dashboard fields:

- Current price.
- 24h change.
- 24h volume if needed later.

Note:

- CMC quote will usually be USD, not a true exchange-specific BNB/USDT candle.
- For the UI, we can show `BNB/USDT` as the strategy market, but implementation notes should say live quote is a USD proxy until exchange-pair data is verified.

### 2. Fear & Greed Latest

Use this endpoint:

```text
GET https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest
```

Headers:

```text
X-CMC_PRO_API_KEY: your_api_key
Accept: application/json
```

Expected dashboard fields:

- Fear & Greed score.
- Fear & Greed label/classification.

## App Architecture For Step 1

Add only these pieces first:

```text
app/api/market-snapshot/route.ts
lib/cmcClient.ts
lib/cmcAdapter.ts
types/cmc.ts
```

### `lib/cmcClient.ts`

Responsibility:

- Read `process.env.CMC_API_KEY`.
- Make server-side CMC requests.
- Add required headers.
- Throw friendly errors when key is missing or API fails.

### `lib/cmcAdapter.ts`

Responsibility:

- Convert raw CMC responses into the dashboard's existing `MarketSnapshot` shape.
- Keep mock indicator values for RSI, MACD, EMA, and ATR until technical indicator integration is added.

### `app/api/market-snapshot/route.ts`

Responsibility:

- Server route called by the browser.
- Returns normalized market snapshot JSON.
- Never returns the API key.

### Frontend Change

After the API route works:

- Dashboard loads live CMC price, 24h change, and Fear & Greed.
- RSI, MACD, EMA, ATR can remain fixture values temporarily.
- Show a small label: `Live CMC quote + fixture indicators`.

## Step 1 Definition Of Done

Step 1 is done when:

- `.env.local` stores `CMC_API_KEY`.
- Browser never sees the API key.
- `/api/market-snapshot` returns live CMC data.
- Dashboard shows live BNB price.
- Dashboard shows live Fear & Greed.
- App still works if CMC fails by falling back to fixture mode.
- Scenario A/B buttons still work.
- No wallet, no live trading, no transaction signing.

## Current Implementation Status

Implemented:

- BNB latest quote from CoinMarketCap REST API.
- Fear & Greed latest from CoinMarketCap REST API.
- Server-side API key handling.
- Technical indicator calculation for RSI, MACD, EMA trend, and ATR volatility.
- Live candle-based backtest with Buy & Hold comparison.
- CoinMarketCap OHLCV historical is attempted first.
- If CMC historical data is unavailable on the active plan, the app falls back to public BNBUSDT candles and labels the fallback in the UI.

Known limitation:

- The Basic CMC plan may not include historical OHLCV data. This is expected. For a stricter Track 2 submission, upgrade CMC plan, use CMC MCP technical-analysis tools, or clearly explain the candle fallback.

## Test Checklist

Run:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

Manual browser test:

1. Open `http://localhost:3000`.
2. Confirm dashboard loads.
3. Confirm BNB price is not hardcoded fixture value.
4. Confirm Fear & Greed is live or clearly marked unavailable.
5. Click Scenario A.
6. Click Scenario B.
7. Confirm risk rejection still works.
8. Open browser dev tools Network tab.
9. Confirm API key does not appear in frontend responses.

## Common Errors

### Missing API key

Problem:

```text
CMC_API_KEY is not configured
```

Fix:

- Create `.env.local`.
- Add `CMC_API_KEY=...`.
- Restart `npm.cmd run dev`.

### 401 Unauthorized

Problem:

- API key is wrong or inactive.

Fix:

- Copy the key again from CoinMarketCap dashboard.
- Restart dev server.

### 429 Rate limit

Problem:

- Too many requests.

Fix:

- Avoid auto-refresh for now.
- Keep refresh manual.
- Cache data for 60 seconds later.

### CORS error

Problem:

- Frontend is calling CoinMarketCap directly.

Fix:

- Only call CMC from Next.js server routes.
- Browser should call `/api/market-snapshot`, not `https://pro-api.coinmarketcap.com/...`.

## MCP Later

CMC MCP official endpoint:

```text
https://mcp.coinmarketcap.com/mcp
```

MCP header:

```text
X-CMC-MCP-API-KEY
```

Use MCP later if:

- The hackathon expects MCP specifically.
- The environment exposes CMC MCP tools.
- We need CMC's technical-analysis tool directly.

For Step 1, REST API is the safer build path.

## Official References

- CoinMarketCap API docs: https://coinmarketcap.com/api/documentation/
- CMC API authentication: https://coinmarketcap.com/api/documentation/guides/authentication
- CMC Fear & Greed latest endpoint: https://coinmarketcap.com/api/documentation/pro-api-reference/global-metrics
- CMC MCP overview: https://coinmarketcap.com/api/mcp/
- CMC Skills overview: https://coinmarketcap.com/api/documentation/ai-agent-hub/skills/overview
