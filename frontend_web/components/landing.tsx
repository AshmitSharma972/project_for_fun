"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, Copy, ShieldCheck } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { LandingMotion } from "@/components/motion-init";
import { MemoryGraph } from "@/components/memory-graph";
import { DEMO_ANALYSIS, DEMO_STATS } from "@/lib/fixtures";
import { getStats } from "@/lib/api";
import { BrandMark } from "@/components/brand-mark";
import { PageIndex } from "@/components/page-index";

const journey = [
  { title: "Submit an alert", copy: "A service signal arrives with the details an engineer has: error text, logs and optional capacity indicators.", label: "01 / INTAKE", mock: "payments-api · connection timeout" },
  { title: "Classify and store", copy: "IncidentMind assigns a category and severity, then stores the incident record in SQLite.", label: "02 / CLASSIFY", mock: "Database · HIGH severity" },
  { title: "Recall and analyze", copy: "On request, similar past incidents and a matching runbook are brought into the investigation.", label: "03 / ANALYZE", mock: "2 evidence records · database_failure.md" },
  { title: "Review evidence", copy: "If memory evidence and the optional LLM are available, suspected causes are returned with their evidence references.", label: "04 / REVIEW", mock: "Suspected: connection pool saturation" },
  { title: "Record the outcome", copy: "An engineer enters the verified cause, steps taken and observed result for future learning.", label: "05 / LEARN", mock: "Outcome · resolved · verified by engineer" },
  { title: "Approve explicitly", copy: "An engineer may record approval. The API reports a simulated action only; no command runs.", label: "06 / APPROVAL", mock: "SIMULATED ONLY · no execution" },
];

const faq = [
  ["Does IncidentMind fix incidents automatically?", "No. It provides recommendations for engineers to review. Approval is recorded as simulated only, and IncidentMind does not execute recovery commands."],
  ["What if Hindsight or Groq is unavailable?", "Incident intake and local feedback storage still work. If memory or AI analysis is unavailable, the backend falls back to runbook guidance."],
  ["Where is incident data stored?", "Incident and feedback records are stored in local SQLite. When configured, verified incidents are also sent to Hindsight for recall in future investigations."],
  ["What is experimental?", "Replay, deploy-risk helpers, synthetic chaos and GPU classifier training are auxiliary experiments, not part of the main incident workflow."],
  ["Can the console list every stored incident?", "The current API supports creating an incident and retrieving it by ID, but does not expose an incident-list route. The console keeps locally created IDs in this browser and restores a selected incident from its URL."],
];

const routes = [
  ["GET", "/health", "Service liveness"],
  ["POST", "/incidents", "Classify and store an alert"],
  ["GET", "/incidents/{id}", "Retrieve an incident"],
  ["POST", "/incidents/{id}/analyze", "Recall evidence and runbook guidance"],
  ["POST", "/incidents/{id}/feedback", "Record verified outcome"],
  ["POST", "/incidents/{id}/approve-action", "Record simulated approval"],
  ["GET", "/stats/outcomes", "Summarize stored outcomes"],
];

const PREVIEW_STEPS_DATA = [
  {
    step: 1,
    tab: "Intake",
    icon: "＋",
    severity: "Medium · Ingestion",
    error: "Connection timeout reported from checkout worker",
    id: "ALERT INTAKE / PAYMENTS-API",
    reviewTitle: "Alert received",
    reviewSub: "Normalized raw logs and extracted failure signature.",
  },
  {
    step: 2,
    tab: "Incidents",
    icon: "◎",
    severity: "High · Database",
    error: "Database connection pool exhausted: timeout acquiring connection",
    id: "DEMO INCIDENT / PAYMENTS-API",
    reviewTitle: "Signals classified",
    reviewSub: "Classified into Database category and persisted to SQLite.",
  },
  {
    step: 3,
    tab: "Analysis",
    icon: "⌁",
    severity: "High · Evidence Found",
    error: "QueuePool limit 20 overflow 10 reached in checkout.py",
    id: "2 HISTORICAL RECORDS RECALLED",
    reviewTitle: "Similar history found",
    reviewSub: "Retrieved past verified incidents from Hindsight memory.",
  },
  {
    step: 4,
    tab: "Runbooks",
    icon: "↗",
    severity: "Action Ready · Review",
    error: "database_failure.md · 3 recommended recovery steps",
    id: "HUMAN-APPROVED WORKFLOW",
    reviewTitle: "Runbook ready for review",
    reviewSub: "Curated recovery steps paired with verified evidence.",
  },
];

function SectionIndex({ number, label }: { number: string; label: string }) {
  return <div className="section-index" aria-hidden="true"><strong>S.{number}</strong>{label}</div>;
}

function StoryStage({ active }: { active: number }) {
  const item = journey[active] ?? journey[0];
  return <div className="story__stage"><div className="demo-window mini-stage" style={{ transition: "all 0.35s ease" }}>
    <div className="mini-stage__label" style={{ transition: "all 0.3s ease" }}>IncidentMind · {item.label}</div>
    <div className="mini-stage__main anim-fade-in" key={item.mock}>{item.mock}</div>
    <div className="mini-stage__sub">Step {String(active + 1).padStart(2, "0")} / 06</div>
    <div className="mini-stage__lines"><i /><i /><i /></div>
    <div className="tooltip-dots" aria-hidden="true">
      {journey.map((_, i) => (
        <i
          key={i}
          style={{
            background: i === active ? "#9cb4ff" : "rgba(255,255,255,.2)",
            width: i === active ? 22 : 7,
            transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      ))}
    </div>
  </div></div>;
}

function CountStat({ value, label }: { value: string; label: string }) {
  const target = Number(value);
  const [count, setCount] = useState(Number.isFinite(target) ? 0 : value);
  useEffect(() => {
    if (!Number.isFinite(target)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setCount(value); return; }
    let frame = 0;
    let start = 0;
    let observed = false;
    const element = document.querySelector<HTMLElement>(`[data-count-label="${label}"]`);
    if (!element) { setCount(value); return; }
    const animate = (now: number) => {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / 720);
      setCount(String(Math.round(target * (1 - Math.pow(1 - progress, 3)))));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !observed) { observed = true; frame = requestAnimationFrame(animate); observer.disconnect(); }
    }, { threshold: .3 });
    observer.observe(element);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [label, target, value]);
  return <div className="fact" data-reveal data-count-label={label}><strong>{count}</strong><span>{label}</span></div>;
}

export function Landing() {
  const [activeStep, setActiveStep] = useState(0);
  const [previewStep, setPreviewStep] = useState(1);
  const [fallbackOn, setFallbackOn] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);
  const currentPreview = PREVIEW_STEPS_DATA[previewStep - 1] ?? PREVIEW_STEPS_DATA[0];

  const statsQuery = useQuery({
    queryKey: ["outcomes"],
    queryFn: async () => {
      try { return await getStats(); }
      catch (error) { console.warn("Outcome stats unavailable; showing labelled demo data.", error); return { data: DEMO_STATS, demo: true as const }; }
    },
    refetchInterval: 30_000,
  });
  const statsResult = statsQuery.data ?? { data: DEMO_STATS, demo: true };
  const stats = statsResult.data;
  const usingDemo = statsResult.demo;

  // Auto-advance preview walkthrough in Section 01
  useEffect(() => {
    const timer = setInterval(() => {
      setPreviewStep((prev) => (prev === 4 ? 1 : prev + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Smooth scroll sync for Section 03 Journey
  useEffect(() => {
    let ticking = false;
    const updateActiveStep = () => {
      const stepElements = Array.from(document.querySelectorAll<HTMLElement>("[data-journey-step]"));
      if (!stepElements.length) return;
      const targetY = window.innerHeight * 0.42;
      let closest = 0;
      let minDiff = Infinity;
      stepElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height * 0.35;
        const diff = Math.abs(center - targetY);
        if (diff < minDiff) {
          minDiff = diff;
          closest = index;
        }
      });
      setActiveStep(closest);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateActiveStep);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    updateActiveStep();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function copyCommands() {
    const commands = "uvicorn main:app --reload\nstreamlit run frontend/dashboard.py\ndocker compose up --build";
    try { await navigator.clipboard.writeText(commands); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setCopied(false); }
  }

  return <>
    <LandingMotion />
    <SiteNav />
    <PageIndex />
    <main id="main-content" className="landing-main">
      <section className="hero wrap" aria-labelledby="hero-title">
        <div className="hero__grid">
          <div>
            <div className="hero__eyebrow">Evidence-led incident response</div>
            <h1 id="hero-title"><span className="hero-line"><span className="hero-line__inner">Incidents,</span></span><span className="hero-line"><span className="hero-line__inner">remembered.</span></span></h1>
            <p className="hero__copy"><span className="hero__plus">+</span>IncidentMind connects incoming alerts with <b>verified experience</b> and runbook guidance, then learns from what engineers confirm.</p>
            <div className="hero__actions"><Link href="/console" className="pill" data-magnetic>Open console <span className="pill__arrow"><ArrowUpRight size={15} /></span></Link><a href="#journey" className="text-link">Explore the incident flow <ArrowDown size={13} /></a></div>
          </div>
          <div className="hero__side"><a href="#developers" className="text-link">Developer setup <ArrowUpRight size={13} /></a><Link href="/console" className="text-link">Open console <ArrowUpRight size={13} /></Link></div>
        </div>
        <a href="#product" className="hero__scroll">Scroll to explore</a>
      </section>

      <section className="section wrap" id="product" aria-labelledby="product-title" data-reveal>
        <SectionIndex number="01" label="Product" />
        <div className="section-content">
          <span className="section-kicker">A clearer view of what happened</span>
          <div className="demo-window" aria-label="Preview of the IncidentMind console">
            <div className="window-bar"><i className="window-dot"/><i className="window-dot"/><i className="window-dot"/><span className="window-title">INCIDENTMIND / RESPONSE CONSOLE</span><span className="nav-spacer"/><span className="demo-badge">Demo data</span></div>
            <div className="preview">
              <div className="preview__rail">
                {PREVIEW_STEPS_DATA.map((tab) => (
                  <div
                    key={tab.step}
                    style={{
                      background: previewStep === tab.step ? "rgba(255,255,255,.14)" : "transparent",
                      color: previewStep === tab.step ? "#ffffff" : "var(--subtle)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      transition: "all 0.25s ease",
                    }}
                    onClick={() => setPreviewStep(tab.step)}
                  >
                    <span>{tab.icon}</span> {tab.tab}
                  </div>
                ))}
              </div>
              <div className="preview__body">
                <div className="preview__left">
                  <div className="preview-card anim-fade-in" key={`card-${previewStep}`}>
                    <div className="preview__severity">{currentPreview.severity}</div>
                    <div className="preview__error">{currentPreview.error}</div>
                    <div className="preview__id">{currentPreview.id}</div>
                  </div>
                  <div className="preview__tooltip anim-fade-in" key={`tip-${previewStep}`}>
                    <div className="tooltip-top"><span>Step {previewStep} / 4</span><span>INCIDENT REVIEW</span></div>
                    <div className="preview__error">{currentPreview.reviewTitle}</div>
                    <div className="preview__sub">{currentPreview.reviewSub}</div>
                    <div className="tooltip-dots">
                      {[1, 2, 3, 4].map((s) => (
                        <i
                          key={s}
                          style={{
                            background: s === previewStep ? "#9cb4ff" : "rgba(255,255,255,.2)",
                            width: s === previewStep ? 22 : 7,
                            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                            cursor: "pointer",
                          }}
                          onClick={() => setPreviewStep(s)}
                        />
                      ))}
                      <button className="switch-button" style={{ marginLeft: "auto", minHeight: 30 }} onClick={() => setPreviewStep((step) => step === 4 ? 1 : step + 1)} aria-label="Next console preview step">NEXT ›</button>
                    </div>
                  </div>
                </div>
                <div className="preview__right">
                  <MemoryGraph evidence={DEMO_ANALYSIS.evidence} demo />
                </div>
              </div>
            </div>
          </div>
          <div className="preview-caption"><h3 id="product-title">Watch an alert become a lesson.</h3><Link href="/console#analysis" className="pill">Explore the memory map <span className="pill__arrow"><ArrowRight size={14}/></span></Link></div>
        </div>
      </section>

      <section className="section wrap" id="section-02" aria-label="Project facts and technology" data-reveal>
        <SectionIndex number="02" label="Project facts" />
        <div className="section-content">
          <div className="built-strip"><span>Built with</span><b>FastAPI</b><span>·</span><b>SQLite</b><span>·</span><b>Hindsight</b><span>·</span><b>Groq (optional)</b></div>
          <div className="facts"><CountStat value="7" label="API routes"/><CountStat value="3" label="Recorded outcomes"/><CountStat value="0" label="Recovery commands executed"/><CountStat value="SQLite" label="Local-first storage"/></div>
        </div>
      </section>

      <section className="section wrap" id="journey" aria-labelledby="journey-title">
        <SectionIndex number="03" label="How it works" />
        <div className="section-content">
          <div className="story__intro">
            <span className="section-kicker">One investigation, six clear steps</span>
            <h2 className="section-heading" id="journey-title">From first signal to verified learning.</h2>
          </div>
          <div className="story">
            <div>
              {journey.map((item, i) => (
                <article
                  className={`story__step${i === activeStep ? " story__step--active" : ""}`}
                  data-journey-step={i}
                  key={item.label}
                >
                  <div className="story__step-content">
                    <span className="micro-label">S.03 · {item.label}</span>
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </div>
                </article>
              ))}
            </div>
            <StoryStage active={activeStep} />
          </div>
        </div>
      </section>

      <section className="section wrap" id="memory" aria-labelledby="memory-title" data-reveal>
        <SectionIndex number="04" label="Memory map" />
        <div className="section-content constellation-layout">
          <div><span className="section-kicker">A constellation of past incidents</span><h2 className="section-heading" id="memory-title">The current signal, in context.</h2><p className="section-lede">When Hindsight returns similar experience, the console brings those records into view beside the current incident. Select or focus a node to inspect its available details.</p><div style={{marginTop:22}}><span className="demo-badge">Demo data · landing preview</span></div></div>
          <MemoryGraph evidence={DEMO_ANALYSIS.evidence} demo />
        </div>
      </section>

      <section className="section wrap" id="section-05" aria-labelledby="capabilities-title">
        <SectionIndex number="05" label="Capabilities" />
        <div className="section-content"><span className="section-kicker">S.05 / The response loop</span><h2 className="section-heading" id="capabilities-title" data-reveal>Four parts of a grounded response.</h2><span className="demo-badge">Illustrative mini screens · demo data</span>
          <div className="feature-grid">
            <article className="feature-card" data-reveal><div className="feature-visual demo-window"><div className="feature-card__top"><span>01 / CLASSIFY</span><span>LOG SIGNALS</span></div><table className="tiny-table"><tbody><tr><td>connection pool timeout</td><td>Database</td></tr><tr><td>CPU at 91%</td><td>high</td></tr><tr><td>request latency</td><td>symptom</td></tr></tbody></table></div><h3>Classify</h3><p>Log analysis maps the alert to a category and severity for the engineer to review.</p></article>
            <article className="feature-card" data-reveal><div className="feature-visual demo-window"><div className="feature-card__top"><span>02 / RECALL</span><span>HINDSIGHT</span></div><div className="evidence-spark"><i/><span>payments-api · resolved<br/><small>verified pool saturation</small></span></div><div className="evidence-spark"><i/><span>checkout · partial<br/><small>database timeout signature</small></span></div><div className="mini-stage__sub">Similar records, when available</div></div><h3>Recall</h3><p>Relevant historical incidents provide context without being treated as proof.</p></article>
            <article className="feature-card" data-reveal><div className="feature-visual demo-window"><div className="feature-card__top"><span>03 / RECOMMEND</span><span>REVIEW FIRST</span></div><div className="tiny-terminal"><span>01</span> Check pool saturation<br/><span>02</span> Inspect query latency<br/><span>03</span> Compare deploy timing<br/><br/>source: database_failure.md</div></div><h3>Recommend</h3><p>Suspected causes cite returned evidence; runbook guidance remains available as a fallback.</p></article>
            <article className="feature-card" data-reveal><div className="feature-visual demo-window"><div className="feature-card__top"><span>04 / LEARN</span><span>OUTCOME</span></div><div className="bar-mini"><i style={{height:"82%"}}/><i style={{height:"48%"}}/><i style={{height:"32%"}}/><i style={{height:"66%"}}/></div><div className="mini-stage__sub">resolved · partial · failed</div></div><h3>Learn</h3><p>Engineer-verified causes and outcomes can become useful context for later investigations.</p></article>
          </div>
        </div>
      </section>

      <section className="section wrap" id="section-06" aria-labelledby="safety-title" data-reveal>
        <SectionIndex number="06" label="Human control" />
        <div className="section-content"><span className="section-kicker">Safety by design</span><h2 className="section-heading" id="safety-title">Always a recommendation.<br/>Never an execution.</h2>
          <div className="safe-layout"><article className="safe-card demo-window"><span className="sim-pill"><ShieldCheck size={14}/> SIMULATED ONLY</span><h3 className="safe-card__headline" style={{marginTop:22}}>An approval is a record, not a command.</h3><p>Engineer feedback is required before approval can be recorded. The approval route returns “simulated only”; IncidentMind never runs recovery actions.</p><Link href="/console#feedback" className="text-link">See the approval gate <ArrowUpRight size={13}/></Link></article>
            <article className="safe-card demo-window"><div className="feature-card__top"><span>Fallback behavior</span><span>HONEST BY DEFAULT</span></div><div className="fallback-switch" role="group" aria-label="Compare memory available and fallback states"><button className="switch-button" aria-pressed={!fallbackOn} onClick={() => setFallbackOn(false)}>Memory available</button><button className="switch-button" aria-pressed={fallbackOn} onClick={() => setFallbackOn(true)}>Fallback</button></div><div className="safe-card__headline">{fallbackOn ? "Runbook guidance takes over." : "Evidence supports review."}</div><p>{fallbackOn ? "When memory or the optional AI analysis is unavailable, the incident still gets matching runbook steps. The interface makes that fallback visible." : "When relevant historical evidence and the optional LLM are available, suspected causes can cite supporting incident records."}</p></article></div>
        </div>
      </section>

      <section className="section wrap" id="outcomes" aria-labelledby="outcomes-title" data-reveal>
        <SectionIndex number="07" label="Outcome ledger" />
        <div className="section-content outcome-layout">
          <div><span className="section-kicker">S.07 / Engineer-verified outcomes</span><h2 className="section-heading" id="outcomes-title">Learning, counted honestly.</h2><p className="section-lede">These totals come from the outcome endpoint. The landing preview switches to labelled demo data if the backend is unavailable.</p><div style={{marginTop:20}}>{usingDemo ? <span className="demo-badge">Demo data</span> : <span className="real-badge">Live backend data</span>}</div><div style={{marginTop:32}}><div className="metric-number">{stats.recorded_outcomes}</div><div className="metric-label">Recorded feedback events</div></div></div>
          <div className="glass panel"><div className="chart" role="img" aria-label={`Category outcomes: ${Object.entries(stats.categories).map(([k,v])=>`${k} ${v}`).join(", ") || "no outcomes"}`}>
            <span className="micro-label">By incident category</span>
            {Object.entries(stats.categories).length ? Object.entries(stats.categories).map(([name, value]) => <div className="chart-row" key={name}><span>{name}</span><span className="chart-track"><i className="chart-fill" style={{"--bar-width":`${Math.max(2, value / Math.max(...Object.values(stats.categories), 1) * 100)}%`} as CSSProperties}/></span><span className="chart-value">{value}</span></div>) : <div className="console-empty">No recorded outcomes yet.</div>}
            <span className="micro-label" style={{display:"block",marginTop:17}}>By outcome</span>
            {(["resolved","partial","failed"] as const).map((name) => { const value = stats.outcomes[name] ?? 0; const total = Math.max(1, stats.recorded_outcomes); return <div className="chart-row" key={name}><span>{name}</span><span className="chart-track"><i className={`chart-fill chart-fill--${name}`} style={{"--bar-width":`${value / total * 100}%`} as CSSProperties}/></span><span className="chart-value">{value}</span></div>; })}
          </div></div>
        </div>
      </section>

      <section className="section wrap" id="developers" aria-labelledby="developers-title" data-reveal>
        <SectionIndex number="08" label="Developers" />
        <div className="section-content"><span className="section-kicker">S.08 / Run it locally</span><h2 className="section-heading" id="developers-title">A small stack. A clear contract.</h2><p className="section-lede">Start the FastAPI service and the existing Streamlit fallback, or launch the new Next.js frontend from its own folder.</p>
          <div className="demo-window terminal" style={{marginTop:28}}><div className="terminal__head"><span>LOCAL DEVELOPMENT / POWERSHELL</span><button className="copy-button" onClick={copyCommands} aria-label="Copy development commands"><Copy size={12}/> {copied ? "Copied" : "Copy"}</button></div><div className="terminal__body"><span>$</span> uvicorn main:app --reload<br/><span>$</span> streamlit run frontend/dashboard.py<br/><span>$</span> docker compose up --build<br/><br/><em>✓ API 8000 · Streamlit fallback 8501 · Next.js console 3000</em></div></div>
          <div className="demo-window" style={{marginTop:22,overflowX:"auto"}}><table className="routes"><thead><tr><th>Method</th><th>Route</th><th>Purpose</th></tr></thead><tbody>{routes.map(([method,path,purpose])=><tr key={path}><td>{method}</td><td>{path}</td><td>{purpose}</td></tr>)}</tbody></table></div>
        </div>
      </section>

      <section className="section wrap" id="section-09" aria-labelledby="faq-title" data-reveal>
        <SectionIndex number="09" label="Honest limits" />
        <div className="section-content"><span className="section-kicker">S.09 / Clear by design</span><h2 className="section-heading" id="faq-title">The boundaries matter.</h2>
          <div className="faq" role="list">{faq.map(([question, answer], i) => <div className="faq-item" key={question} role="listitem"><button className="faq-q" aria-expanded={openFaq === i} aria-controls={`faq-answer-${i}`} id={`faq-question-${i}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>{question}<ChevronDown size={17} aria-hidden="true"/></button>{openFaq === i && <div className="faq-a" id={`faq-answer-${i}`} role="region" aria-labelledby={`faq-question-${i}`}>{answer}</div>}</div>)}</div>
        </div>
      </section>

      <section className="section wrap" id="section-10" aria-labelledby="final-title" data-reveal>
        <SectionIndex number="10" label="Next step" />
        <div className="section-content"><span className="section-kicker">Bring one alert into focus</span><h2 className="section-heading" id="final-title">Make the next incident<br/>a little less new.</h2><p className="section-lede">Start with an alert. Review its evidence. Keep every decision with the people responsible for the system.</p><div style={{display:"flex",gap:16,marginTop:25,flexWrap:"wrap"}}><Link href="/console" className="pill">Open console <span className="pill__arrow"><ArrowUpRight size={14}/></span></Link><a href="#developers" className="text-link">Read the developer setup <ArrowUpRight size={13}/></a></div></div>
      </section>
    </main>
    <footer className="footer"><div className="wrap footer__row"><div><BrandMark/><p className="footer__line">Incident response grounded in evidence, runbooks and what engineers verify. Recommendations only; recovery actions are never executed.</p></div><nav className="footer__links" aria-label="Footer"><a href="#product">Product</a><a href="#journey">How it works</a><Link href="/console">Console</Link><a href="#developers">Developer setup</a></nav></div><div className="wrap" style={{marginTop:26,color:"var(--muted)",font:"9px var(--font-mono)"}}>INCIDENTMIND AI · LOCAL-FIRST SQLITE · HUMAN-APPROVED WORKFLOW</div></footer>
  </>;
}
