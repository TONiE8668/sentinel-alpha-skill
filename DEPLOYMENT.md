# Sentinel Alpha Skill - Deployment Runbook

## Recommended Target

Use Vercel for the hackathon demo because this is a Next.js app with server-side API routes.

## Vercel Deploy Commands

Login once:

```powershell
npx.cmd vercel login
```

Add the production CMC key:

```powershell
npx.cmd vercel env add CMC_API_KEY production
```

Deploy production:

```powershell
npx.cmd vercel --prod
```

## Required Environment Variable

Set this in the deployment provider:

```text
CMC_API_KEY=your_coinmarketcap_api_key
```

The app still works without the key by showing fixture/fallback states, but a live-key deployment gives a stronger demo.

## Local Preflight

```powershell
npm.cmd install
npx.cmd playwright install chromium
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Run the dashboard:

```powershell
npm.cmd run dev
```

Open:

```text
http://localhost:3000
```

Run E2E while the dev server is running:

```powershell
npm.cmd run test:e2e
```

## Post-Deploy Checks

Replace `YOUR_URL` with the deployed URL:

```text
https://YOUR_URL/api/health
https://YOUR_URL/api/submission-manifest
https://YOUR_URL/api/market-snapshot
https://YOUR_URL/api/technical-indicators?timeframe=4H
https://YOUR_URL/api/backtest?timeframe=4H
```

The winning demo path is:

1. Open the dashboard.
2. Show `Hackathon Demo Readout`.
3. Click `Scenario B: High Volatility Rejected`.
4. Pause on `Why The AI Refused`.
5. Show `Live Backtest Results`.
6. Copy or download `Strategy Specification JSON`.
7. Close with: no wallet, no execution, simulation only.

## Failure Mode To Mention Honestly

If CoinMarketCap OHLCV is unavailable for the active API plan, the app labels the public BNBUSDT candle fallback. CMC is still used for the live quote and Fear & Greed when `CMC_API_KEY` is configured.
