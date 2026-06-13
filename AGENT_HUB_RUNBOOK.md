# Agent Hub Runbook

This runbook explains how to prove that **Sentinel Alpha Skill** runs as a
Track 2 CMC Skill, not only as a web dashboard.

Project: Sentinel Alpha Skill  
Hackathon: BNB Hack: AI Trading Agent Edition  
Track: Track 2 - Strategy Skills  
Repo: https://github.com/TONiE8668/sentinel-alpha-skill  
Dashboard: https://sentinel-alpha-skill.vercel.app/

## What The Proof Must Show

For Track 2, the important proof is:

1. A CMC/Agent-Hub-capable agent reads the Sentinel Alpha Skill instructions.
2. The agent uses CoinMarketCap market data where available.
3. The agent outputs a backtestable Strategy Specification JSON.
4. The output follows `skill/sentinel-alpha/strategy-spec.schema.json`.
5. Unsafe market setups are refused as `WAIT` with allocation 0%.

This is the product claim:

> Sentinel Alpha turns CMC market data into a validated, backtestable strategy
> spec and blocks unsafe simulated entries before they become trades.

## Local Product Check

Run the reference implementation locally before recording any Agent Hub proof.

```powershell
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://localhost:3000
http://localhost:3000/api/judge-report
http://localhost:3000/api/strategy-spec?mode=live&timeframe=4H
http://localhost:3000/api/strategy-spec?mode=stress&timeframe=1H
```

Quality gates:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
```

Expected result:

- `/api/strategy-spec?mode=live&timeframe=4H` returns `validation.valid: true`.
- `/api/strategy-spec?mode=stress&timeframe=1H` returns `riskGuard.status: BLOCKED`.
- `/api/judge-report` returns both live and stress specs plus data provenance.

## Required Files For Agent Hub

The Track 2 skill package is in:

```text
skill/sentinel-alpha/SKILL.md
skill/sentinel-alpha/strategy-spec.schema.json
skill/sentinel-alpha/examples/spec-buy-approved.json
skill/sentinel-alpha/examples/spec-wait-blocked.json
```

Use `SKILL.md` as the agent instruction file and
`strategy-spec.schema.json` as the output contract.

## CMC MCP Configuration

Use the CMC MCP server with a server-side API key. Do not paste the real key
into screenshots, public issues, GitHub, DoraHacks, or chat logs.

Example MCP configuration:

```json
{
  "mcpServers": {
    "cmc-mcp": {
      "url": "https://mcp.coinmarketcap.com/mcp",
      "headers": {
        "X-CMC-MCP-API-KEY": "YOUR_CMC_API_KEY"
      }
    }
  }
}
```

If the official Agent Hub UI provides a Skill import/composer flow, import or
paste these files:

1. `skill/sentinel-alpha/SKILL.md`
2. `skill/sentinel-alpha/strategy-spec.schema.json`
3. one example from `skill/sentinel-alpha/examples/`

If the Agent Hub UI does not expose import yet, use any MCP-capable agent
runner that can connect to the CMC MCP server. The proof is still valid if the
run shows CMC tool calls and schema-valid strategy JSON.

## Agent Prompt

Use this prompt for the Agent Hub or MCP runner:

```text
Use the Sentinel Alpha Skill instructions from SKILL.md.

Task:
Generate a simulated Sentinel Alpha strategy specification for BNB/USDT on the
4H timeframe.

Requirements:
- Use CoinMarketCap MCP tools where available for latest BNB quote, market
  context, and technical analysis.
- If OHLCV or technical analysis is unavailable on the current CMC API plan,
  say so in dataSource and use a transparent fallback only for candles.
- Output only JSON.
- The JSON must follow strategy-spec.schema.json.
- Simulation only: no wallet connection, no live trading, no transaction
  signing, no financial advice.
- If any risk guard fails, output WAIT with allocation 0%.
```

For the refusal proof, run a second prompt:

```text
Use the Sentinel Alpha Skill instructions from SKILL.md.

Task:
Generate a simulated Sentinel Alpha strategy specification for BNB/USDT under
an overheated market setup:
- RSI is 76.
- MACD is bearish.
- ATR volatility is Extreme.
- Fear & Greed is 82 if sentiment data is unavailable.

Output only JSON following strategy-spec.schema.json. The risk guard must block
unsafe entry if the setup fails the rules.
```

## What To Capture As Proof

Capture these screenshots before final DoraHacks submission:

1. Agent Hub or MCP runner showing the CMC MCP connection configured.
2. Agent run showing CMC tool calls for BNB market data.
3. Final JSON output with:
   - `product: "Sentinel Alpha Skill"`
   - `decision.action`
   - `riskGuard.status`
   - `backtestSummary`
   - `dataSource`
4. Schema validation proof from the local endpoint:
   - `/api/strategy-spec?mode=live&timeframe=4H`
   - `validation.valid: true`
5. Stress/refusal proof:
   - `/api/strategy-spec?mode=stress&timeframe=1H`
   - `riskGuard.status: "BLOCKED"`
6. Dashboard proof:
   - CMC Data Proof panel
   - Risk Guard Case Library panel

Suggested filenames:

```text
proof-01-agent-hub-cmc-mcp.png
proof-02-agent-hub-cmc-tool-call.png
proof-03-agent-hub-json-output.png
proof-04-local-live-validation.png
proof-05-local-stress-blocked.png
proof-06-dashboard-data-proof.png
```

## Current Data Honesty Rules

Be explicit about data source status:

- CMC quote and Fear & Greed are live when `CMC_API_KEY` is configured.
- CMC OHLCV is used when the active CMC plan allows it.
- Until CMC Pro access is granted, historical candles may fall back to public
  exchange klines.
- Scenario B is a controlled stress test. It uses live CMC market context where
  available, but its RSI/MACD/ATR/backtest inputs are intentionally controlled
  to prove the refusal path.
- Fixture or fallback data must never be described as live CMC historical data.

This honesty is part of the product quality. Judges should be able to inspect
`dataSource` and understand exactly what was live, what was fallback, and why.

## Submission Wording

Use this wording if asked whether the project runs in Agent Hub:

```text
Sentinel Alpha is packaged as a CMC Skill in skill/sentinel-alpha/SKILL.md with
a JSON output contract in strategy-spec.schema.json. I tested the same skill
logic through the local reference implementation and through a CMC MCP-capable
agent run. The dashboard is the reference implementation; the Skill files are
the Track 2 artifact.
```

Use this wording if CMC Pro has not been enabled yet:

```text
The current build uses live CMC quote and sentiment data. CMC OHLCV is wired as
the preferred candle source, but until the hackathon Pro upgrade is enabled the
app transparently falls back to public exchange candles for indicators and
backtest. The output spec records this in dataSource instead of presenting
fallback candles as CMC historical data.
```

## Final Pre-Submission Checklist

- CMC API key is configured locally and in Vercel environment variables.
- `/api/judge-report` works after final deploy.
- `/api/strategy-spec?mode=live&timeframe=4H` returns valid JSON.
- `/api/strategy-spec?mode=stress&timeframe=1H` returns blocked WAIT JSON.
- Agent Hub or MCP proof screenshots are captured.
- DoraHacks submission links point to the final deployed Vercel URL.
- GitHub repo is public.
- No API key, wallet secret, or private key is committed or visible in media.
