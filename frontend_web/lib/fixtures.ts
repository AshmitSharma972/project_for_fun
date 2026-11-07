import type { Analysis, IncidentResponse, OutcomeStats } from "@/lib/contracts";

export const DEMO_INCIDENT: IncidentResponse = {
  category: "Database",
  incident: {
    id: "demo-incident-01", service: "payments-api", error: "Database connection pool exhausted",
    severity: "high", symptoms: ["connection pool saturation"],
    logs_excerpt: "ERROR 2026-11-07T10:42:11Z database pool timeout after 30000ms",
    tags: ["database"], outcome: "unknown", timestamps: [],
  },
};

export const DEMO_ANALYSIS: Analysis = {
  hypotheses: [{
    cause: "Connection pool saturation",
    evidence_incident_ids: ["demo-memory-02"],
    reasoning: "A prior payments incident recorded pool saturation with a similar timeout signature. Treat this as a lead to verify, not a confirmed cause.",
    status: "suspected",
  }],
  recommended_steps: [
    "Inspect active and idle database connections against the configured pool limit.",
    "Check recent query latency and lock waits for the affected service.",
    "Compare connection acquisition timeouts with the deployment timeline.",
  ],
  runbook_ref: "database_failure.md", evidence: [{
    memory_id: "demo-memory-02", text: "A previous payment timeout aligned with connection pool saturation.",
    raw_memory_text: "service=payments-api · category=Database · outcome=resolved · verified cause=connection pool saturation",
    memory_type: "incident", similarity: 0.86, service: "payments-api", category: "Database",
    outcome: "resolved", verified_cause: "Connection pool saturation",
  }, {
    memory_id: "demo-memory-03", text: "Prior API alert followed a slow dependency response.",
    raw_memory_text: "service=checkout · category=API · outcome=partial · verified cause=upstream response delay",
    memory_type: "incident", similarity: 0.62, service: "checkout", category: "API",
    outcome: "partial", verified_cause: "Upstream response delay",
  }, {
    memory_id: "demo-memory-04", text: "Prior overload event coincided with CPU saturation.",
    raw_memory_text: "service=worker · category=Overload · outcome=failed · verified cause=CPU saturation",
    memory_type: "incident", similarity: 0.43, service: "worker", category: "Overload",
    outcome: "failed", verified_cause: "CPU saturation",
  }, {
    memory_id: "demo-memory-05", text: "A previous database alert improved after pool pressure was reduced.",
    raw_memory_text: "service=orders · category=Database · outcome=resolved · verified cause=connection pool pressure",
    memory_type: "incident", similarity: 0.31, service: "orders", category: "Database",
    outcome: "resolved", verified_cause: "Connection pool pressure",
  }],
  historical_experience: "demo data", fallback_used: false,
};

export const DEMO_STATS: OutcomeStats = {
  recorded_outcomes: 12,
  outcomes: { resolved: 8, partial: 2, failed: 2 },
  categories: { Database: 5, API: 4, Overload: 2, Network: 1 },
  resolved_display: "8 of 12 recorded",
};
