# Sentinel Alpha Skill

Risk-first AI strategy skill for BNB markets, built for **BNB Hack: AI Trading Agent Edition - Track 2: Strategy Skills**.

Sentinel Alpha turns CoinMarketCap market data into a **backtestable strategy specification** (BUY / WAIT / EXIT with entry, exit, stop-loss, and sizing rules) and **refuses unsafe setups** before any simulated entry. Core principle:

> No trade is also a valid strategy.

The project ships in two forms:

1. **An LLM Skill** — [skill/sentinel-alpha/SKILL.md](skill/sentinel-alpha/SKILL.md), authored in the CoinMarketCap AI Agent Hub Skills format (`SKILL.md` + JSON Schema + example specs). Any MCP-capable agent with CMC access can follow it to produce schema-valid strategy specs.
2. **A live dashboard** — a Next.js app that executes the exact same rules end to end: live CMC data, indicator math, risk guards, and a real candle-based backtest. It is the skill's reference implementation and demo surface.

## Live Demo

https://sentinel-alpha-skill.vercel.app/

## How It Works

```text
CMC quote + Fear & Greed (REST, server-side key)
        │
Candle chain: CMC OHLCV → Binance klines → OKX → KuCoin → labeled fixture
        │
Indicator engine: RSI(14), MACD(12/26/9), EMA(20/50), ATR(14)
        │
Strategy derivation: decision + confidence + rules written from the actual values
        │
Risk Guard (5 checks): trend, momentum, volatility, sentiment, backtest drawdown
        │   └─ any Fail ⇒ BUY is overridden to WAIT, allocation 0%, reasons recorded
        │
Backtest engine: long-only, 0.1%/side cost, vs Buy & Hold on the same candles
        │
Strategy Specification JSON (schema: skill/sentinel-alpha/strategy-spec.schema.json)
```

Every fallback is labeled in the UI and in the exported spec's `dataSource` block — fixture data is never presented as live data.

## Run Locally

```bash
npm install
cp .env.example .env.local   # add your CMC_API_KEY
npm run dev
```

Open http://localhost:3000.

Quality gates:

```bash
npm run typecheck
npm run lint
npm run test:e2e   # requires the dev server running
```

Inspection endpoints:

```text
/api/health
/api/submission-manifest
/api/market-snapshot
/api/technical-indicators?timeframe=4H
/api/backtest?timeframe=4H
```

On Windows PowerShell, if `npm` is blocked by script policy, use `npm.cmd`, or double-click `start-dashboard.bat`.

## Deployment Notes

- Host on Vercel with `CMC_API_KEY` set in environment variables.
- [vercel.json](vercel.json) pins serverless functions to `fra1` so public exchange candle fallbacks are reachable (some exchange APIs geo-block US data center IPs). CMC endpoints work from any region.

See [DEPLOYMENT.md](DEPLOYMENT.md) for full steps.

## The Two Demo Scenarios

- **Scenario A: Live Market Analysis** — the full live pipeline. Decision, reasoning, rules, and backtest are derived from real BNB data at view time.
- **Scenario B: Stress Test - Volatility Rejection (Fixture)** — a deterministic, clearly-labeled fixture that demonstrates the rejection path on demand: the Risk Guard blocks an overheated market and the spec records why.

## What Is Live vs Fixture

Live (when deployed with a CMC key):

- BNB quote, 24h change, and Fear & Greed from CoinMarketCap REST.
- RSI, MACD, EMA trend, ATR computed from real candles (CMC OHLCV first; labeled public exchange fallbacks otherwise).
- Backtest computed on the same real candles, compared against Buy & Hold.
- Strategy decision, confidence, reasoning, and rules derived from those values.

Fixture (always labeled):

- Scenario B's market snapshot and backtest (by design, for the rejection demo).
- The last-resort candle fallback if every live candle source is unreachable.

## Safety Boundary

Simulation only. No wallet connection, no live trading, no transaction signing, no financial advice. The CMC API key stays server-side and is never exposed to the browser.

## Submission Documents

- [SUBMISSION.md](SUBMISSION.md) — pitch, judging criteria mapping, demo script.
- [skill/sentinel-alpha/SKILL.md](skill/sentinel-alpha/SKILL.md) — the LLM Skill (Track 2 artifact).
- [skill/sentinel-alpha/strategy-spec.schema.json](skill/sentinel-alpha/strategy-spec.schema.json) — output contract.
- [skill/sentinel-alpha/examples/](skill/sentinel-alpha/examples/) — approved-BUY and blocked-WAIT example specs.
