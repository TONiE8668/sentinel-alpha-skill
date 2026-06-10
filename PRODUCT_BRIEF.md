# Sentinel Alpha Skill - Product Brief

## Problem

Crypto strategy tools usually optimize for signals first and risk later. That creates a common failure mode: a strategy looks smart in a short backtest, but it ignores bad market regimes, high volatility, weak trend confirmation, or drawdown risk.

For a hackathon Strategy Skills submission, the goal is not to build another live trading bot. The goal is to show that an AI skill can read CoinMarketCap market data, generate a backtestable strategy specification, and reject unsafe ideas before a user is tempted to treat them as trade instructions.

## Solution

Sentinel Alpha Skill is a risk-first AI strategy skill for BNB markets.

It analyzes BNB/USDT market data on 1H and 4H timeframes, combines technical indicators with market sentiment, and produces simulated strategy decisions:

- `BUY`: conditions meet the strategy and risk filters.
- `WAIT`: conditions are unclear, contradictory, or not worth the risk.
- `EXIT`: existing simulated exposure should be closed based on risk or trend breakdown.

The product generates a structured, backtestable strategy specification instead of executing trades. It explains which signals support the decision and which risk guardrails passed or failed.

## Target User

The target user is a crypto builder, analyst, or hackathon judge who wants to understand whether an AI-generated trading strategy is disciplined enough to test.

They do not need to be a professional quant trader. The dashboard should make the reasoning understandable in plain language:

- What is the market doing?
- What decision did the strategy skill produce?
- What risk checks blocked or allowed the decision?
- Did the strategy beat Buy & Hold in a simple historical backtest?

## Winning Narrative

Most AI trading demos try to look confident. Sentinel Alpha wins by showing restraint.

The core narrative:

> "A serious AI trading skill should know when not to trade."

Sentinel Alpha is built around rejection logic. It can say: "This strategy is not safe enough to enter because volatility is too high, the trend is weak, RSI is overheated, or the backtest drawdown is unacceptable."

This makes the project useful beyond the hackathon because real users need strategy discipline more than they need another black-box signal.

## Scope

Version 1 is intentionally narrow and buildable by one founder using AI coding assistance.

- One asset: `BNB/USDT`.
- Two timeframes: `1H` and `4H`.
- Strategy decisions: `BUY`, `WAIT`, `EXIT`.
- Market data from CoinMarketCap where available.
- Indicators: RSI, MACD, EMA, ATR, and Fear & Greed.
- Dashboard with:
  - Market snapshot.
  - Market regime.
  - AI strategy output.
  - Risk guard status.
  - Backtest summary.
  - Buy & Hold comparison.
- Backtestable strategy specification export.
- Demo-focused, read-only, simulated output.

## Non-Scope

Sentinel Alpha will not:

- Connect to a wallet.
- Sign transactions.
- Place live trades.
- Manage real money.
- Run as an autonomous execution agent.
- Support many assets in the first version.
- Optimize dozens of parameters.
- Promise financial advice or guaranteed returns.
- Store API keys in frontend code.

## Demo Scenario

### Scenario 1: Risk-Approved Strategy

The user opens the dashboard and selects `BNB/USDT`, `4H`.

Sentinel Alpha fetches the latest market snapshot, reads technical indicators, classifies the market regime, and produces:

- Decision: `BUY`
- Reason: trend is positive, momentum confirms, volatility is controlled.
- Risk guards: passed.
- Backtest: strategy outperforms Buy & Hold with acceptable drawdown.

The demo highlight is that the strategy is not just a signal. It includes a reusable strategy specification with entry, exit, risk, and invalidation rules.

### Scenario 2: Risk-Rejected Strategy

The user switches to `1H` or refreshes during a choppy market.

Sentinel Alpha produces:

- Decision: `WAIT`
- Reason: signals conflict, ATR is elevated, or Fear & Greed suggests an overheated/risk-off environment.
- Risk guards: one or more failed.
- Backtest: recent simulated results do not justify taking the trade.

The demo highlight is the differentiator: the AI refuses to generate a risky `BUY` and explains why in language a non-technical user can understand.

## Product Principle

The skill should be judged by the quality of its discipline, not by how often it says `BUY`.

