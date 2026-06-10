import { expect, test } from "@playwright/test";

test("dashboard loads and demo controls respond", async ({ page }) => {
  const consoleIssues: string[] = [];

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleIssues.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    consoleIssues.push(`pageerror: ${error.message}`);
  });

  await page.goto("/");

  await expect(page).toHaveTitle(/Sentinel Alpha Skill/);
  await expect(page.getByRole("heading", { name: "Sentinel Alpha Skill" })).toBeVisible();
  await expect(page.getByText("Hackathon Demo Readout")).toBeVisible();
  await expect(page.getByText("Strategy Specification JSON")).toBeVisible();
  await expect(
    page.getByText(/Unhandled Runtime Error|Build Error|Application error/i)
  ).toHaveCount(0);

  const rejectedScenarioButton = page.getByRole("button", { name: /Scenario B/i });
  await expect(rejectedScenarioButton).toBeVisible();
  await rejectedScenarioButton.click();
  await expect(page.getByText("WAIT").first()).toBeVisible();
  await expect(page.getByText("Why The AI Refused")).toBeVisible();
  await expect(page.getByText("Unsafe setup rejected")).toBeVisible();

  await page.getByRole("button", { name: /Copy JSON/i }).click();
  await expect(
    page.getByRole("button", { name: /Copied|Copy failed|Copy JSON/i })
  ).toBeVisible();

  const relevantIssues = consoleIssues.filter(
    (issue) => !issue.includes("CMC_API_KEY is not configured")
  );
  expect(relevantIssues).toEqual([]);
});
