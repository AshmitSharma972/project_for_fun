import {
  AlertSchema, AnalysisSchema, ApprovalResponseSchema, FeedbackResponseSchema,
  HealthSchema, IncidentResponseSchema, OutcomeStatsSchema,
  type AlertInput, type Analysis, type FeedbackInput, type Health,
  type IncidentResponse, type OutcomeStats,
} from "@/lib/contracts";
import { DEMO_ANALYSIS, DEMO_INCIDENT, DEMO_STATS } from "@/lib/fixtures";

export const MOCK_MODE = process.env.NEXT_PUBLIC_USE_MOCK === "true";
export class ApiError extends Error {
  constructor(message: string, readonly status?: number, readonly kind: "network" | "contract" | "http" = "http") { super(message); this.name = "ApiError"; }
}
let fallbackActive = false;
export function isDemoActive() { return MOCK_MODE || fallbackActive; }
function activateDemoFallback() {
  if (fallbackActive) return;
  fallbackActive = true;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("incidentmind:demo-mode"));
}
function canUseDemo(error: unknown) {
  return error instanceof ApiError && (error.kind === "network" || [502, 503, 504].includes(error.status ?? 0));
}

function validate<T>(schema: { safeParse: (value: unknown) => { success: boolean; data?: T; error?: { message: string } } }, body: unknown, route: string): T {
  const result = schema.safeParse(body);
  if (!result.success || result.data === undefined) {
    console.warn(`[IncidentMind contract mismatch] ${route}`, result.error?.message ?? "Invalid response");
    throw new ApiError(`The ${route} response did not match the expected API contract. Refresh or retry.`, undefined, "contract");
  }
  return result.data;
}

async function request<T>(route: string, schema: Parameters<typeof validate<T>>[0], init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${route}`, { ...init, headers: { "content-type": "application/json", ...init?.headers }, cache: "no-store" });
  } catch {
    throw new ApiError("Could not reach the IncidentMind API. Check the service and retry.", undefined, "network");
  }
  if (!response.ok) {
    let detail = `The request failed (${response.status}).`;
    try { const body = await response.json(); if (typeof body.detail === "string") detail = body.detail; } catch { /* keep a safe status message */ }
    throw new ApiError(detail, response.status);
  }
  let body: unknown;
  try { body = await response.json(); } catch { throw new ApiError(`The ${route} response was not valid JSON.`, undefined, "contract"); }
  return validate(schema, body, route);
}

let demoIncident: IncidentResponse = DEMO_INCIDENT;
let demoAnalysis: Analysis = DEMO_ANALYSIS;
let demoStats: OutcomeStats = DEMO_STATS;
let demoFeedbackSaved = false;
let demoApproved = false;

function readSavedDemoIncident() {
  if (typeof window === "undefined") return demoIncident;
  try {
    const saved = localStorage.getItem("incidentmind_demo_incident");
    if (saved) {
      const parsed = IncidentResponseSchema.safeParse(JSON.parse(saved));
      if (parsed.success) demoIncident = parsed.data;
    }
  } catch { /* local demo state is best-effort */ }
  return demoIncident;
}

function saveDemoIncident(value: IncidentResponse) {
  demoIncident = value;
  try { if (typeof window !== "undefined") localStorage.setItem("incidentmind_demo_incident", JSON.stringify(value)); } catch { /* local demo state is best-effort */ }
}

const wait = (ms = 360) => new Promise((resolve) => setTimeout(resolve, ms));
const asDemo = <T,>(data: T) => ({ data, demo: true as const });

export async function getHealth(): Promise<{ data: Health; demo: boolean }> {
  if (isDemoActive()) { await wait(120); return asDemo({ status: "ok", timestamp: new Date().toISOString() }); }
  try { return { data: await request("/health", HealthSchema), demo: false }; }
  catch (error) { if (!canUseDemo(error)) throw error; activateDemoFallback(); await wait(120); return asDemo({ status: "ok", timestamp: new Date().toISOString() }); }
}
export async function getStats(): Promise<{ data: OutcomeStats; demo: boolean }> {
  if (isDemoActive()) { await wait(); return asDemo(demoStats); }
  try { return { data: await request("/stats/outcomes", OutcomeStatsSchema), demo: false }; }
  catch (error) { if (!canUseDemo(error)) throw error; activateDemoFallback(); await wait(); return asDemo(demoStats); }
}
export async function createIncident(input: AlertInput): Promise<{ data: IncidentResponse; demo: boolean }> {
  const valid = AlertSchema.parse(input);
  if (!isDemoActive()) {
    try { return { data: await request("/incidents", IncidentResponseSchema, { method: "POST", body: JSON.stringify(valid) }), demo: false }; }
    catch (error) { if (!canUseDemo(error)) throw error; activateDemoFallback(); }
  }
  await wait(); demoFeedbackSaved = false; demoApproved = false;
  const created = { category: "API", incident: { ...DEMO_INCIDENT.incident, ...valid, id: `demo-${Date.now()}`, outcome: "unknown" as const } };
  saveDemoIncident(created);
  return asDemo(demoIncident);
}
export async function getIncident(id: string): Promise<{ data: IncidentResponse; demo: boolean }> {
  if (!isDemoActive()) {
    try { return { data: await request(`/incidents/${encodeURIComponent(id)}`, IncidentResponseSchema), demo: false }; }
    catch (error) { if (!canUseDemo(error)) throw error; activateDemoFallback(); }
  }
  await wait(); const current = readSavedDemoIncident(); if (id !== current.incident.id && id !== DEMO_INCIDENT.incident.id) throw new ApiError("Incident not found in demo data.", 404); return asDemo(id === DEMO_INCIDENT.incident.id ? DEMO_INCIDENT : current);
}
export async function analyzeIncident(id: string): Promise<{ data: Analysis; demo: boolean }> {
  if (!isDemoActive()) {
    try { return { data: await request(`/incidents/${encodeURIComponent(id)}/analyze`, AnalysisSchema, { method: "POST" }), demo: false }; }
    catch (error) { if (!canUseDemo(error)) throw error; activateDemoFallback(); }
  }
  await wait(650); const current = readSavedDemoIncident(); if (id !== current.incident.id && id !== DEMO_INCIDENT.incident.id) throw new ApiError("Incident not found in demo data.", 404); return asDemo(demoAnalysis);
}
export async function submitFeedback(id: string, input: FeedbackInput): Promise<{ data: { stored: boolean; memory_retained?: boolean }; demo: boolean }> {
  if (!isDemoActive()) {
    try { return { data: await request(`/incidents/${encodeURIComponent(id)}/feedback`, FeedbackResponseSchema, { method: "POST", body: JSON.stringify(input) }), demo: false }; }
    catch (error) { if (!canUseDemo(error)) throw error; activateDemoFallback(); }
  }
  await wait(); demoFeedbackSaved = true; try { localStorage.setItem(`incidentmind_feedback_${id}`, "1"); } catch { /* optional */ } demoStats = { ...demoStats, recorded_outcomes: demoStats.recorded_outcomes + 1, outcomes: { ...demoStats.outcomes, [input.outcome]: (demoStats.outcomes[input.outcome] ?? 0) + 1 } }; return asDemo({ stored: true, memory_retained: false });
}
export async function approveIncident(id: string): Promise<{ data: { approved: boolean; execution?: string }; demo: boolean }> {
  if (!isDemoActive()) {
    try { return { data: await request(`/incidents/${encodeURIComponent(id)}/approve-action`, ApprovalResponseSchema, { method: "POST" }), demo: false }; }
    catch (error) { if (!canUseDemo(error)) throw error; activateDemoFallback(); }
  }
  await wait(); if (!demoFeedbackSaved && !isMockFeedbackSaved(id)) throw new ApiError("Verified feedback is required before approval.", 409); demoApproved = true; try { localStorage.setItem(`incidentmind_approved_${id}`, "1"); } catch { /* optional */ } return asDemo({ approved: true, execution: "simulated only" });
}

export function getMockApprovalState() { return { feedbackSaved: demoFeedbackSaved, approved: demoApproved }; }

function isMockFeedbackSaved(id: string) {
  try { return typeof window !== "undefined" && localStorage.getItem(`incidentmind_feedback_${id}`) === "1"; }
  catch { return false; }
}
