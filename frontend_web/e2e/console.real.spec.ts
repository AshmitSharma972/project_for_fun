import { expect, test } from "@playwright/test";

test("real FastAPI flow creates, analyzes, records and approves without mock data", async ({ page }) => {
  await page.goto("/console");
  await expect(page.getByText("Backend Connected")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Demo data · mock mode")).toHaveCount(0);
  await page.getByLabel(/Service name/).fill("e2e-payments-api");
  await page.getByLabel(/Alert or error description/).fill("Database connection pool timeout");
  await page.getByLabel(/Relevant logs/).fill("ERROR database connection pool exhausted");
  await page.getByRole("button", { name: /Create incident/ }).click();
  await expect(page.getByText("Incident created and classified.")).toBeVisible();
  await page.getByRole("button", { name: /Analyze incident/ }).click();
  await expect(page.getByRole("heading", { name: "Recommended review steps" })).toBeVisible({ timeout: 20_000 });
  await page.locator("#feedback").scrollIntoViewIfNeeded();
  await page.getByLabel(/Verified root cause/).fill("Connection pool pressure verified by integration test");
  await page.getByLabel(/Steps taken/).fill("Reviewed local API integration test outcome");
  await page.getByRole("button", { name: /Save verified feedback/ }).click();
  await expect(page.getByRole("button", { name: "Approve simulated action" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Approve simulated action" }).click();
  await expect(page.getByText("SIMULATED ONLY — no action was executed.", { exact: true })).toBeVisible();
});
