"""Generate explicitly synthetic data for online-GPU classifier training."""
import argparse
import json
import random
from pathlib import Path

LABELS = {
    "Database": ["connection pool exhausted", "SQL deadlock", "database query timeout"],
    "API": ["upstream API timeout", "HTTP 503 from dependency", "gateway timeout"],
    "Overload": ["CPU overload", "out of memory", "request queue saturation"],
    "Network": ["DNS lookup failed", "socket connection refused", "network packet loss"],
    "Deployment": ["deployment rollback", "migration failed", "release configuration error"],
    "Performance": ["high latency", "slow request path", "cache miss spike"],
}

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rows", type=int, default=100_000)
    parser.add_argument("--output", default="data/synthetic_incidents_100k.jsonl")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args(); random.seed(args.seed)
    output = Path(args.output); output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as handle:
        for index in range(args.rows):
            label = random.choice(list(LABELS)); error = random.choice(LABELS[label])
            record = {"text": f"service=svc-{index % 20}; error={error}; request_id={index}; ip=10.0.{index % 250}.1", "label": label, "synthetic": True}
            handle.write(json.dumps(record) + "\n")
if __name__ == "__main__": main()
