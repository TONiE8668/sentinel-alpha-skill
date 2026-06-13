# Sentinel Alpha Skill

Risk-first AI strategy skill for BNB markets, built for **BNB Hack: AI Trading Agent Edition - Track 2: Strategy Skills**.

Sentinel Alpha turns CoinMarketCap market data into a **backtestable strategy specification**: BUY / WAIT / EXIT with entry rules, exit rules, stop-loss logic, position sizing, data provenance, and risk filters.

The skill is designed to **refuse unsafe simulated entries** instead of forcing a trade when the setup is weak.

> No trade is also a valid strategy.

## What This Project Ships

The project ships in two forms:

1. **An LLM Skill** — [`skill/sentinel-alpha/SKILL.md`](skill/sentinel-alpha/SKILL.md), authored in the CoinMarketCap AI Agent Hub Skills format with `SKILL.md`, JSON Schema, and example strategy specs. Any MCP-capable agent with CoinMarketCap access can follow it to produce schema-valid strategy specifications.

2. **A public product surface** — a Next.js dashboard that executes the same risk-first workflow end to end: live CoinMarketCap market data, indicator math, strategy derivation, risk guards, and candle-based backtest output. This is the reference implementation judges can inspect and run.

## Live Product

https://sentinel-alpha-skill.vercel.app/

## Judge-Facing API

The main Track 2 artifact is available as API output, so judges do not need to trust the UI copy button.

```text
/api/judge-report
/api/strategy-spec?mode=live&timeframe=4H
/api/strategy-spec?mode=stress&timeframe=1H
```

- `/api/strategy-spec?mode=live&timeframe=4H` returns a live strategy specification with validation and data provenance.
- `/api/strategy-spec?mode=stress&timeframe=1H` returns a controlled stress-test strategy specification that demonstrates the rejection path.
- `/api/judge-report` bundles live spec, stress spec, validation, CMC data proof, safety boundaries, and the risk-case library into one review object.

## Proof Screenshots

Supplemental proof screenshots are included in [`proof/`](proof/) to show the Agent/MCP workflow behind Sentinel Alpha.

| Proof | What it shows | File |
|---|---|---|
| 1 | Codex connected to CoinMarketCap MCP and listed available CMC tools. | [`proof-01-cmc-mcp-tools.jpg`](proof/proof-01-cmc-mcp-tools.jpg) |
| 2 | Live BNB quote and global crypto market metrics retrieved through CMC MCP. | [`proof-02-live-cmc-bnb-global-metrics.jpg`](proof/proof-02-live-cmc-bnb-global-metrics.jpg) |
| 3 | Sentinel Alpha generated a backtestable BNB/USDT strategy spec from CMC MCP data. | [`proof-03-strategy-spec-part-1.jpg`](proof/proof-03-strategy-spec-part-1.jpg) |
| 4 | The strategy spec returned `WAIT` instead of forcing a weak trade. | [`proof-04-strategy-spec-wait-part-2.jpg`](proof/proof-04-strategy-spec-wait-part-2.jpg) |
| 5 | Risk guard stress test returned `BLOCKED` using live CMC data plus controlled stress inputs. | [`proof-05-risk-guard-blocked.jpg`](proof/proof-05-risk-guard-blocked.jpg) |

These screenshots are supporting evidence only. The main product artifact is the live dashboard, judge-facing API, and recorded product walkthrough.

## How It Works

```text
CoinMarketCap quote + sentiment data
        │
Candle source chain:
CMC OHLCV when available → public exchange candles → labeled fallback fixture
        │
Indicator engine:
RSI(14), MACD(12/26/9), EMA trend, ATR(14)
        │
Strategy derivation:
decision + confidence + entry/exit/risk rules written from actual values
        │
Risk Guard:
trend, momentum, volatility, sentiment, backtest drawdown, confirmation quality
        │   └─ unsafe setup ⇒ BUY is overridden to WAIT/BLOCKED, allocation 0%, reasons recorded
        │
Backtest engine:
long-only, 0.1%/side cost, compared against Buy & Hold on the same candle source
        │
Strategy Specification JSON:
validated against skill/sentinel-alpha/strategy-spec.schema.json
```

Every fallback is labeled in the UI and in the exported spec's `dataSource` block. Fixture or fallback data is never presented as CoinMarketCap historical OHLCV.

## Product Walkthrough Scenarios

- **Scenario A: Live Market Analysis** — the live pipeline. Decision, reasoning, rules, and backtest output are derived from current BNB market data and the active candle source.

- **Scenario B: Risk Guard Stress Test** — live CMC price/sentiment with controlled stress indicators and backtest inputs. This demonstrates the rejection path on demand: the Risk Guard blocks unsafe conditions and the spec records why.

## What Is Live vs Controlled

Live, when deployed with a valid CMC key:

- BNB quote, 24h change, and market context from CoinMarketCap.
- Fear & Greed / sentiment context when available.
- RSI, MACD, EMA trend, and ATR computed from available candle data.
- Backtest computed on the same candle source used by the strategy pipeline.
- Strategy decision, confidence, reasoning, and rules derived from those values.

Preferred but access-dependent:

- CoinMarketCap OHLCV is wired as the preferred candle source when available to the configured API plan.
- If CMC OHLCV is unavailable, the app transparently falls back to public exchange candles and records that in `dataSource`.

Controlled / stress-test inputs:

- Scenario B intentionally uses controlled RSI, MACD, EMA, ATR, and backtest inputs to prove the rejection path.
- Price, 24h change, and CMC market context still use live data when available.
- The last-resort fixture candle fallback is clearly labeled and is never presented as live CMC historical data.

## Run Locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add your server-side CoinMarketCap API key in `.env.local`:

```text
CMC_API_KEY=your_key_here
```

Open:

```text
http://localhost:3000
```

On Windows PowerShell, if `npm` is blocked by script policy, use `npm.cmd`:

```bash
npm.cmd run dev
```

Or double-click:

```text
start-dashboard.bat
```

## Quality Gates

Run these before final deployment:

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
```

`test:e2e` requires the dev server to be running.

## Inspection Endpoints

```text
/api/health
/api/submission-manifest
/api/judge-report
/api/strategy-spec?mode=live&timeframe=4H
/api/strategy-spec?mode=stress&timeframe=1H
/api/market-snapshot
/api/technical-indicators?timeframe=4H
/api/backtest?timeframe=4H
```

## Skill Package

```text
skill/sentinel-alpha/SKILL.md
skill/sentinel-alpha/strategy-spec.schema.json
skill/sentinel-alpha/examples/spec-buy-approved.json
skill/sentinel-alpha/examples/spec-wait-blocked.json
```

The skill package is the Track 2 artifact. The dashboard and API are the reference implementation that proves the skill can be executed and reviewed.

## Agent / CMC MCP Proof

Sentinel Alpha was tested through Codex connected to CoinMarketCap MCP.

The proof flow demonstrates:

1. Codex can see CMC MCP tools.
2. Codex can retrieve live BNB quote and global market metrics.
3. Codex can use CMC MCP data to produce a backtestable strategy spec.
4. Sentinel Alpha can return `WAIT` instead of forcing a weak setup.
5. The risk guard stress test returns `BLOCKED` when simulated risk inputs are unsafe.

See [`AGENT_HUB_RUNBOOK.md`](AGENT_HUB_RUNBOOK.md) and [`proof/`](proof/) for the full proof workflow.

## Deployment Notes

- Host on Vercel with `CMC_API_KEY` set in environment variables.
- The CMC API key must stay server-side.
- Do not expose `.env.local` or any API key in screenshots, logs, commits, or client-side code.
- [`vercel.json`](vercel.json) pins serverless functions to `fra1` so public exchange candle fallbacks are reachable if required. CMC endpoints work from any region.

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for full deployment steps.

## Safety Boundary

Simulation only.

Sentinel Alpha does **not**:

- connect a wallet
- place live trades
- sign transactions
- execute orders
- provide financial advice

It outputs a strategy specification and risk decision for review, validation, and backtesting.

## Submission Documents

- [`SUBMISSION.md`](SUBMISSION.md) — pitch, judging criteria mapping, and product walkthrough script.
- [`DORAHACKS_SUBMISSION.md`](DORAHACKS_SUBMISSION.md) — copy-ready DoraHacks submission text.
- [`AGENT_HUB_RUNBOOK.md`](AGENT_HUB_RUNBOOK.md) — Agent Hub / CMC MCP proof workflow.
- [`proof/`](proof/) — screenshots proving CMC MCP access, strategy generation, `WAIT`, and `BLOCKED` risk guard behavior.
- [`skill/sentinel-alpha/SKILL.md`](skill/sentinel-alpha/SKILL.md) — the LLM Skill.
- [`skill/sentinel-alpha/strategy-spec.schema.json`](skill/sentinel-alpha/strategy-spec.schema.json) — output contract.
- [`skill/sentinel-alpha/examples/`](skill/sentinel-alpha/examples/) — approved-BUY and blocked-WAIT example specs.

## Core Claim

Sentinel Alpha turns CoinMarketCap market data into a validated, backtestable strategy specification and refuses unsafe simulated entries.

**No trade is also a valid strategy.**
