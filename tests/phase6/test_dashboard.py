from streamlit.testing.v1 import AppTest
from pathlib import Path

def test_dashboard_empty_state() -> None:
    app = AppTest.from_file(Path(__file__).parents[2] / "frontend" / "dashboard.py", default_timeout=12)
    app.run(timeout=12)
    assert not app.exception
    assert any("IncidentMind" in heading.value for heading in app.title)
