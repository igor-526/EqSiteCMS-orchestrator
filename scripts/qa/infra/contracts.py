"""Fail-closed, dependency-free v1 contracts. Never provision or issue permits."""

import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

CHANGE = "harden-agent-verification-pipeline"
ROOT = Path(__file__).resolve().parents[3]


class GuardError(Exception):
    """Only constant safe diagnostics may cross the CLI boundary."""


def require(ok, code):
    if not ok:
        raise GuardError(code)


def load(path):
    try:
        data = json.loads(Path(path).read_text())
        require(isinstance(data, dict), "invalid-json-object")
        return data
    except (OSError, ValueError, TypeError):
        raise GuardError("missing-or-invalid-json") from None


def keys(data, expected):
    require(isinstance(data, dict) and set(data) == set(expected.split()), "invalid-fields")


def identifier(value):
    return isinstance(value, str) and re.fullmatch(r"[a-z][a-z0-9_]{2,62}", value)


def validate(manifest, permit, kind, *, now=None, environ=None):
    """Offline validation only; returns credential value in memory, never in reports."""
    m, p = manifest, permit
    keys(m, "version change runId kind target resource service nodeIds timeout cleanupTimeout cleanup")
    keys(p, "version consentRef change runId kind target resource actions expiresAt")
    require(
        type(m["version"]) is int and type(p["version"]) is int and m["version"] == p["version"] == 1,
        "invalid-version",
    )
    require(m["change"] == p["change"] == CHANGE, "wrong-change")
    require(m["kind"] == p["kind"] == kind and kind in ("pg", "nats"), "wrong-kind")
    require(isinstance(m["runId"], str) and re.fullmatch(r"[0-9a-f]{32}", m["runId"]), "invalid-run-id")
    require(p["runId"] == m["runId"], "wrong-run")
    require(
        isinstance(p["consentRef"], str) and re.fullmatch(r"approval:[A-Za-z0-9_-]{8,100}", p["consentRef"]),
        "missing-explicit-consent-reference",
    )
    require(p["target"] == m["target"] and p["resource"] == m["resource"], "wrong-scope")
    require(p["actions"] == ["setup", "test", "teardown"] and m["cleanup"] is True, "cleanup-not-authorized")
    try:
        expires = datetime.fromisoformat(p["expiresAt"].replace("Z", "+00:00"))
        require(expires.tzinfo is not None and expires > (now or datetime.now(timezone.utc)), "expired-permit")
    except (ValueError, TypeError, AttributeError):
        raise GuardError("invalid-expiry") from None
    for field, maximum in (("timeout", 900), ("cleanupTimeout", 30)):
        require(type(m[field]) is int and 1 <= m[field] <= maximum, "invalid-time-budget")
    t, r = m["target"], m["resource"]
    common = "id host port isolation"
    keys(t, common + (" database role" if kind == "pg" else ""))
    require(isinstance(t["id"], str) and re.fullmatch(r"[a-z][a-z0-9_-]{2,62}", t["id"]), "unsafe-target-id")
    require(isinstance(t["host"], str) and re.fullmatch(r"[a-zA-Z0-9.-]+", t["host"]), "unsafe-host")
    require(type(t["port"]) is int and 1 <= t["port"] <= 65535, "invalid-port")
    prefix = "qa_" + m["runId"] + "_"
    keys(r, "schema" if kind == "pg" else "stream durable subject")
    if kind == "pg":
        require(t["isolation"] == "dedicated-test-db-role", "unconfirmed-isolation")
        require(identifier(t["database"]) and t["database"].endswith("_test"), "unsafe-database")
        require(identifier(t["role"]) and t["role"].endswith("_test") and t["role"] != "postgres_test", "unsafe-role")
        require(isinstance(r["schema"], str) and re.fullmatch(prefix + r"[0-9a-f]{12}", r["schema"]), "unsafe-schema")
    else:
        require(t["isolation"] == "dedicated-test-broker", "unconfirmed-isolation")
        for field in ("stream", "durable"):
            require(
                isinstance(r[field], str) and re.fullmatch(prefix + r"[0-9a-f]{12}", r[field]), "unsafe-nats-resource"
            )
        require(r["subject"] == "qa." + m["runId"] + "." + r["stream"][-12:], "unsafe-subject")
    require(m["service"] in ("seo-service", "ya-metrica-service"), "service-not-allowlisted")
    require(isinstance(m["nodeIds"], list) and m["nodeIds"] and len(m["nodeIds"]) <= 40, "empty-selection")
    require(all(isinstance(n, str) for n in m["nodeIds"]), "invalid-selection")
    require(len(set(m["nodeIds"])) == len(m["nodeIds"]), "duplicate-selection")
    from_registry(m)
    env = os.environ if environ is None else environ
    raw = env.get("QA_INFRA_PG_URL" if kind == "pg" else "QA_INFRA_NATS_URL", "")
    try:
        url = urlsplit(raw)
        require(url.scheme == ("postgresql" if kind == "pg" else "nats"), "missing-or-invalid-target-url")
        require(
            url.hostname == t["host"] and url.port == t["port"] and not url.query and not url.fragment,
            "endpoint-mismatch",
        )
        if kind == "pg":
            require(url.path == "/" + t["database"] and url.username == t["role"], "database-role-mismatch")
        else:
            require(url.path in ("", "/"), "endpoint-mismatch")
    except ValueError:
        raise GuardError("invalid-target-url") from None
    return raw


# Fixed test paths; no arbitrary argv, file paths, selectors or pytest options.
FILES = {
    ("seo-service", "pg"): {"test_acceptance_boundaries.py"},
    ("seo-service", "nats"): {"test_nats_broker.py"},
    ("ya-metrica-service", "pg"): {"test_cleanup_worker_postgres.py", "test_acceptance_helpers.py"},
    ("ya-metrica-service", "nats"): {"test_nats_broker.py"},
}


def from_registry(m):
    if m["nodeIds"] == ["selftest"]:
        return
    for node in m["nodeIds"]:
        match = re.fullmatch(r"tests/integration/(test_[a-z_]+\.py)::(test_[a-z0-9_]+)(\[[a-zA-Z0-9_-]+\])?", node)
        require(match and match[1] in FILES[(m["service"], m["kind"])], "node-not-allowlisted")


def fingerprint(m):
    return hashlib.sha256(json.dumps(m, sort_keys=True).encode()).hexdigest()


def evidence_dir(m):
    return ROOT / ".qa" / CHANGE / "INFRA-1" / m["runId"]
