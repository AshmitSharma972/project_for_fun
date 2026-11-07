import os
import pytest

from config.settings import Settings


@pytest.mark.integration
def test_real_hindsight_credentials_are_available() -> None:
    """Service test is intentionally skipped when this environment has no secrets."""
    if not all(os.getenv(name) for name in ("HINDSIGHT_API_KEY", "HINDSIGHT_BASE_URL", "GROQ_API_KEY", "MODEL_NAME")):
        pytest.skip("Hindsight/Groq credentials are not configured")
    Settings()
