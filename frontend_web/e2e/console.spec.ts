import { expect, test } from "@playwright/test";

test("marketing landing renders the original IncidentMind story", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Incidents, remembered." })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open console/ }).first()).toBeVisible();
  await expect(page.getByText("Demo data · landing preview")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "On this page" })).toBeVisible();
});

test("console completes intake, analysis, verified feedback and simulated approval in mock mode", async ({ page }) => {
  await page.goto("/console");
  await expect(page.getByText("Demo data · mock mode")).toBeVisible();

  await page.getByLabel(/Service name/).fill("payments-api");
  await page.getByLabel(/Alert or error description/).fill("Database connection pool exhausted");
  await page.getByLabel(/Relevant logs/).fill("ERROR database connection timeout");
  await expect(page.getByLabel(/Service name/)).toHaveValue("payments-api");
  await page.getByRole("button", { name: /Create incident/ }).click();
  await expect(page.getByText("Incident created and classified.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Approval unavailable/ })).toBeDisabled();

  await page.getByRole("button", { name: /Analyze incident/ }).click();
  await expect(page.getByRole("heading", { name: "Memory constellation" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/connection pool saturation/i).first()).toBeVisible();
  await page.locator("#feedback").scrollIntoViewIfNeeded();
  await page.getByLabel(/Verified root cause/).fill("Connection pool saturation confirmed");
  await page.getByLabel(/Steps taken/).fill("Reduced connection pressure\nVerified database latency");
  await page.getByRole("button", { name: "Resolved", exact: true }).click();
  await page.getByRole("button", { name: /Save verified feedback/ }).click();
  await expect(page.getByText("Hindsight retention not confirmed")).toBeVisible();
  await page.getByRole("button", { name: "Approve simulated action" }).click();
  await expect(page.getByText("SIMULATED ONLY — no action was executed.")).toBeVisible();
});

test("client-side intake validation and incident lookup failures are actionable", async ({ page }) => {
  await page.goto("/console");
  await page.getByLabel("Service name").fill("temporary");
  await page.getByLabel("Service name").fill("");
  await page.getByRole("button", { name: /Create incident/ }).click();
  await expect(page.getByText("Enter a service name")).toBeVisible();
  await page.getByLabel("Open by incident ID").fill("missing-demo-id");
  await page.getByRole("button", { name: "Open incident" }).click();
  await expect(page.getByText("Incident not found in demo data.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" }).first()).toBeVisible();
});
