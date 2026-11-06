#!/usr/bin/env python3
"""Explicit allowlisted ledger append. IDs are operator-supplied non-secret labels."""
import argparse
import fcntl
import json
import re
import sys
from datetime import datetime
from pathlib import Path

from common import Invalid, records
from usage import ROLES

ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,127}$")
STAGES = ["unit", "final-service", "owner-self-check", "fix", "QG", "docs-only"]
STATUSES = ["planned", "passed", "failed", "blocked", "not-applicable", "unchecked"]
REASONS = ["scope", "ownership", "infrastructure", "other", "unknown", "initial", "independent-qg",
           "code-changed", "fixture-changed", "environment-changed", "tool-changed", "options-changed",
           "common-code", "unknown-blast-radius", "broken-gate", "scoped-command-unavailable",
           "exact-reproducer", "impacted-regression", "alias", "missing-evidence", "not-applicable"]
COMMON = {"schemaVersion", "eventId", "changeId", "unitId", "role", "sessionId", "invocationId", "eventType", "timestamp"}
SPECIFIC = {
    "session-start": set(), "resume": set(),
    "handoff": {"status", "partialReason", "parentUnit", "splitFrom", "stage", "qgRound"},
    "finding": {"findingId", "class", "reopened", "exactBefore", "exactAfter", "qgRound"},
    "verification": {"runId", "stage", "scenarioId", "evidenceOwner", "command", "aliases", "revision",
                     "codeFingerprint", "environmentFingerprint", "options", "startedAt", "finishedAt",
                     "status", "evidencePath", "reason", "previousRunId", "commandClass", "service"},
    "wait": {"start", "end", "category"},
}
ENUMS = {"role": list(ROLES), "eventType": list(SPECIFIC), "stage": STAGES,
         "status": STATUSES + ["done", "partial"], "partialReason": ["scope", "ownership", "infrastructure", "other", "unknown"],
         "class": ["product-blocking", "nonblocking", "infrastructure", "unknown"],
         "reason": REASONS, "commandClass": ["targeted", "full-suite", "exact", "static", "alias"],
         "category": ["model", "tool", "user", "external-blocker"]}
TIMES = {"timestamp", "startedAt", "finishedAt", "start", "end"}
LISTS = {"aliases", "options"}
NULLABLE = {"sessionId", "invocationId", "partialReason", "parentUnit", "splitFrom", "exactBefore", "exactAfter",
            "startedAt", "finishedAt", "start", "end", "previousRunId", "revision", "codeFingerprint",
            "environmentFingerprint", "evidencePath", "reason"}


def time_value(value):
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            raise ValueError
        return parsed.timestamp()
    except (ValueError, TypeError, AttributeError, OverflowError):
        raise Invalid("invalid ledger timestamp") from None


def validate(row):
    kind = row.get("eventType")
    if not isinstance(kind, str) or kind not in SPECIFIC or set(row) - (COMMON | SPECIFIC[kind]) or not COMMON <= set(row):
        raise Invalid("unsupported ledger fields or missing identity")
    if type(row["schemaVersion"]) is not int or row["schemaVersion"] != 1:
        raise Invalid("unsupported ledger version")
    for key, value in row.items():
        if key == "schemaVersion":
            continue
        if value is None and key in NULLABLE:
            continue
        if key in ENUMS:
            if value not in ENUMS[key]:
                raise Invalid("invalid ledger enum")
        elif key in TIMES:
            time_value(value)
        elif key == "reopened":
            if type(value) is not bool:
                raise Invalid("invalid reopened flag")
        elif key == "qgRound":
            if type(value) is not int or value < 1:
                raise Invalid("invalid QG round")
        elif key in LISTS:
            if not isinstance(value, list) or len(value) > 32 or any(not isinstance(v, str) or not ID.fullmatch(v) for v in value):
                raise Invalid("invalid ledger labels")
        elif not isinstance(value, str) or not ID.fullmatch(value) or ".." in value or ":" in value:
            raise Invalid("invalid non-secret ledger label")
    if kind == "finding" and not {"findingId", "class", "reopened"} <= set(row):
        raise Invalid("missing finding classification")
    if kind == "handoff":
        if row.get("status") not in ["done", "partial", "passed", "failed", "blocked", "unchecked"]:
            raise Invalid("missing handoff status")
        if row.get("status") == "partial" and "partialReason" not in row:
            raise Invalid("missing partial reason")
    if kind == "wait" and not {"start", "end", "category"} <= set(row):
        raise Invalid("missing measured interval")
    if kind == "verification":
        required = SPECIFIC[kind] - {"service"}
        if not required <= set(row) or row["status"] not in STATUSES:
            raise Invalid("missing verification evidence fields")
        if row["status"] in ["blocked", "unchecked", "not-applicable"] and row["reason"] is None:
            raise Invalid("missing outcome reason")
        if row["previousRunId"] and row["reason"] in [None, "initial"]:
            raise Invalid("repeat requires reason")
        if row["commandClass"] == "full-suite" and not row.get("service"):
            raise Invalid("full suite requires service")
    for start, end in [("start", "end"), ("startedAt", "finishedAt")]:
        if row.get(start) is not None and row.get(end) is not None and time_value(row[end]) < time_value(row[start]):
            raise Invalid("negative measured interval")
    return row


def validate_rows(rows):
    unique, runs = {}, {}
    result = []
    for row in rows:
        validate(row)
        key = row["eventId"]
        if key in unique:
            if unique[key] != row:
                raise Invalid("conflicting ledger identity")
            continue
        if row["eventType"] == "verification":
            run_id = row["runId"]
            if run_id in runs:
                raise Invalid("duplicate verification run identity")
            previous = row["previousRunId"]
            if previous:
                prior = runs.get(previous)
                if prior is None or prior["changeId"] != row["changeId"] or prior["scenarioId"] != row["scenarioId"]:
                    raise Invalid("invalid previous run reference")
                if row["commandClass"] == "full-suite" and prior.get("service") != row.get("service"):
                    raise Invalid("invalid previous suite service")
            runs[run_id] = row
        unique[key] = row
        result.append(row)
    return result


def load(paths):
    rows = []
    for path in paths:
        try:
            with open(path, "rb") as stream:
                rows.extend(row for _, row in records(stream))
        except OSError:
            raise Invalid("cannot read explicit ledger") from None
        if len(rows) > 100000:
            raise Invalid("ledger record limit exceeded")
    return validate_rows(rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["append"])
    parser.add_argument("--ledger", required=True)
    parser.add_argument("--event", required=True, help="explicit JSON file, never raw handoff text")
    args = parser.parse_args()
    try:
        with open(args.event, "rb") as source:
            event = [validate(row) for _, row in records(source)]
        if len(event) != 1:
            raise Invalid("append requires one event")
        # Do not create parent directories or touch runtime state.
        with open(args.ledger, "a+b") as stream:
            fcntl.flock(stream, fcntl.LOCK_EX)
            stream.seek(0)
            existing = [row for _, row in records(stream)]
            merged = validate_rows(existing + event)
            if len(merged) > len(validate_rows(existing)):
                stream.seek(0, 2)
                if stream.tell():
                    stream.seek(-1, 2)
                    if stream.read(1) != b"\n":
                        stream.write(b"\n")
                stream.write((json.dumps(event[0], sort_keys=True) + "\n").encode())
                stream.flush()
        print('{"status":"appended-or-identical"}')
        return 0
    except (Invalid, OSError):
        print("ledger rejected: invalid input, schema, identity or limit", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
