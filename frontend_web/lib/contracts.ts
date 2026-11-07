import { z } from "zod";

// Mirrors CONTRACTS.md plus the concrete Pydantic models and route responses
// in backend/api.py. API responses remain defensive because later phases may
// add optional fields without breaking the documented contracts.
export const HealthSchema = z.object({ status: z.literal("ok"), timestamp: z.string() }).passthrough();
export const IncidentSchema = z.object({
  id: z.string().min(1), service: z.string().min(1), error: z.string().min(1),
  severity: z.string().optional(), symptoms: z.array(z.string()).optional(),
  logs_excerpt: z.string().optional(), suspected_cause: z.string().nullable().optional(),
  verified_cause: z.string().nullable().optional(), resolution_steps: z.array(z.string()).optional(),
  outcome: z.enum(["resolved", "failed", "partial", "unknown"]).optional(),
  timestamps: z.array(z.string()).optional(), tags: z.array(z.string()).optional(),
}).passthrough();
export const IncidentResponseSchema = z.object({ incident: IncidentSchema, category: z.string() }).passthrough();
export const EvidenceSchema = z.object({
  memory_id: z.string().nullable().optional(), text: z.string(), raw_memory_text: z.string(),
  memory_type: z.string().nullable().optional(), similarity: z.number().optional(),
  service: z.string().optional(), category: z.string().optional(), outcome: z.string().optional(),
  verified_cause: z.string().optional(),
}).passthrough();
export const HypothesisSchema = z.object({
  cause: z.string(), evidence_incident_ids: z.array(z.string()).optional(),
  reasoning: z.string(), status: z.string().optional(),
}).passthrough();
export const AnalysisSchema = z.object({
  hypotheses: z.array(HypothesisSchema).default([]), recommended_steps: z.array(z.string()).default([]),
  runbook_ref: z.string().optional(), evidence: z.array(EvidenceSchema).default([]),
  historical_experience: z.string().optional(), fallback_used: z.boolean().optional(),
}).passthrough();
export const FeedbackResponseSchema = z.object({ stored: z.boolean(), memory_retained: z.boolean().optional() }).passthrough();
export const ApprovalResponseSchema = z.object({ approved: z.boolean(), execution: z.string().optional() }).passthrough();
export const OutcomeStatsSchema = z.object({
  recorded_outcomes: z.number(), outcomes: z.record(z.number()), categories: z.record(z.number()),
  resolved_display: z.string().optional(),
}).passthrough();
export const AlertSchema = z.object({
  service: z.string().trim().min(1, "Enter a service name"),
  error: z.string().trim().min(1, "Describe the alert or error"),
  logs: z.string().optional(), cpu: z.number().min(0).max(100).optional(),
  failed_requests: z.number().int().nonnegative().optional(),
});
export const FeedbackSchema = z.object({
  verified_cause: z.string().trim().min(1, "Enter the verified cause"),
  steps_taken: z.array(z.string()), outcome: z.enum(["resolved", "partial", "failed"]), notes: z.string().optional(),
});

export type Health = z.infer<typeof HealthSchema>;
export type Incident = z.infer<typeof IncidentSchema>;
export type IncidentResponse = z.infer<typeof IncidentResponseSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;
export type OutcomeStats = z.infer<typeof OutcomeStatsSchema>;
export type AlertInput = z.infer<typeof AlertSchema>;
export type FeedbackInput = z.infer<typeof FeedbackSchema>;
