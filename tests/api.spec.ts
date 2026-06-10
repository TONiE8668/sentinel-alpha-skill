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
});

test("submission manifest documents the judge moment", async ({ request }) => {
  const response = await request.get("/api/submission-manifest");
  expect(response.ok()).toBe(true);

  const payload = await response.json();
  expect(payload.projectName).toBe("Sentinel Alpha Skill");
  expect(payload.hackathonTrack).toContain("Track 2");
  expect(payload.judgeMoment).toContain("Why The AI Refused");
  expect(payload.safetyBoundaries).toContain("No trade execution");
});
