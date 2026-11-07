"""Streamlit dashboard. It uses HTTP only; Hindsight is never imported here."""
import os
import requests
import streamlit as st

BASE_URL = os.getenv("INCIDENTMIND_API_URL", "http://127.0.0.1:8000")
def api(path: str, method: str = "GET", payload: dict | None = None) -> dict:
    response = requests.request(method, f"{BASE_URL}{path}", json=payload, timeout=8)
    response.raise_for_status(); return response.json()

st.set_page_config(page_title="IncidentMind", layout="wide")
st.title("IncidentMind AI")
st.caption("Evidence-led incident response — recommendations require engineer approval.")
try:
    stats = api("/stats/outcomes")
    st.metric("Recorded outcomes", stats["recorded_outcomes"])
except Exception:
    st.info("Backend unavailable. Start FastAPI to view live incident data.")

incident_id = st.text_input("Incident ID", placeholder="Paste an incident ID")
if incident_id and st.button("Load incident"):
    try:
        item = api(f"/incidents/{incident_id}"); st.session_state["incident"] = item
    except Exception as exc: st.error(f"Could not load incident: {exc}")
item = st.session_state.get("incident")
if item:
    incident = item["incident"]
    st.subheader(f"{incident['service']} · {incident['severity']}")
    st.write(incident["error"])
    if st.button("Analyze with evidence"):
        try: st.session_state["analysis"] = api(f"/incidents/{incident['id']}/analyze", "POST")
        except Exception as exc: st.error(f"Analysis unavailable: {exc}")
analysis = st.session_state.get("analysis")
if analysis:
    st.subheader("Memory evidence")
    evidence = analysis.get("evidence", [])
    if not evidence: st.info("No relevant experience recorded yet.")
    for memory in evidence:
        with st.expander(memory.get("memory_id") or "Retrieved memory"):
            st.write(memory["raw_memory_text"])
    st.subheader("Recommendation")
    st.write(analysis.get("recommended_steps", []))
    if analysis.get("fallback_used"): st.warning("Runbook-only fallback used; no LLM claim is shown.")
    with st.form("feedback"):
        cause = st.text_input("Verified root cause")
        outcome = st.selectbox("Outcome", ["resolved", "failed", "partial"])
        notes = st.text_area("Engineer notes")
        if st.form_submit_button("Store verified feedback") and cause:
            try:
                api(f"/incidents/{incident['id']}/feedback", "POST", {"verified_cause": cause, "steps_taken": [], "outcome": outcome, "notes": notes})
                st.success("Verified feedback stored.")
            except Exception as exc: st.error(f"Feedback unavailable: {exc}")
