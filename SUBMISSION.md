# Sentinel Alpha Skill - Hackathon Submission

## Project Name

Sentinel Alpha Skill

## Track

BNB Hack: AI Trading Agent Edition - Track 2: Strategy Skills

## One-Line Pitch

Sentinel Alpha Skill is a risk-first AI strategy skill for BNB markets that generates backtestable strategy specifications and rejects unsafe setups before any simulated trade decision.

## Track 2 Artifact: The LLM Skill

The deliverable is authored as an LLM Skill in the CoinMarketCap AI Agent Hub Skills format:

- `skill/sentinel-alpha/SKILL.md` - the skill definition (workflow, indicator math, guard thresholds, output contract), with YAML frontmatter and CMC MCP tool references mirroring the official `openCMC/skills-for-ai-agents-by-CoinMarketCap` repository format.
- `skill/sentinel-alpha/strategy-spec.schema.json` - JSON Schema for the strategy specification output.
- `skill/sentinel-alpha/examples/` - an approved-BUY spec and a blocked-WAIT spec.

The dashboard is the skill's reference implementation: the same rules in SKILL.md run as TypeScript, so judges can watch the skill execute against live market data instead of reading it on paper.

## What It Does

Sentinel Alpha analyzes BNB market conditions and produces simulated strategy decisions:

- `BUY`
- `WAIT`
- `EXIT`

The key differentiator is that the strategy skill can override a raw `BUY` into `WAIT` when the risk guard detects unsafe market conditions.

The product does not execute trades. It does not connect to a wallet. It does not sign transactions.

The deployed app also exposes two judge-friendly inspection endpoints:

- `/api/health`
- `/api/submission-manifest`

## Why It Matters

Most AI trading demos try to look confident. Sentinel Alpha is designed to be disciplined.

The core product principle is:

> No trade is also a valid strategy.

This matters because a useful strategy skill should not only find opportunities. It should also reject weak, dangerous, or poorly tested strategies.

## CoinMarketCap Usage

Current implementation uses CoinMarketCap REST API for:

- BNB latest quote.
- BNB 24h percentage change.
- Fear & Greed latest value.

The app keeps the CMC API key server-side in `.env.local` and never exposes it to frontend code.

Technical indicators are calculated from live candle data:

- RSI.
- MACD.
- EMA trend.
- ATR volatility.

The app attempts to use CoinMarketCap OHLCV historical data first. If the active CMC plan does not allow historical OHLCV access, it transparently falls back through public BNBUSDT candle sources (Binance, then OKX, then KuCoin) and labels the active source in both the dashboard and the exported spec. Deterministic local candles are a last resort and are clearly labeled as fixture data.

## Strategy Skill Output

Sentinel Alpha generates a structured Strategy Specification JSON (conforming to `skill/sentinel-alpha/strategy-spec.schema.json`) containing:

- Product mode.
- Asset.
- Market context with the actual indicator readings (price, RSI, MACD, EMA20/50, ATR, Fear & Greed, candle count and source).
- Market regime.
- Decision.
- Confidence score.
- Suggested timeframe.
- Entry rule.
- Exit rule.
- Stop-loss rule.
- Position sizing rule.
- Risk guard checks.
- Blocked reasons.
- Backtest summary.
- Safety constraints.
- Data source notes.

This output is copyable and downloadable from the dashboard.

## Backtest Approach

The current prototype runs a simple long-only simulation:

- Asset: BNB/USDT.
- Timeframes: 1H and 4H.
- No leverage.
- No shorting.
- Simulated transaction cost assumption.
- Entry based on EMA trend, MACD confirmation, RSI risk, and ATR volatility.
- Exit based on trend break, MACD reversal, overheated RSI, or high volatility.
- Compared against Buy & Hold over the same candle window.

Backtest metrics shown:

- Strategy return.
- Buy & Hold return.
- Max drawdown.
- Win rate.
- Number of trades.
- Exposure time.

## Risk Guard

The risk guard validates:

- Trend confirmation.
- Momentum quality.
- Volatility control.
- Sentiment risk.
- Backtest drawdown.

If any critical guard fails, Sentinel Alpha can block the strategy and recommend `WAIT`.

Example:

- Live CMC Fear & Greed enters an extreme zone.
- The raw strategy might otherwise be bullish.
- Risk Guard blocks the setup.
- AI Strategy Output changes to `WAIT`.
- Strategy Specification JSON records the blocked reason.

## Safety and Compliance Boundaries

Sentinel Alpha is simulation-only.

It does not:

- Connect a wallet.
- Execute trades.
- Sign transactions.
- Manage funds.
- Provide financial advice.
- Store API keys in frontend code.

## Demo Flow

1. Open the dashboard.
2. Show the Live System Status tiles.
3. Show live CMC quote and Fear & Greed.
4. Show RSI, MACD, EMA, and ATR calculated from live candles.
5. Click Scenario A: Live Market Analysis.
6. Explain how the decision, reasoning, and rules are derived from the live values on screen, and how the risk guard approves or blocks the setup depending on live conditions.
7. Click Scenario B: Stress Test - Volatility Rejection (Fixture).
8. Show the `WAIT` decision and blocked risk reasons.
9. Scroll to Live Backtest Results.
10. Compare strategy result against Buy & Hold.
11. Scroll to Strategy Specification JSON.
12. Copy or download the structured strategy spec.
13. End with: no wallet, no live trading, no execution.

## 60-Second Judge Script

Sentinel Alpha is a risk-first Strategy Skill for BNB markets. Most AI trading demos try to look confident; this one is designed to be useful when it says no.

First, the dashboard loads live BNB market context from CoinMarketCap and calculates RSI, MACD, EMA trend, ATR volatility, and a simple candle-based backtest. Then the skill produces a structured BUY, WAIT, or EXIT decision.

The key moment is Scenario B. Even when a setup looks tempting, the Risk Guard can override the strategy into WAIT. The new "Why The AI Refused" panel shows the blocked evidence, keeps simulated allocation at 0%, and records the refusal inside the Strategy Specification JSON.

That JSON is the Track 2 artifact: it is exportable, backtestable, and constrained by explicit safety rules. There is no wallet, no trade execution, and no transaction signing. Sentinel Alpha is not trying to be another trading bot; it is a disciplined strategy generation skill.

## Judging Criteria Mapping

### Technical Quality

- Next.js + TypeScript dashboard.
- Server-side CMC API integration.
- Typed API response models.
- Technical indicator calculation.
- Live candle-based backtest route.
- Risk guard override logic.
- Exportable strategy specification.

### Originality

- Risk-first strategy skill.
- Explicit rejection of unsafe strategies.
- "No trade is also a valid strategy" as the central product mechanic.

### Real-World Usefulness

- Helps users avoid blindly following AI-generated signals.
- Produces testable strategy specs instead of execution commands.
- Makes risk reasons transparent.
- Compares strategy against Buy & Hold.

### Clear Live Demo

- One dashboard.
- Two scenarios.
- Live CMC data.
- Live indicators.
- Live backtest.
- Copy/download strategy specification.

## Current Limitations

- Asset limited to BNB/USDT.
- Timeframes limited to 1H and 4H.
- Backtest is intentionally simple.
- No parameter optimization.
- No portfolio support.
- CoinMarketCap Basic plan may not allow historical OHLCV, so the app may fall back to labeled public BNBUSDT candles (Binance/OKX/KuCoin) for indicators and backtest.
- The standalone web app consumes CMC over REST; CMC MCP is consumed through the SKILL.md workflow in MCP-capable agent environments.

## Roadmap

### Short Term

- Add CMC MCP technical-analysis integration if available.
- Replace fallback candles with CMC OHLCV on a suitable CMC plan.
- Add richer backtest chart details.
- Add downloadable full strategy report.

### Medium Term

- Add more BNB ecosystem assets.
- Add configurable risk profiles.
- Add walk-forward backtesting.
- Add strategy versioning.

### Long Term

- List sentinel-alpha in the CMC Skills library.
- Add agent-to-agent strategy review workflow.
- Add natural-language explanation layer for non-technical users.

## Final Statement

Sentinel Alpha Skill is not a trading bot. It is a risk-first strategy generation skill.

Its purpose is to help users and agents decide when a strategy is worth testing, and when the safest decision is to wait.
