import type { StrategySpecification } from "@/types/strategy";

export type SpecValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

const ACTIONS = new Set(["BUY", "WAIT", "EXIT"]);
const GUARD_STATUSES = new Set(["PASSED", "BLOCKED"]);
const CHECK_STATUSES = new Set(["Pass", "Warning", "Fail"]);
const MARKET_REGIMES = new Set(["Bullish", "Bearish", "Sideways", "High Risk"]);

export function validateStrategySpecification(
  spec: StrategySpecification
): SpecValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  requireString(spec.specVersion, "specVersion", errors);
  requireEqual(spec.product, "Sentinel Alpha Skill", "product", errors);
  requireEqual(spec.mode, "simulation_only", "mode", errors);
  requireEqual(spec.asset, "BNB/USDT", "asset", errors);
  requireIsoDate(spec.generatedAt, "generatedAt", errors);

  if (!spec.marketContext) {
    errors.push("marketContext is required.");
  } else {
    requireFiniteNumber(spec.marketContext.currentPrice, "marketContext.currentPrice", errors);
    requireFiniteNumber(spec.marketContext.change24h, "marketContext.change24h", errors);
    requireRange(spec.marketContext.rsi, 0, 100, "marketContext.rsi", errors);
    requireRange(
      spec.marketContext.fearGreed?.score,
      0,
      100,
      "marketContext.fearGreed.score",
      errors
    );
  }

  if (!MARKET_REGIMES.has(spec.marketRegime?.label)) {
    errors.push("marketRegime.label must be Bullish, Bearish, Sideways, or High Risk.");
  }

  if (!ACTIONS.has(spec.decision?.action)) {
    errors.push("decision.action must be BUY, WAIT, or EXIT.");
  }

  requireRange(spec.decision?.confidenceScore, 0, 100, "decision.confidenceScore", errors);

  if (!spec.rules?.entry || !spec.rules.exit || !spec.rules.stopLoss || !spec.rules.positionSizing) {
    errors.push("rules must include entry, exit, stopLoss, and positionSizing.");
  }

  if (!GUARD_STATUSES.has(spec.riskGuard?.status)) {
    errors.push("riskGuard.status must be PASSED or BLOCKED.");
  }

  if (!Array.isArray(spec.riskGuard?.checks) || spec.riskGuard.checks.length < 5) {
    errors.push("riskGuard.checks must include at least five checks.");
  } else {
    for (const check of spec.riskGuard.checks) {
      if (!check.label || !check.detail || !CHECK_STATUSES.has(check.status)) {
        errors.push(`riskGuard check "${check.label || "unknown"}" is incomplete.`);
      }
    }
  }

  if (
    spec.riskGuard?.status === "BLOCKED" &&
    (!Array.isArray(spec.riskGuard.blockedReasons) || spec.riskGuard.blockedReasons.length === 0)
  ) {
    errors.push("BLOCKED riskGuard must include blockedReasons.");
  }

  if (spec.riskGuard?.status === "BLOCKED" && spec.decision?.action === "BUY") {
    errors.push("A BLOCKED strategy spec cannot approve a BUY decision.");
  }

  if (spec.decision?.action !== "BUY" && !spec.rules?.positionSizing.includes("0%")) {
    warnings.push("Non-BUY specs should explicitly keep allocation at 0%.");
  }

  requireFiniteNumber(spec.backtestSummary?.simulatedReturn, "backtestSummary.simulatedReturn", errors);
  requireFiniteNumber(spec.backtestSummary?.maxDrawdown, "backtestSummary.maxDrawdown", errors);
  requireRange(spec.backtestSummary?.winRate, 0, 100, "backtestSummary.winRate", errors);
  requireFiniteNumber(spec.backtestSummary?.buyHoldReturn, "backtestSummary.buyHoldReturn", errors);

  if (!Number.isInteger(spec.backtestSummary?.numberOfTrades)) {
    errors.push("backtestSummary.numberOfTrades must be an integer.");
  }

  if (!Array.isArray(spec.safetyConstraints) || spec.safetyConstraints.length < 6) {
    errors.push("safetyConstraints must include at least six constraints.");
  }

  if (!spec.dataSource?.type || !spec.dataSource.marketData || !spec.dataSource.indicators) {
    errors.push("dataSource must include type, marketData, and indicators.");
  }

  if (spec.dataSource?.marketData === "fixture") {
    warnings.push("Market data is in fixture mode; use a configured CMC_API_KEY for the strongest demo.");
  }

  if (spec.dataSource?.indicators === "fixture" || spec.dataSource?.backtest === "fixture") {
    warnings.push("Indicators or backtest are fixture-backed; CMC OHLCV access improves judging strength.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function requireString(value: unknown, label: string, errors: string[]) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${label} must be a non-empty string.`);
  }
}

function requireEqual(value: unknown, expected: string, label: string, errors: string[]) {
  if (value !== expected) {
    errors.push(`${label} must equal "${expected}".`);
  }
}

function requireFiniteNumber(value: unknown, label: string, errors: string[]) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${label} must be a finite number.`);
  }
}

function requireRange(
  value: unknown,
  min: number,
  max: number,
  label: string,
  errors: string[]
) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    errors.push(`${label} must be a number from ${min} to ${max}.`);
  }
}

function requireIsoDate(value: unknown, label: string, errors: string[]) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    errors.push(`${label} must be an ISO date string.`);
  }
}
