# Sentinel Alpha Skill - UI Wireframe

## Dashboard Goal

The dashboard should make one idea obvious:

> Sentinel Alpha does not just generate trading signals. It checks whether the strategy is safe enough to test.

The first screen should show the real product, not a landing page.

## Simple Dashboard Layout

```text
┌────────────────────────────────────────────────────────────────────┐
│ Sentinel Alpha Skill                                  Simulated Only │
│ Risk-first AI strategy skill for BNB/USDT                           │
├────────────────────────────────────────────────────────────────────┤
│ Controls                                                            │
│ Asset: BNB/USDT              Timeframe: [ 1H ] [ 4H ]    Refresh    │
├───────────────────────────────┬────────────────────────────────────┤
│ Market Snapshot               │ AI Strategy Output                  │
│ Price                         │ Decision: BUY / WAIT / EXIT         │
│ 24h Change                    │ Confidence: Low / Medium / High     │
│ Volume                        │ Strategy summary                    │
│ Fear & Greed                  │ Key reasons                         │
│ Last updated                  │                                     │
├───────────────────────────────┼────────────────────────────────────┤
│ Market Regime                 │ Risk Guard Status                   │
│ Regime label                  │ Trend guard: Pass/Fail/Warning      │
│ RSI state                     │ Volatility guard: Pass/Fail/Warning │
│ MACD state                    │ Sentiment guard: Pass/Fail/Warning  │
│ EMA trend                     │ Drawdown guard: Pass/Fail/Warning   │
│ ATR volatility                │ Data quality: Pass/Fail/Warning     │
├───────────────────────────────┴────────────────────────────────────┤
│ Backtest Results                                                    │
│ Sentinel Alpha return | Buy & Hold return | Max drawdown | Trades   │
│ Simple equity chart or compact table                                │
├────────────────────────────────────────────────────────────────────┤
│ Strategy Specification                                              │
│ Entry rules | Exit rules | Risk rules | Invalidation rules           │
│ [Copy Spec]                                                         │
└────────────────────────────────────────────────────────────────────┘
```

## Sections and Components

### Header

Components:

- Product name: `Sentinel Alpha Skill`.
- Badge: `Simulated Only`.
- One-line description: `Risk-first AI strategy skill for BNB/USDT`.

Purpose:

- Immediately separate the project from live trading agents.
- Reinforce that this is a Track 2 strategy skill.

### Controls

Components:

- Asset selector fixed to `BNB/USDT`.
- Timeframe segmented control: `1H`, `4H`.
- Refresh button.
- Optional data mode label: `Live CMC data` or `Demo fixture`.

Purpose:

- Keep the user focused.
- Show that both required timeframes are supported.

### Market Snapshot

Components:

- Latest BNB price.
- 24h percent change.
- 24h volume.
- Fear & Greed value and classification.
- Last updated timestamp.

Purpose:

- Show that the skill starts from market data, not a made-up AI answer.

### AI Strategy Output

Components:

- Large decision label: `BUY`, `WAIT`, or `EXIT`.
- Confidence label.
- Short summary.
- Three to five key reasons.

Purpose:

- Make the strategy output demo-friendly.
- Keep the language understandable.

### Market Regime

Components:

- Regime label.
- RSI state.
- MACD state.
- EMA trend state.
- ATR volatility state.

Purpose:

- Explain the current market environment before showing the risk verdict.

### Risk Guard Status

Components:

- Trend guard.
- Volatility guard.
- Sentiment guard.
- Drawdown guard.
- Data quality guard.

Each guard should show:

- Status: `Pass`, `Warning`, or `Fail`.
- One-sentence explanation.

Purpose:

- This is the product differentiator.
- The user should see exactly why a strategy was approved or rejected.

### Backtest Results

Components:

- Strategy return.
- Buy & Hold return.
- Max drawdown.
- Number of trades.
- Win rate.
- Simple equity curve or compact result table.

Purpose:

- Prove the strategy spec is backtestable.
- Avoid relying only on a current signal.

### Strategy Specification

Components:

- Entry rules.
- Exit rules.
- Risk rules.
- Invalidation rules.
- Data sources used.
- Timestamp.
- Copy/export button.

Purpose:

- Show the actual Track 2 deliverable.
- Make the output reusable and inspectable.

## User Journey 1 - Risk-Approved Strategy

Goal:

- Show that Sentinel Alpha can generate a structured strategy when market and risk conditions are acceptable.

Steps:

1. User opens dashboard.
2. User selects `4H`.
3. Dashboard loads BNB market snapshot.
4. Market regime shows a positive or controlled trend.
5. Strategy output shows `BUY`.
6. Risk guards mostly show `Pass`.
7. Backtest shows Sentinel Alpha compared with Buy & Hold.
8. User opens strategy specification and sees entry, exit, and risk rules.

Demo message:

> "This is not a blind buy signal. It is a backtestable strategy spec that passed the risk filters."

## User Journey 2 - Risk-Rejected Strategy

Goal:

- Show that Sentinel Alpha can reject unsafe strategies and explain why.

Steps:

1. User switches to `1H`.
2. Dashboard updates market snapshot and indicators.
3. Market regime shows choppy, overheated, or high-volatility conditions.
4. Strategy output shows `WAIT` or `EXIT`.
5. Risk guard panel shows one or more `Fail` statuses.
6. Explanation states why the strategy is rejected.
7. Backtest panel shows weak performance, high drawdown, or insufficient confidence.

Demo message:

> "The strongest feature is restraint. The skill refuses to trade when the risk profile is poor."

## UI Rules

- Keep the dashboard dense but readable.
- Do not create a marketing landing page as the first screen.
- Do not include wallet connection UI.
- Do not include live trading controls.
- Use clear status colors:
  - Green for pass.
  - Yellow for warning.
  - Red for fail.
  - Neutral gray for unavailable data.
- Always show simulated-only language.

