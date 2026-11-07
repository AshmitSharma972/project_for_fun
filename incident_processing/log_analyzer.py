import re

def normalize_log(text: str) -> str:
    text = re.sub(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", "<ip>", text)
    text = re.sub(r"\b[0-9a-f]{8,}\b", "<id>", text, flags=re.I)
    text = re.sub(r"\b\d+\b", "<n>", text)
    return re.sub(r"\s+", " ", text).strip().lower()

def analyze_logs(text: str) -> dict[str, object]:
    normalized = normalize_log(text)
    frames = re.findall(r"(?:File .*? line \d+|at [\w.]+\([^)]*\))", text)
    timestamps = re.findall(r"\d{4}-\d{2}-\d{2}[T ][0-9:.+Z-]+", text)
    signature = next((line for line in normalized.split("\n") if "error" in line or "exception" in line), normalized[:300])
    return {"signature": signature, "stack_frames": frames[:5], "timestamps": timestamps, "normalized": normalized}
