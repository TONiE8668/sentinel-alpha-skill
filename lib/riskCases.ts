import type { GuardCheckStatus } from "@/types/strategy";

export type RiskCase = {
  id: string;
  title: string;
  regime: "Bullish" | "Sideways" | "High Risk";
  source: "live_cmc_current" | "controlled_replay";
  marketCondition: string;
  decision: "BUY" | "WAIT" | "EXIT";
  guardStatus: "PASSED" | "BLOCKED";
  primaryGuard: string;
  simulatedReturn: number;
  buyHoldReturn: number;
  maxDrawdown: number;
  drawdownSaved: number;
  checks: Array<{
    label: string;
    status: GuardCheckStatus;
  }>;
  takeaway: string;
};

export const riskCaseLibrary: RiskCase[] = [
  {
    id: "trend-confirmed-4h",
    title: "Trend-confirmed continuation",
    regime: "Bullish",
    source: "controlled_replay",
    marketCondition:
      "Price holds above EMA20/EMA50, MACD confirms, RSI remains below the overheat zone, and volatility is normal.",
    decision: "BUY",
    guardStatus: "PASSED",
    primaryGuard: "Trend confirmation",
    simulatedReturn: 9.8,
    buyHoldReturn: 6.1,
    maxDrawdown: 5.4,
    drawdownSaved: 0.7,
    checks: [
      { label: "Trend", status: "Pass" },
      { label: "Momentum", status: "Pass" },
      { label: "Volatility", status: "Pass" },
      { label: "Sentiment", status: "Pass" },
      { label: "Drawdown", status: "Pass" }
    ],
    takeaway:
      "The skill allows a small simulated allocation only when all guards agree."
  },
  {
    id: "mixed-trend-chop",
    title: "Mixed trend chop",
    regime: "Sideways",
    source: "controlled_replay",
    marketCondition:
      "EMA structure is mixed and MACD is flat, so the setup is not dangerous enough for a hard block but not clean enough for entry.",
    decision: "WAIT",
    guardStatus: "PASSED",
    primaryGuard: "Trend confirmation",
    simulatedReturn: 1.4,
    buyHoldReturn: -0.8,
    maxDrawdown: 4.9,
    drawdownSaved: 2.1,
    checks: [
      { label: "Trend", status: "Warning" },
      { label: "Momentum", status: "Pass" },
      { label: "Volatility", status: "Pass" },
      { label: "Sentiment", status: "Pass" },
      { label: "Drawdown", status: "Pass" }
    ],
    takeaway:
      "The skill preserves optionality by refusing to manufacture conviction in a choppy market."
  },
  {
    id: "volatility-drawdown-shock",
    title: "Volatility and drawdown shock",
    regime: "High Risk",
    source: "controlled_replay",
    marketCondition:
      "RSI is overheated, MACD rolls over, ATR is extreme, and the recent strategy path breaches the 12% drawdown guard.",
    decision: "WAIT",
    guardStatus: "BLOCKED",
    primaryGuard: "Volatility + drawdown",
    simulatedReturn: -3.6,
    buyHoldReturn: -8.1,
    maxDrawdown: 14.9,
    drawdownSaved: 5.3,
    checks: [
      { label: "Trend", status: "Warning" },
      { label: "Momentum", status: "Fail" },
      { label: "Volatility", status: "Fail" },
      { label: "Sentiment", status: "Fail" },
      { label: "Drawdown", status: "Fail" }
    ],
    takeaway:
      "The skill blocks the trade before entry and records exactly why allocation must stay at 0%."
  }
];
