"""Seed rich demo data into IncidentMind SQLite database."""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.database import Base, FeedbackRecord, IncidentRecord, SessionLocal, engine
from hindsight_memory.models import Incident

DEMO_DATA = [
    {
        "id": "inc-db-101",
        "service": "payments-api",
        "error": "QueuePool limit of size 20 overflow 10 reached, connection timed out",
        "category": "Database",
        "severity": "high",
        "symptoms": ["connection timeout", "500 Internal Server Error", "pool exhaustion"],
        "logs_excerpt": "sqlalchemy.exc.TimeoutError: QueuePool limit 20 reached in checkout.py:142\n  File 'payments/checkout.py', line 142, in process_charge\n  with engine.connect() as conn:",
        "suspected_cause": "Unclosed database connections during high checkout volume",
        "verified_cause": "Checkout batch queries held database connections open without timeout in exception blocks",
        "resolution_steps": ["Ensured connection release in finally block", "Increased pool capacity to 35 with pool_recycle=1800", "Added pool saturation alert threshold at 80%"],
        "outcome": "resolved",
        "notes": "Verified in staging under 250 rps load test. Zero dropped connections.",
        "tags": ["database", "sqlalchemy", "pool-exhaustion", "payments"],
    },
    {
        "id": "inc-db-102",
        "service": "billing-worker",
        "error": "OperationalError: server closed the connection unexpectedly",
        "category": "Database",
        "severity": "high",
        "symptoms": ["aborted transactions", "connection termination", "worker restart"],
        "logs_excerpt": "psycopg2.OperationalError: server closed the connection unexpectedly\n  PostgreSQL FATAL: remaining connection slots are reserved for non-replication superuser connections",
        "suspected_cause": "PostgreSQL max_connections reached during end-of-month invoice run",
        "verified_cause": "PostgreSQL max_connections reached during monthly invoice generation",
        "resolution_steps": ["Staggered cron schedule across billing partitions", "Enabled PgBouncer transaction-level connection pooling"],
        "outcome": "resolved",
        "notes": "PgBouncer cut active connection count from 180 to 24.",
        "tags": ["database", "postgres", "billing", "pgbouncer"],
    },
    {
        "id": "inc-db-103",
        "service": "auth-service",
        "error": "Deadlock detected: Process 412 waiting for ShareLock on transaction",
        "category": "Database",
        "severity": "medium",
        "symptoms": ["deadlock", "login failure rate spike", "slow queries"],
        "logs_excerpt": "ERROR: deadlock detected\nDETAIL: Process 412 waits for ShareLock on transaction 8891; blocked by process 419.",
        "suspected_cause": "Concurrent session refresh updates on user_tokens table",
        "verified_cause": "Concurrent session refresh updates acquiring locks in opposing order",
        "resolution_steps": ["Normalized row lock ordering by user_id", "Added SELECT FOR UPDATE with NOWAIT and exponential retry"],
        "outcome": "partial",
        "notes": "Deadlocks decreased by 94%, rare collision still observed under extreme token bursts.",
        "tags": ["database", "auth", "deadlock"],
    },
    {
        "id": "inc-ov-201",
        "service": "checkout-gateway",
        "error": "CPU saturation above 92% across all workers, request queue backlog",
        "category": "Server Overload",
        "severity": "critical",
        "symptoms": ["high CPU", "thread starvation", "elevated latency"],
        "logs_excerpt": "WARN worker_pool: cpu_usage=94.2% queue_depth=412 active_threads=64\nERROR timeout: request dropped after 15000ms in queue",
        "suspected_cause": "Uncached promo code validation loop on flash sale traffic",
        "verified_cause": "Uncached promo code validation loop computing regex checks on every cart update",
        "resolution_steps": ["Added Redis cache for active promo rules with 60s TTL", "Scaled replica deployment from 4 to 8 pods", "Added CPU HPA at 70% threshold"],
        "outcome": "resolved",
        "notes": "CPU normalized to 38% after cache deployment.",
        "tags": ["overload", "cpu", "redis", "checkout"],
    },
    {
        "id": "inc-ov-202",
        "service": "inventory-service",
        "error": "OutOfMemoryError: Container killed by Linux OOM killer",
        "category": "Server Overload",
        "severity": "critical",
        "symptoms": ["OOMKilled", "crash loop", "503 service unavailable"],
        "logs_excerpt": "kernel: Out of memory: Kill process 12 (java) score 982 or sacrifice child\nk8s: Container inventory-api failed liveness probe, restarting",
        "suspected_cause": "JVM heap limit set too close to container cgroup memory limit",
        "verified_cause": "JVM MaxRAMPercentage not tuned for cgroups v2, heap expanded into native memory",
        "resolution_steps": ["Increased container limit to 4GB", "Set -XX:MaxRAMPercentage=75.0", "Configured heap dump on OOM to persistent volume"],
        "outcome": "resolved",
        "notes": "Container has remained stable over 14 days without restarts.",
        "tags": ["overload", "oom", "jvm", "k8s"],
    },
    {
        "id": "inc-ov-203",
        "service": "reporting-service",
        "error": "Worker thread pool exhausted, queue length exceeded 5000",
        "category": "Server Overload",
        "severity": "medium",
        "symptoms": ["thread pool saturation", "export timeouts"],
        "logs_excerpt": "ThreadPoolExecutor: task rejected from java.util.concurrent.ThreadPoolExecutor@3a1",
        "suspected_cause": "Heavy analytical export queries running on primary OLTP replica",
        "verified_cause": "Heavy export queries executed on primary replica instead of read replica",
        "resolution_steps": ["Redirected reporting queries to read replica", "Enforced max date range limit of 30 days per export"],
        "outcome": "partial",
        "notes": "Exports over 100k rows still take >45s. Needs async background worker queue.",
        "tags": ["overload", "reporting", "replica"],
    },
    {
        "id": "inc-api-301",
        "service": "order-router",
        "error": "502 Bad Gateway: Upstream shipping partner API timed out after 30000ms",
        "category": "API",
        "severity": "high",
        "symptoms": ["upstream 502", "shipping label creation failure", "retry storm"],
        "logs_excerpt": "httpx.ConnectTimeout: HTTPSConnectionPool(host='api.shipping-partner.com'): Read timed out. (read timeout=30)",
        "suspected_cause": "External partner API latency degradation without circuit breaker",
        "verified_cause": "External partner API outage caused thread holding and retry storm",
        "resolution_steps": ["Integrated PyBreaker circuit breaker with 5s timeout", "Implemented fallback queue for offline label generation", "Added partner health dashboard"],
        "outcome": "resolved",
        "notes": "Failed orders now queue automatically and recover when partner comes back online.",
        "tags": ["api", "circuit-breaker", "upstream", "orders"],
    },
    {
        "id": "inc-api-302",
        "service": "notification-service",
        "error": "429 Too Many Requests: Rate limit exceeded for SendGrid webhook",
        "category": "API",
        "severity": "medium",
        "symptoms": ["rate limit 429", "delayed order confirmations"],
        "logs_excerpt": "SendGridClient: 429 Too Many Requests - X-RateLimit-Reset: 1711201940",
        "suspected_cause": "Burst email dispatch without token bucket throttle",
        "verified_cause": "Batch order confirmation dispatch triggered per-second API quota",
        "resolution_steps": ["Added Redis token bucket rate limiter (80 requests/sec)", "Grouped notifications into digest batches where applicable"],
        "outcome": "resolved",
        "notes": "Zero rate limit drops since rate limiter rollout.",
        "tags": ["api", "rate-limit", "email", "notifications"],
    },
    {
        "id": "inc-api-303",
        "service": "webhooks-relay",
        "error": "Connection reset by peer during TLS handshake on webhook delivery",
        "category": "API",
        "severity": "low",
        "symptoms": ["SSL handshake failure", "undelivered webhooks"],
        "logs_excerpt": "ssl.SSLError: [SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: certificate has expired",
        "suspected_cause": "Expired intermediate root certificate on target endpoint",
        "verified_cause": "Expired intermediate root certificate on third-party webhook receiver",
        "resolution_steps": ["Notified customer engineering team", "Temporarily paused webhook relay for afflicted endpoint"],
        "outcome": "failed",
        "notes": "Customer did not update their certificate for 72 hours. Disabled endpoint after SLA grace period.",
        "tags": ["api", "tls", "webhooks"],
    },
    {
        "id": "inc-perf-401",
        "service": "product-catalog",
        "error": "P99 latency degraded from 45ms to 1820ms under 400 rps",
        "category": "Performance",
        "severity": "high",
        "symptoms": ["latency degradation", "P99 spike", "slow query logs"],
        "logs_excerpt": "Slow query detected: SELECT * FROM products WHERE category_id = 42 ORDER BY created_at DESC (1740ms)",
        "suspected_cause": "Missing composite index on category_id and created_at",
        "verified_cause": "Sequential scan on 2.4M product rows due to missing composite index",
        "resolution_steps": ["Added composite btree index: (category_id, created_at DESC)", "Updated ORM query to select only required projection columns"],
        "outcome": "resolved",
        "notes": "P99 dropped back to 32ms immediately after index creation.",
        "tags": ["performance", "index", "sql", "catalog"],
    },
    {
        "id": "inc-perf-402",
        "service": "search-service",
        "error": "Elasticsearch segment merge thrashing on high write throughput",
        "category": "Performance",
        "severity": "medium",
        "symptoms": ["search latency spike", "disk IOPS saturation"],
        "logs_excerpt": "Elasticsearch [node-1] high disk watermark [90%] exceeded on /data, max write queue reached",
        "suspected_cause": "Elasticsearch index refresh interval too low during catalog sync",
        "verified_cause": "1s index refresh interval caused continuous small segment merges during 50k item batch",
        "resolution_steps": ["Increased refresh interval to 30s during bulk ingestion", "Allocated additional EBS IOPS to search cluster"],
        "outcome": "partial",
        "notes": "Search throughput improved by 70%, but large multi-term facets still consume high memory.",
        "tags": ["performance", "elasticsearch", "search"],
    },
    {
        "id": "inc-perf-403",
        "service": "session-store",
        "error": "Redis connection timeout: MOVED 12182 10.0.1.4:6379",
        "category": "Performance",
        "severity": "high",
        "symptoms": ["session lookup failure", "forced user re-authentication"],
        "logs_excerpt": "redis.exceptions.ConnectionError: Error 110 connecting to 10.0.1.4:6379. Connection timed out.",
        "suspected_cause": "Redis cluster node failover before client topology refreshed",
        "verified_cause": "Redis cluster node failover before client updated its slot map",
        "resolution_steps": ["Enabled dynamic cluster topology refresh every 15s in client config", "Added connection retry with 250ms backoff"],
        "outcome": "resolved",
        "notes": "Tested node termination in staging; client recovers slot mapping within 400ms.",
        "tags": ["performance", "redis", "clustering"],
    },
]

def seed_database():
    Base.metadata.create_all(engine)
    with SessionLocal() as session:
        for item in DEMO_DATA:
            inc = Incident(
                id=item["id"],
                service=item["service"],
                error=item["error"],
                severity=item["severity"],
                symptoms=item["symptoms"],
                logs_excerpt=item["logs_excerpt"],
                suspected_cause=item["suspected_cause"],
                verified_cause=item["verified_cause"],
                resolution_steps=item["resolution_steps"],
                outcome=item["outcome"],
                timestamps=[datetime.now(timezone.utc)],
                tags=item["tags"],
            )
            session.merge(
                IncidentRecord(
                    id=inc.id,
                    service=inc.service,
                    error=inc.error,
                    category=item["category"],
                    severity=inc.severity,
                    payload=inc.model_dump_json(),
                )
            )
            session.merge(
                FeedbackRecord(
                    incident_id=inc.id,
                    verified_cause=item["verified_cause"],
                    steps="\n".join(f"- {s}" for s in item["resolution_steps"]),
                    outcome=item["outcome"],
                    notes=item["notes"],
                    approved="true" if item["outcome"] == "resolved" else "false",
                )
            )
        session.commit()
    print(f"Successfully seeded {len(DEMO_DATA)} realistic demo incidents and feedback records.")

if __name__ == "__main__":
    seed_database()
