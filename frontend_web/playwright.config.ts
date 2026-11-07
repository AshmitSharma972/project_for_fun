import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "console.spec.ts",
  retries: 0,
  use: { baseURL: "http://127.0.0.1:3200", ...devices["Desktop Chrome"] },
  webServer: {
    command: "node ./node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3200",
    url: "http://127.0.0.1:3200",
    reuseExistingServer: !process.env.CI,
    env: { NEXT_PUBLIC_USE_MOCK: "true", INCIDENTMIND_API_BASE_URL: "http://127.0.0.1:8000" },
  },
  reporter: "list",
});
