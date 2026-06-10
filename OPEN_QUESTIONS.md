# Sentinel Alpha Skill - Open Questions

These items should be verified from official CoinMarketCap or BNB Hack documentation before implementation.

## Highest Priority

### 1. Can this Codex environment directly use CMC MCP?

Current finding:

- CoinMarketCap documentation describes a remote MCP server at `https://mcp.coinmarketcap.com/mcp` using an `X-CMC-MCP-API-KEY` header.
- The BNB Hack Track 2 description references CMC MCP, pre-computed indicators, and CMC Skills.
- This current Codex session does not expose CMC MCP as an available callable tool.

Decision for now:

- Build the standalone app using the CoinMarketCap REST API first.
- Keep the data adapter flexible so MCP can be added later if the demo or submission environment supports it.

Must verify:

- Whether BNB Hack expects a submitted CMC Skill artifact, a web app demo, a public repo, or all of these.
- Whether competitors receive direct CMC MCP credentials.
- Whether CMC MCP can be called from a hosted web backend, or only from local MCP-compatible agent environments.
- Whether Codex desktop can be configured with the CMC MCP server for this project.

### 2. Which CMC endpoint or MCP tool provides RSI, MACD, EMA, and ATR?

Current finding:

- BNB Hack Track 2 references CMC pre-computed indicators: RSI, MACD, EMA, ATR, and Fear & Greed.
- CMC Agent Hub docs mention technical-analysis capabilities.
- The exact REST endpoint or MCP tool contract for BNB-specific technical indicators should be verified before coding.

Decision for now:

- Prefer CMC-provided indicator values if available.
- If unavailable through REST API, compute RSI, MACD, EMA, and ATR from historical OHLCV candles.
- Clearly label computed indicators as app-computed, not CMC pre-computed.

Must verify:

- Tool name or endpoint name for technical analysis.
- Whether it supports BNB.
- Whether it supports 1H and 4H.
- Whether values are returned per asset, pair, exchange, or global market.
- Whether historical indicator series are available for backtesting.

### 3. Does CMC OHLCV historical support BNB/USDT with 1H and 4H intervals?

Must verify:

- Supported interval values.
- Whether the endpoint returns USD quotes, USDT quotes, or exchange-specific BNB/USDT candles.
- Whether free/basic plans include enough historical candle data.
- Rate limits and credit costs.

Fallback:

- Use CMC for latest quotes and sentiment.
- Use another documented historical source only if official hackathon rules allow it.
- If using any non-CMC fallback, clearly explain it in the submission.

### 4. What exactly is the expected Track 2 submission format?

Must verify:

- Whether the deliverable must be packaged as a CMC Skill.
- Whether a dashboard is allowed as the main demo surface.
- Whether strategy specs need a specific schema.
- Whether submission needs to be listed in a Skills Marketplace or public GitHub repository.
- Whether BNB Chain Skills Hub metadata is required.

## API and Data Questions

### Fear & Greed

Verified direction:

- CMC provides latest and historical Fear & Greed endpoints.

Must verify during implementation:

- Whether latest value is enough for the strategy guard.
- Whether historical Fear & Greed should be included in backtesting.
- Whether the update cadence affects demo behavior.

### BNB Identity

Must verify:

- Correct CoinMarketCap asset ID for BNB.
- Whether CMC symbol lookup is stable enough or whether the app should use CMC ID.

Recommended:

- Use CMC ID once verified, not just symbol text.

### Quote Currency

Must verify:

- Whether CMC returns BNB in USD only or can support USDT quote.
- Whether the dashboard should label the pair as `BNB/USDT` if CMC quote is technically USD.

Recommended:

- If the data is USD quote, show `BNB/USD proxy` or explain the limitation.
- For the hackathon narrative, keep asset label focused on BNB market strategy.

### Historical Data Window

Must verify:

- How many candles can be fetched on the available CMC plan.
- Whether that is enough for MACD, ATR, and a credible backtest.

Recommended:

- Minimum for demo: enough candles for indicators plus at least several weeks of 1H data or several months of 4H data.

## Hackathon Rules Questions

Must verify:

- Final submission deadline and timezone.
- Whether Track 2 submissions are due June 21, 2026, end of build window.
- Whether using Trust Wallet Agent Kit is unnecessary or discouraged for Track 2.
- Whether no execution layer is acceptable and clearly aligned with Track 2.
- Whether special prize eligibility requires CMC Agent Hub usage specifically through MCP rather than REST API.
- Whether there are required tags, README sections, or demo video length limits.

## Product and Compliance Questions

Must verify:

- Required disclaimer wording for simulated trading strategy tools.
- Whether any jurisdiction-specific financial-advice disclaimer is required.
- Whether strategy output may use words like `BUY` and `EXIT` if clearly labeled simulated.

Recommended:

- Use "simulated strategy decision" everywhere.
- Avoid "financial advice" language.
- Avoid showing any real-money position size.

## Deployment Questions

Must verify:

- Whether Vercel deployment is acceptable.
- Whether environment variables are supported in chosen deployment target.
- Whether CMC API key usage from serverless routes is allowed by the API plan.
- Whether demo fixture fallback is acceptable if live API rate limits occur.

## Official Sources to Recheck

- BNB Chain BNB Hack announcement: https://www.bnbchain.org/en/blog/build-and-compete-for-36-000-in-bnb-hack-ai-trading-agents-by-bnb-chain-coinmarketcap-and-trust-wallet
- CoinMarketCap AI Agent Hub Skills overview: https://coinmarketcap.com/api/documentation/ai-agent-hub/skills/overview
- CoinMarketCap API reference: https://coinmarketcap.com/api/documentation/pro-api-reference
- CoinMarketCap Global Metrics/Fear & Greed docs: https://coinmarketcap.com/api/documentation/pro-api-reference/global-metrics
- CoinMarketCap API docs home: https://coinmarketcap.com/api/documentation/

