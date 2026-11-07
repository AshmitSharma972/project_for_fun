"""IncidentMind operations workspace. The browser-facing UI uses FastAPI only."""

from __future__ import annotations

import os
from html import escape

import requests
import streamlit as st


BASE_URL = os.getenv("INCIDENTMIND_API_URL", "http://127.0.0.1:8000").rstrip("/")
REQUEST_TIMEOUT = 12


class BackendError(RuntimeError):
    """An API request failed with a message suitable for the dashboard."""


def api(path: str, method: str = "GET", payload: dict | None = None) -> dict:
    try:
        response = requests.request(
            method, f"{BASE_URL}{path}", json=payload, timeout=REQUEST_TIMEOUT
        )
        response.raise_for_status()
        return response.json()
    except requests.HTTPError as exc:
        try:
            detail = response.json().get("detail", response.reason)
        except (ValueError, AttributeError):
            detail = response.reason
        raise BackendError(f"{detail} (HTTP {response.status_code})") from exc
    except requests.RequestException as exc:
        raise BackendError(
            "The IncidentMind API is unavailable. Check that FastAPI is running "
            f"at {BASE_URL}, then retry."
        ) from exc
    except ValueError as exc:
        raise BackendError("The API returned an unreadable response. Retry in a moment.") from exc


st.set_page_config(
    page_title="IncidentMind — Response workspace",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;1,500&display=swap');
    :root {
      --paper: #f5f3ed; --surface: #fffefa; --ink: #20231f; --muted: #666a60;
      --line: #deddd3; --olive: #485843; --olive-deep: #334432; --rust: #a24c37;
      --soft-olive: #e9ede5; --soft-rust: #f4e9e4; --mono: 'DM Mono', monospace;
    }
    html, body, [class*="css"] { font-family: 'DM Sans', sans-serif; color: var(--ink); }
    .stApp { background: var(--paper); }
    .block-container { max-width: 1440px; padding: 1.1rem clamp(1.1rem, 5vw, 5.1rem) 4rem; }
    .visually-hidden, [data-testid="stHeading"]:has(#incidentmind), .element-container:has(#incidentmind) { display: none; }
    .skip-link { position:absolute; top:-5rem; left:1rem; z-index:1000; padding:.7rem 1rem; background:var(--ink); color:var(--surface); }
    .skip-link:focus { top:1rem; color:var(--surface); }
    #main-content { scroll-margin-top:1.5rem; }
    header[data-testid="stHeader"] { background: rgba(245,243,237,.94); }
    [data-testid="stToolbar"] { right: 1rem; }
    #MainMenu, footer { visibility: hidden; }
    .masthead { display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--line); padding: .6rem 0 1rem; margin-bottom:3rem; }
    .brand { font-size:1rem; font-weight:700; letter-spacing:-.045em; }
    .brand span { color:var(--olive); }
    .masthead-note, .eyebrow, .section-kicker, .micro-label { font-family:var(--mono); text-transform:uppercase; letter-spacing:.13em; font-size:.68rem; color:var(--muted); }
    .hero { position:relative; padding:0 0 2.5rem; }
    .hero h1 { font-family:'Playfair Display', Georgia, serif; font-weight:500; letter-spacing:-.055em; font-size:clamp(3.3rem,7.6vw,7rem); line-height:.99; margin:.9rem 0 1.3rem; max-width:1000px; }
    .hero h1 em { color:var(--olive); font-weight:500; }
    .hero-copy { max-width:570px; color:#55594f; font-size:1.06rem; line-height:1.7; }
    .hero-aside { border-left:1px solid var(--line); padding:.5rem 0 .5rem 1.1rem; margin-top:1.4rem; color:var(--muted); font-size:.85rem; line-height:1.7; }
    .hero-aside strong { display:block; color:var(--ink); font-family:var(--mono); font-weight:400; font-size:.69rem; letter-spacing:.09em; text-transform:uppercase; margin-bottom:.35rem; }
    .rule { height:1px; background:var(--line); margin:2rem 0 2.2rem; }
    .section-head { display:flex; align-items:baseline; justify-content:space-between; gap:1rem; margin:0 0 1rem; }
    .section-head h2 { font-family:'Playfair Display', Georgia, serif; font-size:clamp(1.6rem,3vw,2.45rem); letter-spacing:-.04em; font-weight:500; margin:0; }
    .section-kicker { white-space:nowrap; }
    .panel { background:var(--surface); border:1px solid var(--line); border-radius:4px; padding:1.35rem 1.45rem; }
    .stat-panel { min-height:120px; }
    .stat-value { font-family:'Playfair Display', Georgia, serif; font-size:2.25rem; letter-spacing:-.04em; line-height:1; margin:.7rem 0 .35rem; }
    .stat-caption { color:var(--muted); font-size:.82rem; }
    .status-line { display:flex; align-items:center; gap:.55rem; color:var(--muted); font-size:.82rem; padding:.7rem 0; }
    .status-dot { width:8px; height:8px; background:var(--olive); border-radius:50%; display:inline-block; }
    .status-dot.offline { background:var(--rust); }
    .stButton > button, .stFormSubmitButton > button { min-height:44px; border-radius:2px; font-weight:600; border:1px solid var(--olive); transition:background .18s ease, color .18s ease, border-color .18s ease; }
    .stButton > button[kind="primary"], .stFormSubmitButton > button[kind="primary"] { background:var(--olive); color:#fffefa; }
    .stButton > button[kind="primary"]:hover, .stFormSubmitButton > button[kind="primary"]:hover { background:var(--olive-deep); border-color:var(--olive-deep); color:#fff; }
    .stButton > button:not([kind="primary"]), .stFormSubmitButton > button:not([kind="primary"]) { background:transparent; color:var(--olive-deep); }
    .stButton > button:not([kind="primary"]):hover, .stFormSubmitButton > button:not([kind="primary"]):hover { background:var(--soft-olive); border-color:var(--olive); color:var(--olive-deep); }
    button:focus-visible, input:focus-visible, textarea:focus-visible, [tabindex="0"]:focus-visible { outline:3px solid #aa6a45 !important; outline-offset:2px !important; }
    .stTextInput label, .stTextArea label, .stSelectbox label, .stNumberInput label { color:var(--ink); font-size:.88rem; font-weight:600; }
    input, textarea, [data-baseweb="select"] > div { border-radius:2px !important; }
    .incident-band { border-left:3px solid var(--rust); background:var(--soft-rust); padding:1rem 1.1rem; margin:.7rem 0 1.1rem; }
    .incident-meta { font-family:var(--mono); font-size:.7rem; text-transform:uppercase; letter-spacing:.08em; color:#70473a; }
    .incident-error { font-family:'Playfair Display', Georgia, serif; font-size:1.28rem; line-height:1.35; margin-top:.35rem; overflow-wrap:anywhere; }
    .step { display:flex; gap:.85rem; align-items:flex-start; border-bottom:1px solid var(--line); padding:.8rem 0; line-height:1.55; }
    .step:last-child { border-bottom:0; }
    .step-num { font-family:var(--mono); color:var(--rust); font-size:.75rem; padding-top:.2rem; }
    .evidence-card { border-top:1px solid var(--line); padding:1rem 0; }
    .evidence-card p { margin:.45rem 0 0; color:#44483f; line-height:1.65; overflow-wrap:anywhere; }
    .empty-note { color:var(--muted); font-size:.92rem; line-height:1.6; padding:.8rem 0; }
    .footer-note { margin-top:3.5rem; border-top:1px solid var(--line); padding-top:1.1rem; display:flex; justify-content:space-between; gap:1rem; color:var(--muted); font-size:.74rem; }
    [data-testid="stAlert"] { border-radius:2px; }
    @media(max-width:700px) {
      .block-container { padding: .7rem 1rem 2.5rem; }
      .masthead { margin-bottom:2rem; }
      .masthead-note { max-width:45%; text-align:right; font-size:.58rem; }
      .hero h1 { font-size:clamp(3.05rem,14vw,5rem); }
      .panel { padding:1rem; }
      .section-head { align-items:flex-start; flex-direction:column; gap:.25rem; }
      .footer-note { flex-direction:column; gap:.35rem; }
    }
    @media(prefers-reduced-motion:reduce) { *, *::before, *::after { scroll-behavior:auto !important; transition:none !important; animation:none !important; } }
    </style>
    """,
    unsafe_allow_html=True,
)


def load_incident(incident_id: str) -> None:
    try:
        st.session_state.current_item = api(f"/incidents/{incident_id.strip()}")
        st.session_state.current_analysis = None
        st.session_state.feedback_saved = False
        st.session_state.approved = False
        st.session_state.workflow_error = None
    except BackendError as exc:
        st.session_state.workflow_error = str(exc)


st.title("IncidentMind")

st.markdown(
    '<a class="skip-link" href="#main-content">Skip to incident workspace</a>',
    unsafe_allow_html=True,
)

st.markdown(
    '<div class="masthead"><div class="brand">incident<span>mind</span></div>'
    '<div class="masthead-note">An evidence-led response workspace</div></div>',
    unsafe_allow_html=True,
)

st.markdown(
    '<div class="hero"><div class="eyebrow">Operational clarity, when it matters</div>'
    '<h1>Respond with<br><em>the whole story.</em></h1>'
    '<div class="hero-copy">Bring an incident into focus, learn from verified experience, '
    'and keep every recovery decision in an engineer’s hands.</div></div>',
    unsafe_allow_html=True,
)

try:
    health = api("/health")
    backend_online = health.get("status") == "ok"
except BackendError:
    backend_online = False

try:
    stats = api("/stats/outcomes") if backend_online else None
except BackendError:
    stats = None

st.markdown('<div class="rule"></div>', unsafe_allow_html=True)
col_overview, col_recent, col_state = st.columns([1, 1, 1.1], gap="medium")
with col_overview:
    st.markdown(f'<div class="panel stat-panel"><div class="micro-label">Verified outcomes</div><div class="stat-value">{stats["recorded_outcomes"] if stats else "—"}</div><div class="stat-caption">Engineer-recorded learning</div></div>', unsafe_allow_html=True)
with col_recent:
    resolved = stats.get("outcomes", {}).get("resolved", 0) if stats else "—"
    denominator = stats.get("recorded_outcomes", 0) if stats else None
    resolved_label = f"{resolved} / {denominator}" if denominator is not None else "—"
    st.markdown(f'<div class="panel stat-panel"><div class="micro-label">Resolved</div><div class="stat-value">{resolved_label}</div><div class="stat-caption">Reported outcome, not an automated claim</div></div>', unsafe_allow_html=True)
with col_state:
    dot = "" if backend_online else " offline"
    state = "Connected to the response API" if backend_online else "Response API unavailable"
    st.markdown(f'<div class="panel stat-panel"><div class="micro-label">Workspace status</div><div class="status-line"><span class="status-dot{dot}"></span>{state}</div><div class="stat-caption">'
                f'{"Live backend data" if backend_online else "Start FastAPI, then retry"}</div></div>', unsafe_allow_html=True)

if stats:
    counts = stats.get("outcomes", {})
    outcome_line = "  ·  ".join(f"{name.title()} {count}" for name, count in sorted(counts.items()))
    if outcome_line:
        st.caption(f"Outcome ledger  /  {outcome_line}")

st.markdown('<div class="rule"></div>', unsafe_allow_html=True)
st.markdown('<div id="main-content" tabindex="-1"></div>', unsafe_allow_html=True)
left, right = st.columns([1.05, .95], gap="large")

with left:
    st.markdown('<div class="section-head"><h2>01 / Bring an incident in</h2><span class="section-kicker">Intake</span></div>', unsafe_allow_html=True)
    st.markdown('<div class="empty-note">Describe the signal you received. IncidentMind classifies it and keeps the original alert attached to the investigation.</div>', unsafe_allow_html=True)
    with st.form("incident_intake", clear_on_submit=False):
        service = st.text_input("Service", placeholder="e.g. payments-api", max_chars=160)
        error = st.text_input("Alert or error", placeholder="e.g. Connection pool timeout", max_chars=2000)
        logs = st.text_area("Relevant logs", placeholder="Paste a short log excerpt (optional)", height=120, max_chars=20000)
        intake_a, intake_b = st.columns(2)
        with intake_a:
            cpu = st.number_input("CPU utilization % (optional)", min_value=0.0, max_value=100.0, value=0.0, step=1.0)
        with intake_b:
            failed_requests = st.number_input("Failed requests", min_value=0, value=0, step=1)
        create_submitted = st.form_submit_button("Create incident  ↗", type="primary", use_container_width=True)
    if create_submitted:
        if not service.strip() or not error.strip():
            st.error("Add both a service name and an alert description to continue.")
        else:
            payload = {"service": service.strip(), "error": error.strip(), "logs": logs.strip(), "failed_requests": int(failed_requests)}
            if cpu > 0:
                payload["cpu"] = cpu
            try:
                created = api("/incidents", "POST", payload)
                st.session_state.current_item = created
                st.session_state.current_analysis = None
                st.session_state.feedback_saved = False
                st.session_state.approved = False
                st.session_state.workflow_error = None
                st.success("Incident created. Review its classification, then analyze it when ready.")
            except BackendError as exc:
                st.error(str(exc))

    with st.expander("Already have an incident ID?", expanded=False):
        with st.form("load_incident"):
            saved_id = st.text_input("Incident ID", placeholder="Paste an existing incident ID")
            load_submitted = st.form_submit_button("Open incident", use_container_width=True)
        if load_submitted:
            if saved_id.strip():
                load_incident(saved_id)
            else:
                st.warning("Enter an incident ID first.")

    if st.session_state.get("workflow_error"):
        st.error(st.session_state.workflow_error)

with right:
    st.markdown('<div class="section-head"><h2>02 / The investigation</h2><span class="section-kicker">Review &amp; learn</span></div>', unsafe_allow_html=True)
    item = st.session_state.get("current_item")
    if not item:
        st.markdown('<div class="panel"><div class="micro-label">Your next step</div><div class="empty-note">Create an incident or open one by ID. The analysis and its source evidence will appear here, alongside a runbook fallback when history is unavailable.</div></div>', unsafe_allow_html=True)
    else:
        incident = item["incident"]
        severity = incident.get("severity", "unknown").upper()
        category = item.get("category", "Unclassified")
        st.markdown(
            f'<div class="incident-band"><div class="incident-meta">{escape(str(category))} &nbsp; / &nbsp; {escape(str(severity))} severity &nbsp; / &nbsp; {escape(str(incident["service"]))}</div>'
            f'<div class="incident-error">{escape(str(incident["error"]))}</div><div class="incident-meta" style="margin-top:.6rem">ID &nbsp; {escape(str(incident["id"]))}</div></div>',
            unsafe_allow_html=True,
        )
        if incident.get("symptoms"):
            st.caption("Detected signal  ·  " + " · ".join(incident["symptoms"]))
        if incident.get("logs_excerpt"):
            with st.expander("View attached log excerpt"):
                st.code(incident["logs_excerpt"], language="text")

        analyze_col, _ = st.columns([.65, 1.35])
        with analyze_col:
            analyze_clicked = st.button("Analyze with evidence", type="primary", use_container_width=True, key=f"analyze-{incident['id']}")
        if analyze_clicked:
            with st.spinner("Recalling relevant experience and checking the runbook…"):
                try:
                    st.session_state.current_analysis = api(f"/incidents/{incident['id']}/analyze", "POST")
                    st.session_state.feedback_saved = False
                    st.session_state.approved = False
                except BackendError as exc:
                    st.error(str(exc))

        analysis = st.session_state.get("current_analysis")
        if analysis:
            st.markdown('<div class="rule"></div>', unsafe_allow_html=True)
            evidence = analysis.get("evidence", [])
            st.markdown('<div class="section-head"><h2>Memory evidence</h2></div>', unsafe_allow_html=True)
            if evidence:
                st.caption("Relevant historical records returned by Hindsight. Evidence supports review; it does not prove the cause of this incident.")
                for index, memory in enumerate(evidence, start=1):
                    label = memory.get("memory_id") or f"Retrieved memory {index}"
                    memory_type = memory.get("memory_type") or "Historical record"
                    memory_text = memory.get("raw_memory_text") or memory.get("text") or "No text supplied."
                    st.markdown(f'<div class="evidence-card"><div class="micro-label">{escape(str(label))} &nbsp; / &nbsp; {escape(str(memory_type))}</div><p>{escape(str(memory_text))}</p></div>', unsafe_allow_html=True)
            else:
                st.markdown('<div class="empty-note">No relevant experience was returned. This analysis uses the matching runbook as its fallback.</div>', unsafe_allow_html=True)

            hypotheses = analysis.get("hypotheses", [])
            if hypotheses:
                st.markdown('<div class="section-head"><h2>Suspected causes</h2></div>', unsafe_allow_html=True)
                for hypothesis in hypotheses:
                    ids = hypothesis.get("evidence_incident_ids", [])
                    citation = f"Evidence · {', '.join(ids)}" if ids else "No linked evidence IDs"
                    st.markdown(f'<div class="evidence-card"><strong>{escape(str(hypothesis.get("cause", "Unspecified cause")))}</strong><p>{escape(str(hypothesis.get("reasoning", "")))}</p><div class="micro-label">{escape(str(citation))} &nbsp; / &nbsp; {escape(str(hypothesis.get("status", "suspected")))}</div></div>', unsafe_allow_html=True)

            if analysis.get("fallback_used"):
                st.info("Runbook guidance is shown as a fallback. No unsupported AI diagnosis is presented.")
            st.markdown('<div class="section-head"><h2>Recommended review steps</h2></div>', unsafe_allow_html=True)
            steps = analysis.get("recommended_steps", [])
            if steps:
                for index, step in enumerate(steps, start=1):
                    st.markdown(f'<div class="step"><span class="step-num">{index:02d}</span><span>{escape(str(step))}</span></div>', unsafe_allow_html=True)
            else:
                st.markdown('<div class="empty-note">No recovery steps were returned for review.</div>', unsafe_allow_html=True)
            if analysis.get("runbook_ref"):
                st.caption(f"Runbook source  /  {analysis['runbook_ref']}")

            st.markdown('<div class="rule"></div>', unsafe_allow_html=True)
            st.markdown('<div class="section-head"><h2>03 / Record what happened</h2></div>', unsafe_allow_html=True)
            st.caption("Only submit a cause you have verified. This record can improve future recall.")
            with st.form(f"feedback-{incident['id']}"):
                verified_cause = st.text_input("Verified root cause", placeholder="What did the investigation confirm?", max_chars=2000)
                outcome = st.selectbox("Observed outcome", ["resolved", "partial", "failed"], format_func=lambda value: {"resolved": "Resolved", "partial": "Partially resolved", "failed": "Fix failed"}[value])
                taken_steps = st.text_area("Steps taken", placeholder="One step per line", height=90, max_chars=6000)
                notes = st.text_area("Engineer notes (optional)", height=80, max_chars=4000)
                feedback_submitted = st.form_submit_button("Save verified feedback", type="primary", use_container_width=True)
            if feedback_submitted:
                if not verified_cause.strip():
                    st.error("Enter the verified cause before saving feedback.")
                else:
                    payload = {"verified_cause": verified_cause.strip(), "steps_taken": [line.strip() for line in taken_steps.splitlines() if line.strip()], "outcome": outcome, "notes": notes.strip()}
                    try:
                        result = api(f"/incidents/{incident['id']}/feedback", "POST", payload)
                        st.session_state.feedback_saved = True
                        st.session_state.feedback_memory_retained = result.get("memory_retained", False)
                        st.success("Verified feedback saved." + (" Retained in incident memory." if result.get("memory_retained") else " Local record saved; incident memory did not confirm retention."))
                    except BackendError as exc:
                        st.error(str(exc))

            if st.session_state.get("feedback_saved"):
                st.markdown('<div class="rule"></div>', unsafe_allow_html=True)
                st.markdown('<div class="micro-label">Human approval gate</div>', unsafe_allow_html=True)
                st.caption("Approval records a simulated action only. IncidentMind never runs recovery commands.")
                if st.session_state.get("approved"):
                    st.success("Action marked approved. Execution remains simulated only.")
                elif st.button("Approve simulated action", key=f"approve-{incident['id']}"):
                    try:
                        result = api(f"/incidents/{incident['id']}/approve-action", "POST")
                        st.session_state.approved = bool(result.get("approved"))
                        st.success("Approval recorded. No recovery action was executed.")
                    except BackendError as exc:
                        st.error(str(exc))

st.markdown(
    '<div class="footer-note"><span>incidentmind &nbsp; / &nbsp; evidence-led incident response</span>'
    '<span>Recommendations need engineer review. Actions are never executed.</span></div>',
    unsafe_allow_html=True,
)
