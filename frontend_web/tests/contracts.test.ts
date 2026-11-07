import { describe, expect, it } from "vitest";
import {
  AlertSchema, AnalysisSchema, ApprovalResponseSchema, FeedbackResponseSchema,
  HealthSchema, IncidentResponseSchema, OutcomeStatsSchema,
} from "@/lib/contracts";
import { DEMO_ANALYSIS, DEMO_INCIDENT, DEMO_STATS } from "@/lib/fixtures";

describe("IncidentMind API contracts", () => {
  it("parses health, incident, analysis, outcomes and simulated approval fixtures", () => {
    expect(HealthSchema.parse({ status: "ok", timestamp: "2026-11-07T10:42:11Z" }).status).toBe("ok");
    expect(IncidentResponseSchema.parse(DEMO_INCIDENT).incident.id).toBe("demo-incident-01");
    expect(AnalysisSchema.parse(DEMO_ANALYSIS).evidence).toHaveLength(4);
    expect(OutcomeStatsSchema.parse(DEMO_STATS).recorded_outcomes).toBe(12);
    expect(FeedbackResponseSchema.parse({ stored: true, memory_retained: false }).stored).toBe(true);
    expect(ApprovalResponseSchema.parse({ approved: true, execution: "simulated only" }).execution).toBe("simulated only");
  });

  it("validates intake fields and returns useful validation errors", () => {
    expect(AlertSchema.safeParse({ service: "payments-api", error: "timeout", cpu: 86, failed_requests: 9 }).success).toBe(true);
    const empty = AlertSchema.safeParse({ service: " ", error: "" });
    expect(empty.success).toBe(false);
    if (!empty.success) expect(empty.error.issues.map((issue) => issue.message)).toContain("Enter a service name");
  });

  it("accepts real backend omissions for optional evidence enrichment", () => {
    const parsed = AnalysisSchema.parse({ hypotheses: [], recommended_steps: [], runbook_ref: "api_failure.md", evidence: [], fallback_used: true });
    expect(parsed.evidence).toEqual([]);
    expect(parsed.hypotheses).toEqual([]);
  });

  it("rejects malformed required API fields instead of inventing data", () => {
    expect(IncidentResponseSchema.safeParse({ incident: { id: "x" }, category: "API" }).success).toBe(false);
    expect(OutcomeStatsSchema.safeParse({ recorded_outcomes: "12", outcomes: {}, categories: {} }).success).toBe(false);
  });
});
