# Sentinel Alpha Skill - Technical Architecture

## Proposed Technical Stack

Recommended minimal stack:

- Frontend and app shell: Next.js with TypeScript.
- UI styling: Tailwind CSS plus a small component set.
- Backend API routes: Next.js server routes.
- Data source: CoinMarketCap REST API first, with optional CMC MCP integration if the target demo environment supports it.
- Data processing: TypeScript service modules for fetching, normalization, indicator handling, strategy rules, risk guards, and backtesting.
- Storage: none for version 1, except optional local JSON cache for demo stability.
- Deployment: Vercel or a simple Node hosting target.

Why this stack:

- Simple for one founder to build and demo.
- Keeps secrets on the server.
- Works well for a dashboard.
- Avoids separate frontend/backend deployment complexity.
- Can later swap REST calls for CMC MCP calls behind the same data service.

## Data Flow

1. User opens dashboard.
2. Dashboard requests a BNB/USDT strategy snapshot from the app backend.
3. Backend fetches CoinMarketCap data.
4. Backend normalizes market data into a simple internal format.
5. Indicator and regime module prepares RSI, MACD, EMA, ATR, and Fear & Greed inputs.
6. Strategy module generates a structured strategy specification.
7. Risk guard module validates or rejects the proposed decision.
8. Backtest module runs the same strategy rules on historical candles.
9. Backend returns dashboard-ready output.
10. Frontend displays market snapshot, decision, explanations, risk guards, and backtest comparison.

Text diagram:

```text
Dashboard
  -> Server API route
    -> CMC data adapter
      -> Market data normalization
        -> Indicator/regime engine
          -> Strategy specification generator
            -> Risk guard validator
              -> Backtest engine
                -> Dashboard response
```

## Modules

### 1. Dashboard UI

Purpose:

- Present the product clearly in a live demo.
- Let the user switch between `1H` and `4H`.
- Show the decision, explanation, risk status, and backtest result without technical clutter.

Definition of Done:

- Shows latest market snapshot.
- Shows selected timeframe.
- Shows `BUY`, `WAIT`, or `EXIT`.
- Shows at least three risk guards.
- Shows backtest vs Buy & Hold.
- Shows "simulated only, no live trading" disclaimer.

### 2. Data Adapter

Purpose:

- Hide whether data comes from CMC REST API, CMC MCP, or a demo fixture.
- Return a stable app-friendly shape.

Inputs:

- Asset: `BNB`.
- Quote currency: `USDT` or `USD`, depending on available CMC endpoint behavior.
- Timeframe: `1H` or `4H`.

Outputs:

- Latest price.
- 24h price change.
- Volume.
- Historical OHLCV candles.
- Fear & Greed value.
- Indicator values where available.

Definition of Done:

- Handles successful CMC response.
- Handles missing fields.
- Handles API errors.
- Never exposes API keys to the browser.
- Can fall back to a small demo fixture if live data fails during presentation.

### 3. Indicator and Regime Engine

Purpose:

- Convert raw market inputs into plain-language market state.

Indicators:

- RSI for momentum exhaustion.
- MACD for momentum confirmation.
- EMA trend filter.
- ATR for volatility and stop sizing.
- Fear & Greed for broad sentiment filter.

Possible regimes:

- Bullish trend.
- Bearish trend.
- Choppy/sideways.
- High-volatility risk zone.
- Sentiment overheated.
- Sentiment fearful.

Definition of Done:

- Produces one market regime label.
- Produces short reasons for the regime.
- Handles unavailable indicator data by returning "unknown" instead of failing the app.

### 4. Strategy Specification Generator

Purpose:

- Generate a reusable, structured strategy spec that can be backtested.

Strategy spec should include:

- Asset.
- Timeframe.
- Decision.
- Entry conditions.
- Exit conditions.
- Risk invalidation rules.
- Stop-loss logic.
- Position sizing assumption for simulation.
- Maximum drawdown guard.
- Data sources used.
- Timestamp.

Definition of Done:

- Output is deterministic for the same input data.
- Output is machine-readable and human-readable.
- Output never contains live trading instructions.
- Output can be passed into the backtest module.

### 5. Risk Guard Validator

Purpose:

- Reject weak or dangerous strategies before the final decision is shown.

Initial guards:

- Trend confirmation required for `BUY`.
- RSI cannot be extremely overheated for new entries.
- ATR cannot exceed a configured volatility threshold.
- Fear & Greed cannot be in an extreme-risk state for new entries unless trend and backtest quality are strong.
- Backtest maximum drawdown must stay below the configured cap.
- Strategy must have enough historical candles to test.

Definition of Done:

- Produces `pass`, `fail`, or `warning` for each guard.
- Explains every failed guard.
- Can override a raw `BUY` into `WAIT`.
- Can override a raw hold into `EXIT` if risk conditions break.

### 6. Backtest Engine

Purpose:

- Prove that the strategy specification is testable.
- Compare strategy results against Buy & Hold.

Approach:

- Use historical OHLCV candles for BNB.
- Simulate entry and exit rules from the strategy spec.
- Include simple transaction cost assumption.
- Track total return, max drawdown, number of trades, win rate, and exposure time.
- Compare against buying at the first candle and holding to the last candle.

Definition of Done:

- Runs on both `1H` and `4H`.
- Returns strategy return and Buy & Hold return.
- Returns max drawdown.
- Returns number of simulated trades.
- Shows when the backtest is inconclusive due to limited data.

## API/MCP Integration Approach

### Recommended Default: CoinMarketCap REST API

Use REST API first because it is easiest to control inside a standalone web app.

Useful CMC API areas to verify during implementation:

- Cryptocurrency quotes/latest for BNB price and 24h metrics.
- Cryptocurrency OHLCV historical for candles.
- Fear & Greed latest and historical.
- Any CMC technical-analysis endpoint or MCP tool that directly returns RSI, MACD, EMA, and ATR.

API key rule:

- Store `CMC_API_KEY` only in server environment variables.
- Send requests from server routes only.
- Never put the key in frontend code or public config.

### Optional: CMC MCP

The BNB Hack Track 2 description references CMC MCP and CMC Skills. CMC documentation also shows a remote MCP server configuration using `https://mcp.coinmarketcap.com/mcp` with an `X-CMC-MCP-API-KEY` header.

For this project, MCP should be treated as an integration option behind the same data adapter:

- If the final demo environment supports CMC MCP, call MCP tools for quotes, technicals, sentiment, and market data.
- If the local app environment does not support direct MCP calls, use REST API.

Current Codex note:

- This Codex session does not expose CMC MCP as a callable tool by default.
- Implementation should not depend on Codex directly calling CMC MCP unless the MCP server is explicitly configured later.

## Backtest Approach

Keep the backtest simple, honest, and explainable.

Initial assumptions:

- One asset only: BNB.
- Start with no position.
- Simulated position size: 100% of test capital when in market.
- No leverage.
- No shorting in version 1.
- Transaction cost: fixed assumption, displayed in the UI.
- Signals evaluated at candle close.
- Trades enter at next candle open or next available price.
- Compare against Buy & Hold over the same period.

Metrics:

- Strategy return.
- Buy & Hold return.
- Max drawdown.
- Trade count.
- Win rate.
- Average trade return.
- Exposure time.

Risk-first rule:

- A strategy can show positive return and still be rejected if drawdown or volatility is unacceptable.

## Error Handling

Expected failure cases:

- CMC API key missing.
- CMC API rate limit.
- CMC endpoint unavailable.
- Historical candle data incomplete.
- Indicator values unavailable.
- Network timeout.
- Backtest has too few candles.

Behavior:

- Show a clear, non-technical error in the dashboard.
- Do not crash the page.
- Display stale/demo data only if clearly labeled.
- Mark strategy output as `WAIT` when required data is missing.
- Log technical details on the server only.

## Security Rules for API Keys

- Store API keys in `.env.local` for local development.
- Store production keys in deployment provider environment variables.
- Never commit `.env.local`.
- Never expose `CMC_API_KEY` through frontend variables.
- Never log the full API key.
- Never include secrets in screenshots, demo recordings, or exported strategy specs.
- Add `.env.example` with placeholder names only during implementation.

## Deployment Approach

Recommended deployment:

- Host the Next.js app on Vercel.
- Configure `CMC_API_KEY` in Vercel environment variables.
- Use server routes for all CMC requests.
- Keep the app read-only.
- Add a demo fallback data mode for presentation reliability.

Live demo checklist:

- Dashboard loads in under a few seconds.
- User can switch `1H` and `4H`.
- Strategy output updates.
- Risk guard rejection is visible.
- Backtest comparison is visible.
- No wallet connection exists anywhere in the UI.

## Official References Checked

- BNB Chain announcement for BNB Hack: AI Trading Agents.
- CoinMarketCap AI Agent Hub Skills overview.
- CoinMarketCap API reference for cryptocurrency and global metrics.
- CoinMarketCap Fear & Greed latest and historical endpoints.

