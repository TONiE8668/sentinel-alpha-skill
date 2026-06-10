# Sentinel Alpha Skill - Build Plan

Build window covered here: June 4 to June 20, 2026.

The plan assumes one non-code founder using AI coding assistance. It keeps the product narrow, demoable, and submission-ready.

## Phase 1 - Product and Architecture

### June 4, 2026

Deliverables:

- Confirm project concept.
- Confirm Track 2 scope.
- Write product brief.
- Define no-wallet and no-live-trading boundaries.

Done when:

- Product can be explained in one sentence.
- Scope is limited to BNB/USDT, 1H, and 4H.
- Submission narrative is risk-first strategy generation.

### June 5, 2026

Deliverables:

- Define technical architecture.
- Choose default stack.
- Identify CMC API/MCP integration questions.
- Decide dashboard sections.

Done when:

- Architecture supports REST API first and optional MCP later.
- API keys stay server-side.
- Dashboard is planned around demo clarity.

### June 6, 2026

Deliverables:

- Define strategy specification format.
- Define risk guard list.
- Define backtest metrics.
- Prepare initial UI wireframe.

Done when:

- The strategy output is both human-readable and backtestable.
- Risk rejection is a first-class feature, not a footnote.

## Phase 2 - App Foundation

### June 7, 2026

Deliverables:

- Create planning package.
- Verify official CMC and BNB Hack documentation links.
- Decide first coding task.

Done when:

- `PRODUCT_BRIEF.md`, `TECH_ARCHITECTURE.md`, `BUILD_PLAN.md`, `UI_WIREFRAME.md`, and `OPEN_QUESTIONS.md` exist.
- Product owner approves the plan.

### June 8, 2026

Deliverables:

- Scaffold minimal Next.js TypeScript app.
- Add Tailwind CSS.
- Create static dashboard layout.
- Add no-live-trading disclaimer.

Done when:

- App runs locally.
- Dashboard shell matches the wireframe.
- No CMC integration yet.

### June 9, 2026

Deliverables:

- Add backend API route for strategy snapshot.
- Add demo fixture data.
- Render market snapshot and placeholder decision.

Done when:

- Frontend fetches from backend route.
- Dashboard works without real API credentials.
- Fixture mode is clearly labeled.

## Phase 3 - Data and Signals

### June 10, 2026

Deliverables:

- Add CMC REST data adapter.
- Fetch BNB latest quote.
- Fetch Fear & Greed latest.
- Add server-side environment variable handling.

Done when:

- API key is never exposed to browser.
- Missing API key produces a friendly setup error.
- Latest market snapshot renders from live data.

### June 11, 2026

Deliverables:

- Fetch or prepare historical candle data.
- Confirm CMC endpoint support for 1H and 4H OHLCV.
- Add data normalization layer.

Done when:

- App can load enough candles for a basic backtest.
- Missing candle data causes `WAIT`, not a crash.

### June 12, 2026

Deliverables:

- Add RSI, MACD, EMA, and ATR handling.
- Use CMC pre-computed indicators if available.
- Otherwise compute indicators from candles as a fallback.

Done when:

- Indicator values exist for both 1H and 4H.
- Each indicator has a plain-language interpretation.

## Phase 4 - Strategy and Risk

### June 13, 2026

Deliverables:

- Build market regime classifier.
- Build initial strategy decision rules.
- Generate structured strategy specification.

Done when:

- App produces `BUY`, `WAIT`, or `EXIT`.
- Strategy spec includes entry, exit, risk, and invalidation rules.

### June 14, 2026

Deliverables:

- Build risk guard validator.
- Add rejection explanations.
- Ensure failed guards override risky `BUY` decisions.

Done when:

- Dashboard shows pass/fail/warning guard status.
- Risk rejection is understandable to a non-technical viewer.

### June 15, 2026

Deliverables:

- Connect strategy output to UI.
- Add timeframe switcher for `1H` and `4H`.
- Add decision explanation panel.

Done when:

- User can switch timeframe and see updated decision logic.
- UI makes it obvious that decisions are simulated only.

## Phase 5 - Backtesting

### June 16, 2026

Deliverables:

- Implement simple backtest engine.
- Simulate strategy entries and exits.
- Add transaction cost assumption.

Done when:

- Backtest returns strategy return, max drawdown, trade count, and win rate.
- Backtest uses the same strategy rules shown in the spec.

### June 17, 2026

Deliverables:

- Add Buy & Hold comparison.
- Add backtest chart or compact result table.
- Add inconclusive-data state.

Done when:

- Dashboard clearly compares Sentinel Alpha vs Buy & Hold.
- Weak or insufficient backtests can block a `BUY`.

## Phase 6 - Demo Polish

### June 18, 2026

Deliverables:

- Improve dashboard visual hierarchy.
- Add loading, error, and fallback states.
- Add export/copy strategy spec button if time allows.

Done when:

- Demo can be understood in under one minute.
- Risk-first differentiator is visible without explanation.

### June 19, 2026

Deliverables:

- Run end-to-end tests.
- Record demo script.
- Prepare submission text.
- Verify no wallet/live trading behavior exists.

Done when:

- Demo scenario 1 and scenario 2 both work.
- Submission materials explain Track 2 fit clearly.

### June 20, 2026

Deliverables:

- Final bug fixes.
- Deploy app.
- Record final video.
- Prepare final submission package.

Done when:

- Public demo URL works.
- Repo is clean and documented.
- Demo video shows market snapshot, strategy output, risk rejection, and backtest comparison.

## Module Definition of Done

### Dashboard

- Shows market snapshot, regime, strategy decision, risk guards, and backtest.
- Works on laptop screen.
- Has no wallet connection.
- Has clear simulated-only language.

### Data Adapter

- Fetches CMC data server-side.
- Handles missing keys and API errors.
- Supports fixture fallback.
- Normalizes responses into a stable format.

### Indicator Engine

- Provides RSI, MACD, EMA, ATR, and Fear & Greed values or clear unavailable states.
- Produces plain-language interpretations.
- Works for both selected timeframes.

### Strategy Generator

- Produces `BUY`, `WAIT`, or `EXIT`.
- Produces a structured strategy spec.
- Uses deterministic rules for demo reliability.
- Never outputs live-trade execution instructions.

### Risk Guard Validator

- Blocks unsafe entries.
- Explains failed guards.
- Can change `BUY` to `WAIT`.
- Can trigger `EXIT` when simulated exposure should be closed.

### Backtest Engine

- Uses historical candles.
- Compares against Buy & Hold.
- Includes transaction costs.
- Reports return, drawdown, trades, and win rate.

## Testing Checklist

- Dashboard loads with fixture data.
- Dashboard loads with live CMC data.
- Missing API key shows setup error.
- Invalid API key shows friendly error.
- API rate-limit response does not crash app.
- `1H` timeframe works.
- `4H` timeframe works.
- `BUY` state can be displayed.
- `WAIT` state can be displayed.
- `EXIT` state can be displayed.
- Failed risk guard overrides risky entry.
- Backtest runs with enough candles.
- Backtest handles insufficient candles.
- Buy & Hold comparison uses the same date range.
- No wallet button exists.
- No transaction signing code exists.
- No API key appears in browser network responses.
- No API key appears in logs.
- Deployed app works from a clean browser session.

## Submission Checklist

- Public demo URL.
- GitHub repository URL.
- Demo video.
- Short project description.
- Track 2 explanation.
- CMC data usage explanation.
- Risk-first differentiator explanation.
- Backtest methodology summary.
- Clear disclaimer: simulated strategy decisions only.
- Confirmation: no wallet, no live trading, no execution layer.
- List of known limitations.
- Future roadmap.

