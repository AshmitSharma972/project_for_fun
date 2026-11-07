import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "console.real.spec.ts",
  use: { baseURL: "http://127.0.0.1:3201", ...devices["Desktop Chrome"] },
  webServer: [
    {
      command: ".venv\\Scripts\\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000",
      url: "http://127.0.0.1:8000/health",
      reuseExistingServer: !process.env.CI,
      // Invalid integration config forces the backend's documented local-only fallback.
      env: { HINDSIGHT_API_KEY: "", HINDSIGHT_BASE_URL: "offline", GROQ_API_KEY: "", MODEL_NAME: "offline-test" },
      cwd: "..",
    },
    {
      command: "node ./node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3201",
      url: "http://127.0.0.1:3201",
      reuseExistingServer: !process.env.CI,
      env: { NEXT_PUBLIC_USE_MOCK: "false", INCIDENTMIND_API_BASE_URL: "http://127.0.0.1:8000" },
    },
  ],
  reporter: "list",
});
