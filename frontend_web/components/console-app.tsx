"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, ArrowRight, ClipboardCheck, FileText, HeartPulse, Layers3, Menu, Network, Plus, RefreshCw, ShieldCheck, SquareTerminal, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { MemoryGraph } from "@/components/memory-graph";
import { MOCK_MODE, isDemoActive, approveIncident, analyzeIncident, createIncident, getHealth, getIncident, getStats, submitFeedback } from "@/lib/api";
import { AlertSchema, FeedbackSchema, type Analysis, type AlertInput, type FeedbackInput, type IncidentResponse, type OutcomeStats } from "@/lib/contracts";
import { DEMO_STATS } from "@/lib/fixtures";

type Tone = "error" | "warning" | "success";
type FeedbackReceipt = { memory_retained?: boolean };
const SIDEBAR_ITEMS = [
  { id: "intake", label: "Intake", icon: Plus }, { id: "incidents", label: "Incidents", icon: Layers3 },
  { id: "analysis", label: "Analysis", icon: Network }, { id: "feedback", label: "Feedback", icon: ClipboardCheck },
  { id: "outcomes", label: "Outcomes", icon: Activity }, { id: "system", label: "System", icon: HeartPulse },
];

function messageOf(error: unknown) { return error instanceof Error ? error.message : "Something went wrong. Please retry."; }
function titleCase(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function getSavedIds() { try { return JSON.parse(localStorage.getItem("incidentmind_ids") ?? "[]") as string[]; } catch { return []; } }
function saveId(id: string) { try { localStorage.setItem("incidentmind_ids", JSON.stringify([id, ...getSavedIds().filter((x) => x !== id)].slice(0, 12))); } catch { /* storage is optional */ } }
function isSaved(key: string) { try { return localStorage.getItem(key) === "1"; } catch { return false; } }

function ConsoleError({ text, retry }: { text: string; retry: () => void }) {
  return <div className="notice notice--error" role="alert"><div>{text}</div><button type="button" className="console-button console-button--small" style={{marginTop:10}} onClick={retry}><RefreshCw size={13}/> Retry</button></div>;
}

function MeterChart({ stats }: { stats: OutcomeStats }) {
  const maxCategory = Math.max(1, ...Object.values(stats.categories));
  const denominator = Math.max(1, stats.recorded_outcomes);
  const outcomes = ["resolved", "partial", "failed"] as const;
  return <div className="analysis-grid">
    <div className="analysis-card glass"><h3>Recorded outcomes by category</h3>{Object.keys(stats.categories).length ? <div className="chart">{Object.entries(stats.categories).map(([name, value]) => <div className="chart-row" key={name}><span>{name}</span><span className="chart-track"><i className="chart-fill" style={{"--bar-width":`${value/maxCategory*100}%`} as CSSProperties}/></span><span className="chart-value">{value}</span></div>)}</div> : <div className="console-empty">No categorized feedback has been recorded.</div>}</div>
    <div className="analysis-card glass"><h3>Outcomes</h3><div className="chart">{outcomes.map((name) => { const value = stats.outcomes[name] ?? 0; return <div className="chart-row" key={name}><span>{titleCase(name)}</span><span className="chart-track"><i className={`chart-fill chart-fill--${name}`} style={{"--bar-width":`${value/denominator*100}%`} as CSSProperties}/></span><span className="chart-value">{value}</span></div>; })}</div><div className="chart-legend" aria-label="Outcome chart colors"><span className="legend-key"><i style={{background:"#79d6a1"}}/>Resolved</span><span className="legend-key"><i style={{background:"#f0c46c"}}/>Partial</span><span className="legend-key"><i style={{background:"#ff737a"}}/>Failed</span></div></div>
  </div>;
}

export function ConsoleApp() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const requestedId = params.get("incident");
  const [item, setItem] = useState<IncidentResponse | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [incidentError, setIncidentError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [approvalError, setApprovalError] = useState("");
  const [receipt, setReceipt] = useState<FeedbackReceipt | null>(null);
  const [approved, setApproved] = useState(false);
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [loadId, setLoadId] = useState("");
  const [service, setService] = useState("");
  const [errorText, setErrorText] = useState("");
  const [logs, setLogs] = useState("");
  const [cpu, setCpu] = useState(0);
  const [failedRequests, setFailedRequests] = useState(0);
  const [verifiedCause, setVerifiedCause] = useState("");
  const [stepsTaken, setStepsTaken] = useState("");
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [outcome, setOutcome] = useState<FeedbackInput["outcome"]>("resolved");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [demoActive, setDemoActive] = useState(MOCK_MODE);
  const reduceMotion = useReducedMotion();

  const healthQuery = useQuery({ queryKey: ["health"], queryFn: getHealth, refetchInterval: 15_000, retry: false });
  const statsQuery = useQuery({ queryKey: ["stats"], queryFn: getStats, enabled: true, refetchInterval: 30_000 });
  const stats = statsQuery.data?.data;
  const isDemo = demoActive || Boolean(item?.incident.id.startsWith("demo-"));

  useEffect(() => {
    const updateDemoState = () => { setDemoActive(isDemoActive()); void healthQuery.refetch(); void statsQuery.refetch(); };
    window.addEventListener("incidentmind:demo-mode", updateDemoState);
    return () => window.removeEventListener("incidentmind:demo-mode", updateDemoState);
  }, [healthQuery.refetch, statsQuery.refetch]);

  const openIncident = useCallback(async (id: string, updateUrl = true) => {
    const target = id.trim();
    if (!target) return;
    setPending("open"); setLoadError(""); setNotice(null);
    try {
      const result = await getIncident(target);
      setItem(result.data); setAnalysis(null); setChecked([]); setReceipt(null); setApproved(false);
      setReceipt(isSaved(`incidentmind_feedback_${target}`) ? { } : null);
      setApproved(isSaved(`incidentmind_approved_${target}`));
      setLoadId(target); saveId(target); setRecentIds(getSavedIds());
      if (updateUrl) router.replace(`${pathname}?incident=${encodeURIComponent(target)}`);
    } catch (error) { setLoadError(messageOf(error)); }
    finally { setPending(null); }
  }, [pathname, router]);

  useEffect(() => { setRecentIds(getSavedIds()); }, []);
  useEffect(() => {
    if (requestedId && requestedId !== item?.incident.id) { setLoadId(requestedId); void openIncident(requestedId, false); }
  }, [requestedId, item?.incident.id, openIncident]);

  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); setSideOpen(false); };

  async function createNewIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(null); setFieldErrors({}); setIncidentError("");
    const input: AlertInput = { service, error: errorText, logs: logs || undefined, cpu, failed_requests: failedRequests };
    const parsed = AlertSchema.safeParse(input);
    if (!parsed.success) { setFieldErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]))); return; }
    setPending("create");
    try {
      const result = await createIncident(parsed.data);
      setItem(result.data); setAnalysis(null); setChecked([]); setReceipt(null); setApproved(false);
      setLoadId(result.data.incident.id); saveId(result.data.incident.id); setRecentIds(getSavedIds());
      setService(""); setErrorText(""); setLogs(""); setCpu(0); setFailedRequests(0);
      router.replace(`${pathname}?incident=${encodeURIComponent(result.data.incident.id)}`);
      setNotice({ tone: "success", text: "Incident created and classified. Review the signal, then request analysis when ready." });
      scrollTo("incidents");
    } catch (error) { setIncidentError(messageOf(error)); }
    finally { setPending(null); }
  }

  async function runAnalysis() {
    if (!item) return;
    setPending("analysis"); setAnalysisError(""); setNotice(null);
    try { const result = await analyzeIncident(item.incident.id); setAnalysis(result.data); setChecked(result.data.recommended_steps.map(() => false)); setReceipt(null); setApproved(false); setNotice({ tone: "success", text: "Analysis returned. Review its evidence and runbook guidance before acting." }); }
    catch (error) { setAnalysisError(messageOf(error)); }
    finally { setPending(null); }
  }

  async function saveFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!item) return;
    setFeedbackError(""); setNotice(null);
    const payload: FeedbackInput = { verified_cause: verifiedCause, steps_taken: stepsTaken.split(/\r?\n/).map((step) => step.trim()).filter(Boolean), outcome, notes: feedbackNotes };
    const parsed = FeedbackSchema.safeParse(payload);
    if (!parsed.success) { setFieldErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]))); return; }
    setFieldErrors({}); setPending("feedback");
    try {
      const result = await submitFeedback(item.incident.id, parsed.data);
      setReceipt({ memory_retained: result.data.memory_retained }); setApproved(false);
      try { localStorage.setItem(`incidentmind_feedback_${item.incident.id}`, "1"); } catch { /* storage is optional */ }
      await statsQuery.refetch();
      setNotice({ tone: "success", text: "Verified feedback was saved." });
    } catch (error) { setFeedbackError(messageOf(error)); }
    finally { setPending(null); }
  }

  async function approve() {
    if (!item || !receipt) return;
    setApprovalError(""); setPending("approve");
    try {
      const result = await approveIncident(item.incident.id);
      setApproved(result.data.approved);
      try { localStorage.setItem(`incidentmind_approved_${item.incident.id}`, result.data.approved ? "1" : "0"); } catch { /* storage is optional */ }
      setNotice({ tone: "success", text: result.data.execution ?? "simulated only" });
    } catch (error) { setApprovalError(messageOf(error)); }
    finally { setPending(null); }
  }

  const severity = item?.incident.severity?.toLowerCase() ?? "unknown";
  const healthStatus = healthQuery.data?.demo ? (MOCK_MODE ? "Demo mode" : "Demo fallback") : healthQuery.data?.data.status === "ok" ? "Connected" : healthQuery.isError ? "Unavailable" : "Checking";

  return <>
    <header className="site-nav"><a href="/" aria-label="IncidentMind home"><BrandMark/></a><nav className="nav-links" aria-label="Site navigation"><a href="/#product">Product</a><a href="/#journey">How it works</a><a href="/#developers">Docs</a></nav><span className="nav-spacer"/><span className="nav-actions"><Link href="/console" className="pill">Console <ArrowRight size={14}/></Link></span></header>
    <div className="console-shell">
      <div className="console-top"><button className="mobile-side-toggle" onClick={() => setSideOpen(!sideOpen)} aria-label={sideOpen ? "Close console navigation" : "Open console navigation"} aria-expanded={sideOpen}>{sideOpen ? <X size={17}/> : <Menu size={17}/>}</button><SquareTerminal size={17} aria-hidden="true"/><span className="console-top__title">Response console</span>{demoActive && <span className="demo-badge">Demo data</span>}<div className="console-top__status" aria-live="polite"><i className={`status-dot${healthStatus === "Connected" ? " status-dot--ok" : healthStatus === "Unavailable" ? " status-dot--bad" : ""}`} />Backend {healthStatus}</div><button className="nav-icon" onClick={() => { void healthQuery.refetch(); void statsQuery.refetch(); }} aria-label="Refresh system status and outcome statistics"><RefreshCw size={15}/></button></div>
      <div className="console-layout">
        <aside className={`console-sidebar${sideOpen ? " console-sidebar--open" : ""}`} aria-label="Console sections"><div className="sidebar-brand"><BrandMark small/><b className="brand__name">CONSOLE</b></div><div className="sidebar-label">Workspace</div>{SIDEBAR_ITEMS.map(({id,label,icon:Icon})=><button className="side-link" key={id} onClick={() => scrollTo(id)}><Icon size={16} aria-hidden="true"/>{label}</button>)}<div className="sidebar-note"><ShieldCheck size={14} style={{verticalAlign:"middle",marginRight:6}}/>Recommendations require engineer review. No recovery commands run here.</div></aside>
        <main id="main-content" className="console-main">
          <div className="console-intro"><div><span className="micro-label">On-call workspace / evidence first</span><h1>See the signal.<br/>Understand the history.</h1><p>Bring in an alert, review what the system found, and record what an engineer confirmed.</p></div>{demoActive ? <span className="demo-badge">Demo data · {MOCK_MODE ? "mock mode" : "backend unavailable"}</span> : <span className={healthStatus === "Connected" ? "real-badge" : "tag"}><i className={`status-dot${healthStatus === "Connected" ? " status-dot--ok" : ""}`}/>{healthStatus === "Connected" ? "Live backend" : "Backend unavailable"}</span>}</div>
          {notice && <div className={`notice notice--${notice.tone}`} role="status" style={{marginBottom:18}}>{notice.text}</div>}

          <section className="console-section" id="intake"><div className="console-section__head"><h2><span className="micro-label">01 / </span>New incident</h2><span>Classify &amp; store</span></div>
            <form className="glass panel" onSubmit={createNewIncident} noValidate><div className="form-grid">
              <div className="field"><label htmlFor="service">Service name <span aria-hidden="true">*</span></label><input id="service" name="service" autoComplete="off" value={service} onChange={(e) => setService(e.target.value)} placeholder="payments-api" aria-describedby={fieldErrors.service ? "service-error" : "service-help"}/><span id={fieldErrors.service ? "service-error" : "service-help"} className={fieldErrors.service ? "field-error" : "field-hint"}>{fieldErrors.service ?? "The service that reported the alert"}</span></div>
              <div className="field"><label htmlFor="error-description">Alert or error description <span aria-hidden="true">*</span></label><input id="error-description" name="error" value={errorText} onChange={(e) => setErrorText(e.target.value)} placeholder="Connection pool timeout" aria-describedby={fieldErrors.error ? "error-field-message" : undefined}/>{fieldErrors.error && <span className="field-error" id="error-field-message">{fieldErrors.error}</span>}</div>
              <div className="field field--full"><label htmlFor="logs">Relevant logs <span className="field-hint">(optional)</span></label><textarea id="logs" name="logs" value={logs} onChange={(e) => setLogs(e.target.value)} placeholder="Paste a relevant log excerpt…" spellCheck={false}/><span className="field-hint">Logs are sent to the FastAPI service with the alert.</span></div>
              <div className="field"><label htmlFor="cpu-range">CPU utilization <span className="field-hint">(optional · {cpu}%)</span></label><div className="range-row"><input id="cpu-range" aria-label="CPU utilization slider" type="range" min="0" max="100" value={cpu} onChange={(e) => setCpu(Number(e.target.value))}/><input aria-label="CPU utilization percentage" type="number" min="0" max="100" value={cpu} onChange={(e) => setCpu(Math.max(0, Math.min(100, Number(e.target.value))))}/></div></div>
              <div className="field"><label htmlFor="failed-requests">Failed requests</label><input id="failed-requests" type="number" min="0" step="1" value={failedRequests} onChange={(e) => setFailedRequests(Math.max(0, Number(e.target.value)))} /><span className="field-hint">Count from the alert, if available.</span></div>
            </div><div className="console-actions"><button className="console-button console-button--primary" type="submit" disabled={pending === "create"}>{pending === "create" ? <><RefreshCw size={14} className="spin"/>Creating…</> : <>Create incident <ArrowRight size={15}/></>}</button><span className="field-hint">Required fields are marked with an asterisk.</span></div>{incidentError && <div style={{marginTop:14}}><ConsoleError text={incidentError} retry={() => { const form = document.querySelector<HTMLFormElement>("#intake form"); form?.requestSubmit(); }}/></div>}</form>
          </section>

          <section className="console-section" id="incidents"><div className="console-section__head"><h2><span className="micro-label">02 / </span>Incident detail</h2><span>Selected record</span></div>
            <div className="glass panel"><div className="form-grid" style={{alignItems:"end"}}><div className="field"><label htmlFor="incident-id">Open by incident ID</label><input id="incident-id" value={loadId} onChange={(e)=>setLoadId(e.target.value)} placeholder="Paste an incident ID" onKeyDown={(e)=>{if(e.key==="Enter"){e.preventDefault();void openIncident(loadId);}}}/></div><button className="console-button" disabled={pending === "open" || !loadId.trim()} onClick={()=>void openIncident(loadId)}>{pending === "open" ? "Opening…" : "Open incident"}<ArrowRight size={14}/></button></div>
              {recentIds.length > 0 && <div style={{marginTop:17}}><span className="field-hint">Opened in this browser</span><div className="console-actions" style={{marginTop:8}}>{recentIds.slice(0,6).map((id)=><button key={id} className="tag" onClick={()=>void openIncident(id)}>{id}</button>)}</div></div>}
              {!recentIds.length && !item && <div className="console-empty">Your created incident IDs will be kept in this browser for quick access. The API does not currently provide an all-incidents list.</div>}
      {loadError && <ConsoleError text={loadError} retry={()=>void openIncident(loadId)}/>}
              {item && <div className="glass panel" style={{marginTop:18}}><div className="incident-head"><div><div className="incident-meta"><span className="micro-label">{item.incident.id}</span><span>·</span><span>{item.incident.service}</span>{item.incident.timestamps?.[0] && <><span>·</span><span>{new Date(item.incident.timestamps[0]).toLocaleString()}</span></>}</div><p className="incident-title">{item.incident.error}</p><div className="incident-meta"><span className={`tag tag--${severity}`}>{titleCase(severity)} severity</span><span className="tag">{item.category}</span>{item.incident.outcome && item.incident.outcome !== "unknown" && <span className={`tag tag--${item.incident.outcome}`}>{titleCase(item.incident.outcome)}</span>}</div></div><button className="console-button console-button--primary" disabled={pending === "analysis"} onClick={()=>void runAnalysis()}>{pending === "analysis" ? <><RefreshCw size={14} className="spin"/>Analyzing…</> : <>Analyze incident <ArrowRight size={14}/></>}</button></div>
                {item.incident.symptoms?.length ? <div className="details-grid"><div><span className="micro-label">Detected symptoms</span><p className="muted">{item.incident.symptoms.join(" · ")}</p></div><div><span className="micro-label">Tags</span><p className="muted">{item.incident.tags?.join(" · ") || "None recorded"}</p></div></div> : null}
                {item.incident.logs_excerpt && <details style={{marginTop:15}}><summary className="field-hint" style={{cursor:"pointer",padding:"8px 0"}}>View attached log excerpt</summary><pre className="mono-block">{item.incident.logs_excerpt}</pre></details>}
              </div>}
            </div>
          </section>

          <section className="console-section" id="analysis"><div className="console-section__head"><h2><span className="micro-label">03 / </span>Evidence &amp; analysis</h2><span>Human review required</span></div>
            {analysisError && <ConsoleError text={analysisError} retry={()=>void runAnalysis()}/>}
            {pending === "analysis" && <motion.div className="analysis-grid" initial={reduceMotion ? false : {opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:reduceMotion?0:.18}}>{[1,2,3,4].map((n)=><div key={n} className="analysis-card glass"><div className="skeleton" style={{width:"46%"}}/><div className="skeleton"/><div className="skeleton" style={{width:"82%"}}/></div>)}</motion.div>}
            {!analysis && pending !== "analysis" && !analysisError && <div className="glass console-empty"><Network size={20} style={{marginBottom:8}}/><div>Analyze a selected incident to request similar memory evidence and matching runbook steps.</div><div className="field-hint" style={{marginTop:8}}>If memory or optional AI analysis is unavailable, runbook guidance is used as a fallback.</div></div>}
            {analysis && item && <motion.div key={item.incident.id} className="analysis-grid" initial={reduceMotion ? false : {opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:reduceMotion?0:.24}}>
              <div className="analysis-card glass"><h3>Historical evidence <span className="field-hint">({analysis.evidence.length})</span></h3>{analysis.evidence.length ? analysis.evidence.map((entry,i)=><div className="evidence-item" key={entry.memory_id ?? i}><div className="evidence-meta"><span>{entry.service ?? entry.memory_id ?? `Memory ${i+1}`}</span>{entry.category && <span>· {entry.category}</span>}{entry.outcome && <span>· {entry.outcome}</span>}{entry.similarity !== undefined && <span>· {Math.round(entry.similarity*100)}% similarity</span>}</div><p>{entry.verified_cause ?? entry.raw_memory_text ?? entry.text}</p><span className="field-hint">{entry.memory_type ?? "Historical memory"}</span></div>) : <div className="console-empty">No relevant historical evidence was returned.</div>}</div>
              <div className="analysis-card glass"><h3>Memory constellation</h3><MemoryGraph evidence={analysis.evidence} demo={isDemo}/></div>
              <div className="analysis-card glass"><h3>Suspected causes</h3>{analysis.hypotheses.length ? analysis.hypotheses.map((hypothesis,i)=><div className="hypothesis" key={`${hypothesis.cause}-${i}`}><strong>{hypothesis.cause}</strong><p>{hypothesis.reasoning}</p><div className="evidence-meta"><span>{hypothesis.status ?? "suspected"}</span><span>·</span><span>{hypothesis.evidence_incident_ids?.length ? `Evidence: ${hypothesis.evidence_incident_ids.join(", ")}` : "No linked evidence IDs"}</span></div></div>) : <div className="console-empty">No AI hypotheses available for this analysis.</div>}</div>
              <div className="analysis-card glass"><h3>Runbook reference</h3>{analysis.runbook_ref ? <><div className="runbook-ref"><FileText size={14} style={{verticalAlign:"middle",marginRight:7}}/>{analysis.runbook_ref}</div><p className="muted" style={{marginTop:10}}>Guidance is presented for engineer review. Verify each step in the context of the current incident.</p></> : <div className="console-empty">No runbook reference was returned.</div>}{analysis.fallback_used && <div className="notice notice--warning" style={{marginTop:13}}>Runbook guidance — memory or optional AI analysis was unavailable.</div>}</div>
              <div className="analysis-card analysis-card--full glass"><h3>Recommended review steps <span className="field-hint"> · checklist is local to this view</span></h3>{analysis.recommended_steps.length ? <div className="steps">{analysis.recommended_steps.map((step,i)=><label className={`step-check${checked[i]?" step-check--done":""}`} key={`${i}-${step}`}><input type="checkbox" checked={checked[i] ?? false} onChange={()=>setChecked((previous)=>previous.map((value,index)=>index===i?!value:value))}/><span>{step}</span></label>)}</div> : <div className="console-empty">No recommended review steps were returned.</div>}</div>
            </motion.div>}
          </section>

          <section className="console-section" id="feedback"><div className="console-section__head"><h2><span className="micro-label">04 / </span>Verified feedback</h2><span>Engineer-entered learning</span></div>
            {!item ? <div className="glass console-empty">Open or create an incident to record its verified outcome.</div> : <div className="analysis-grid"><form className="analysis-card analysis-card--full glass" onSubmit={saveFeedback} noValidate><div className="form-grid">
                <div className="field field--full"><label htmlFor="verified-cause">Verified root cause <span aria-hidden="true">*</span></label><input id="verified-cause" value={verifiedCause} onChange={(e)=>setVerifiedCause(e.target.value)} placeholder="What did the engineer confirm?" aria-describedby={fieldErrors.verified_cause ? "cause-error" : undefined}/>{fieldErrors.verified_cause && <span className="field-error" id="cause-error">{fieldErrors.verified_cause}</span>}</div>
                <div className="field"><label htmlFor="steps-taken">Steps taken</label><textarea id="steps-taken" value={stepsTaken} onChange={(e)=>setStepsTaken(e.target.value)} placeholder="One step per line"/></div>
                <div className="field"><label htmlFor="feedback-notes">Engineer notes <span className="field-hint">(optional)</span></label><textarea id="feedback-notes" value={feedbackNotes} onChange={(e)=>setFeedbackNotes(e.target.value)} placeholder="Additional context"/></div>
                <div className="field field--full"><span className="field-hint" id="outcome-label">Observed outcome</span><div className="segmented" role="group" aria-labelledby="outcome-label">{(["resolved","partial","failed"] as const).map((value)=><button type="button" key={value} aria-pressed={outcome===value} onClick={()=>setOutcome(value)}>{value=== "partial" ? "Partially resolved" : titleCase(value)}</button>)}</div></div>
              </div><div className="console-actions"><button type="submit" className="console-button console-button--primary" disabled={pending === "feedback"}>{pending === "feedback" ? "Saving feedback…" : "Save verified feedback"}<ArrowRight size={14}/></button><span className="field-hint">Only enter a cause that has been verified by an engineer.</span></div>{feedbackError && <div style={{marginTop:14}}><ConsoleError text={feedbackError} retry={()=>{const form=document.querySelector<HTMLFormElement>("#feedback form");form?.requestSubmit();}}/></div>}</form>
              <div className="analysis-card analysis-card--full glass"><h3>Approval gate</h3><div className="notice" style={{marginBottom:13}}>Approval records a simulated action only. It does not execute commands.</div>{!receipt && <button className="console-button" disabled title="Save verified feedback before requesting approval"><ShieldCheck size={14}/>Approval unavailable · feedback required</button>}{receipt && !approved && <button className="console-button console-button--primary" onClick={()=>void approve()} disabled={pending === "approve"}>{pending === "approve" ? "Recording approval…" : "Approve simulated action"}<ArrowRight size={14}/></button>}{approvalError && <div style={{marginTop:12}}><ConsoleError text={approvalError} retry={()=>void approve()}/></div>}{receipt && <div className="console-actions" style={{marginTop:13}}><span className="notice notice--success">{approved ? "SIMULATED ONLY — no action was executed." : "Verified feedback is saved. Approval remains an explicit engineer choice."}</span>{receipt.memory_retained !== undefined && <span className={receipt.memory_retained ? "real-badge" : "tag"}>{receipt.memory_retained ? "Hindsight retention confirmed" : "Hindsight retention not confirmed"}</span>}</div>}</div>
              </div>}
          </section>

          <section className="console-section" id="outcomes"><div className="console-section__head"><h2><span className="micro-label">05 / </span>Outcomes</h2>{statsQuery.data?.demo ? <span className="demo-badge">Demo data</span> : <span>{stats?.recorded_outcomes ?? "—"} recorded</span>}</div>
            {statsQuery.isError && <ConsoleError text={messageOf(statsQuery.error)} retry={()=>void statsQuery.refetch()}/>} {stats && <><div className="glass panel" style={{marginBottom:15}}><span className="micro-label">Recorded feedback events</span><div className="metric-number" style={{fontSize:44,marginTop:8}}>{stats.recorded_outcomes}</div><p className="muted">These totals reflect feedback stored by the backend.</p></div><MeterChart stats={stats}/></>}
            {!stats && !statsQuery.isError && <div className="glass console-empty">Loading outcome statistics…</div>}
          </section>

          <section className="console-section" id="system"><div className="console-section__head"><h2><span className="micro-label">06 / </span>System status</h2><span>Health check polls every 15 seconds</span></div>
            {healthQuery.isError && <ConsoleError text={messageOf(healthQuery.error)} retry={()=>void healthQuery.refetch()}/>}<div className="glass panel"><div className="health-row"><span><HeartPulse size={14} style={{verticalAlign:"middle",marginRight:8}}/>FastAPI backend</span><span className={healthStatus === "Connected" ? "real-badge" : "tag"}>{healthStatus}</span></div><div className="health-row"><span>Hindsight memory</span><span className="tag">{demoActive ? "Demo fixture" : "Integration status not reported by API"}</span></div><div className="health-row"><span>Groq analysis</span><span className="tag">{demoActive ? "Demo fixture" : "Integration status not reported by API"}</span></div><p className="muted" style={{marginBottom:0}}>The current health route reports API liveness only; it does not report integration status. When memory or the optional LLM is unavailable, analysis can fall back to runbook guidance.</p>{healthQuery.data?.data.timestamp && <div className="field-hint" style={{marginTop:12}}>Last response · {new Date(healthQuery.data.data.timestamp).toLocaleString()}</div>}</div>
          </section>
          <footer className="footer" style={{marginTop:52,padding:"23px 0 0",background:"transparent"}}><div className="footer__line">Recommendations support human review. IncidentMind never executes recovery commands.</div><div className="footer__links" style={{marginTop:12}}><a href="/">Marketing site</a><a href="/#developers">Developer setup</a></div></footer>
        </main>
      </div>
    </div>
  </>;
}
