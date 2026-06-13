# DoraHacks Submission Draft

## Project

Sentinel Alpha Skill

## Track

Track 2: Strategy Skills

## One-liner

Sentinel Alpha is a risk-first CMC Skill that turns BNB market data into a validated, backtestable strategy spec and refuses unsafe simulated entries.

## Demo

- Live dashboard: https://sentinel-alpha-skill.vercel.app/
- Health check: https://sentinel-alpha-skill.vercel.app/api/health
- Judge report: https://sentinel-alpha-skill.vercel.app/api/judge-report
- Live strategy artifact: https://sentinel-alpha-skill.vercel.app/api/strategy-spec?mode=live&timeframe=4H
- Controlled stress/refusal artifact: https://sentinel-alpha-skill.vercel.app/api/strategy-spec?mode=stress&timeframe=1H
- Output schema: https://sentinel-alpha-skill.vercel.app/strategy-spec.schema.json

## What We Built

Sentinel Alpha Skill is a Track 2 CMC Skill package plus a reference dashboard. It produces a machine-readable Strategy Specification JSON with market context, BUY/WAIT/EXIT decision, confidence, entry/exit/stop/sizing rules, five risk guard checks, blocked reasons, backtest metrics, safety constraints, and data-source provenance.

The core product principle is: no trade is also a valid strategy. When trend, momentum, volatility, sentiment, or backtest drawdown fails, the skill blocks unsafe entries and emits `WAIT` with 0% simulated allocation.

## Sponsor Capability Used

CoinMarketCap:

- CMC REST latest BNB quote.
- CMC REST Fear & Greed.
- CMC OHLCV historical candles when the active API plan supports it.
- CMC MCP tool references in `skill/sentinel-alpha/SKILL.md`.
- Transparent fallback labeling when CMC OHLCV is unavailable.

## Track 2 Artifact

- `skill/sentinel-alpha/SKILL.md` defines the CMC Skill workflow.
- `skill/sentinel-alpha/strategy-spec.schema.json` defines the output contract.
- `skill/sentinel-alpha/examples/` includes an approved BUY example and a blocked WAIT example.
- `/api/strategy-spec` generates validated strategy specs server-side for judge inspection.
- `AGENT_HUB_RUNBOOK.md` documents how to run the Skill through Agent Hub / CMC MCP and what proof to capture.

## Backtest

The reference implementation runs a long-only BNB/USDT backtest on 1H or 4H candles. It uses EMA trend, MACD confirmation, RSI, ATR volatility, no leverage, no shorting, and 0.1% transaction cost per side. It reports simulated return, max drawdown, win rate, trade count, exposure time, and Buy & Hold comparison.

## Safety

Simulation only. No wallet connection, no live trading, no transaction signing, no financial advice, and no private keys.

## Judge Script

1. Open the dashboard.
2. Show the live CMC quote and Fear & Greed status.
3. Open `/api/strategy-spec?mode=live&timeframe=4H` and show `validation.valid: true`.
4. Switch to Scenario B.
5. Show "Why The AI Refused" and the blocked risk reasons.
6. Open `/api/strategy-spec?mode=stress&timeframe=1H` and show `riskGuard.status: BLOCKED`.
7. End by showing the `SKILL.md` and schema files.
