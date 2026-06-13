import { expect, test } from "@playwright/test";

test("health endpoint exposes safe deployment status", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);

  const payload = await response.json();
  expect(payload.ok).toBe(true);
  expect(payload.mode).toBe("simulation_only");
  expect(payload.safety.walletConnection).toBe(false);
  expect(payload.safety.liveTrading).toBe(false);
  expect(payload.safety.transactionSigning).toBe(false);
  expect(payload.routes.strategySpecLive).toContain("/api/strategy-spec");
  expect(payload.routes.judgeReport).toBe("/api/judge-report");
});

test("strategy spec schema is served at its $id URL", async ({ request }) => {
  const response = await request.get("/strategy-spec.schema.json");
  expect(response.ok()).toBe(true);

  const payload = await response.json();
  expect(payload.$id).toBe("https://sentinel-alpha-skill.vercel.app/strategy-spec.schema.json");
  expect(payload.title).toBe("Sentinel Alpha Strategy Specification");
});

test("submission manifest documents the judge moment", async ({ request }) => {
  const response = await request.get("/api/submission-manifest");
  expect(response.ok()).toBe(true);

  const payload = await response.json();
  expect(payload.projectName).toBe("Sentinel Alpha Skill");
  expect(payload.hackathonTrack).toContain("Track 2");
  expect(payload.judgeMoment).toContain("Why The AI Refused");
  expect(payload.generatedArtifact.judgeApi).toContain("/api/strategy-spec");
  expect(payload.safetyBoundaries).toContain("No trade execution");
});

test("judge report bundles proof for Track 2 review", async ({ request }) => {
  const response = await request.get("/api/judge-report");
  expect(response.ok()).toBe(true);

  const payload = await response.json();
  expect(payload.ok).toBe(true);
  expect(payload.project.track).toContain("Track 2");
  expect(payload.dataProof.marketData).toBeTruthy();
  expect(payload.artifacts.live.validation.valid).toBe(true);
  expect(payload.artifacts.stress.validation.valid).toBe(true);
  expect(payload.artifacts.stress.riskGuard).toBe("BLOCKED");
  expect(payload.riskCaseLibrary.length).toBeGreaterThanOrEqual(3);
  expect(payload.safety.liveTrading).toBe(false);
});

test("live strategy spec endpoint emits a validated Track 2 artifact", async ({ request }) => {
  const response = await request.get("/api/strategy-spec?mode=live&timeframe=4H");
  expect(response.ok()).toBe(true);

  const payload = await response.json();
  expect(payload.ok).toBe(true);
  expect(payload.track).toContain("Track 2");
  expect(payload.artifact).toBe("backtestable_strategy_spec");
  expect(payload.validation.valid).toBe(true);
  expect(payload.validation.errors).toEqual([]);
  expect(payload.spec.product).toBe("Sentinel Alpha Skill");
  expect(payload.spec.mode).toBe("simulation_only");
  expect(payload.spec.asset).toBe("BNB/USDT");
  expect(payload.spec.riskGuard.checks).toHaveLength(5);
  expect(payload.spec.safetyConstraints).toContain("No live trading.");
});

test("stress strategy spec proves blocked WAIT behavior", async ({ request }) => {
  const response = await request.get("/api/strategy-spec?mode=stress&timeframe=1H");
  expect(response.ok()).toBe(true);

  const payload = await response.json();
  expect(payload.ok).toBe(true);
  expect(payload.validation.valid).toBe(true);
  expect(payload.spec.decision.action).toBe("WAIT");
  expect(payload.spec.riskGuard.status).toBe("BLOCKED");
  expect(payload.spec.riskGuard.blockedReasons.length).toBeGreaterThan(0);
  expect(payload.spec.rules.positionSizing).toContain("0%");
  expect(payload.spec.dataSource.note).toContain("controlled stress");
  expect(payload.provenance.mode).toBe("stress");
});
