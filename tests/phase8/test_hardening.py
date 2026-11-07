from incident_processing.log_analyzer import normalize_log
from hindsight_memory.models import Incident

def test_unicode_and_huge_logs_are_safe() -> None:
    huge = ("Ошибка timeout café 10.0.0.1 id=abcdef123456\n" * 1000)
    normalized = normalize_log(huge)
    assert "<ip>" in normalized and "<id>" in normalized
    assert Incident(id="unicode", service="支付", error="超时", logs_excerpt=huge).service == "支付"
