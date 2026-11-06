"""Synthetic patterns only: these are not service or vendor acceptance."""
import base64
from datetime import date, datetime
import json
from pathlib import Path
import sys
import time

SENTINEL = "WIRE_PRIVACY_SENTINEL_do_not_export"


def response(request, **fields):
    return {"schemaVersion": 1, "scenarioId": request["scenarioId"], "status": "passed", **fields}


def faults(request):
    case = request["case"]
    if case == "timeout":
        time.sleep(5)
    if case == "oversize":
        sys.__stdout__.write(SENTINEL * 100000)
        sys.__stdout__.flush()
    if case == "invalid-output":
        sys.__stdout__.write(SENTINEL)
    if case == "crash":
        sys.__stderr__.write(SENTINEL)
        raise RuntimeError(SENTINEL)
    if case == "missing-dependency":
        __import__("eqcms_intentionally_missing_dependency")
    if case == "privacy":
        print(SENTINEL)
        sys.stderr.write(SENTINEL)


def http_adapter(request):
    faults(request)
    case = request["case"]
    if case not in {"valid", "date-timestamp", "date-invalid", "detail-null", "detail-false", "detail-zero", "import-collision", "privacy", "timeout", "oversize", "invalid-output", "crash", "missing-dependency", "skip", "missing-scenario"}:
        raise ValueError("unknown-case")
    if case == "skip":
        return {"schemaVersion": 1, "scenarioId": request["scenarioId"], "status": "skipped", "wire": {}}
    if case == "missing-scenario":
        return response({**request, "scenarioId": "not-selected"}, wire={})
    if request["phase"] == "producer":
        payload = {"date": "2026-01-02", "detail": "synthetic"}
        if case == "date-timestamp":
            payload["date"] += "T00:00:00Z"
        if case == "date-invalid":
            payload["date"] = "2026-02-30"
        if case.startswith("detail-"):
            payload["detail"] = {"detail-null": None, "detail-false": False, "detail-zero": 0}[case]
        if case == "import-collision":
            sys.path.insert(0, str(Path(__file__).parent / "producer"))
            import core
            payload["origin"] = core.ORIGIN
        return response(request, wire={"protocol": "http", "body": json.dumps(payload)})
    payload = json.loads(request["wire"]["body"])
    accepted = True
    try:
        raw = payload["date"]
        accepted = type(raw) is str and date.fromisoformat(raw).isoformat() == raw
    except (ValueError, TypeError):
        accepted = False
    # Reusable fallback pattern: false/0/null are not error-message text.
    detail = payload.get("detail")
    detail = detail if isinstance(detail, str) and detail else "unavailable"
    if case.startswith("detail-"):
        accepted = accepted and detail == "unavailable"
    if case == "import-collision":
        sys.path.insert(0, str(Path(__file__).parent / "consumer"))
        import core
        accepted = accepted and core.ORIGIN == "consumer" and payload["origin"] == "producer"
    return response(request, observed={"accepted": accepted, "storageEffects": 0, "disposition": "accepted" if accepted else "rejected"})


def nats_adapter(request):
    faults(request)
    case = request["case"]
    if case not in {"valid", "missing-header", "wrong-header", "identity-mismatch", "timestamp-invalid", "timestamp-naive", "privacy", "timeout", "oversize", "invalid-output", "crash", "missing-dependency"}:
        raise ValueError("unknown-case")
    if request["phase"] == "producer":
        payload = {"identity": "job:1", "timestamp": "2026-01-02T00:00:00+00:00"}
        headers = {"Nats-Msg-Id": "job:1"}
        if case == "missing-header":
            headers = {}
        if case == "wrong-header":
            headers = {"nats-msg-id": "job:1"}
        if case == "identity-mismatch":
            headers["Nats-Msg-Id"] = "job:2"
        if case == "timestamp-invalid":
            payload["timestamp"] = "yesterday"
        if case == "timestamp-naive":
            payload["timestamp"] = "2026-01-02T00:00:00"
        return response(request, wire={"protocol": "nats", "dataBase64": base64.b64encode(json.dumps(payload).encode()).decode(), "headers": headers})
    wire = request["wire"]
    payload = json.loads(base64.b64decode(wire["dataBase64"], validate=True))
    accepted = wire["headers"].get("Nats-Msg-Id") == payload["identity"] == "job:1"
    try:
        accepted = accepted and datetime.fromisoformat(payload["timestamp"]).utcoffset() is not None
    except ValueError:
        accepted = False
    return response(request, observed={"accepted": accepted, "storageEffects": 1 if accepted else 0, "disposition": "ack" if accepted else "term"})
