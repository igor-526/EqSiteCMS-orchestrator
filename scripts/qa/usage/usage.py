"""Terminal message usage only; no vendor text is retained."""
from common import Invalid, opaque, records, sources

ROLES = ("Router", "Planner", "Backend", "Frontend", "Site Consumer", "Quality Gate", "unknown")
FIELDS = {
    "total": ("totalTokens", "total_tokens"),
    "input": ("inputTokens", "input_tokens"),
    "output": ("outputTokens", "output_tokens"),
    "cacheRead": ("cacheReadTokens", "cache_read_tokens"),
    "cacheWrite": ("cacheWriteTokens", "cache_write_tokens"),
}


def counters(usage):
    if usage and not any(key in usage for aliases in FIELDS.values() for key in aliases):
        raise Invalid("unsupported usage counters")
    result = {}
    for field, aliases in FIELDS.items():
        values = [usage[key] for key in aliases if key in usage]
        if len(values) > 1 and values[0] != values[1]:
            raise Invalid("conflicting usage aliases")
        value = values[0] if values else None
        if value is not None and (type(value) is not int or not 0 <= value <= 10**15):
            raise Invalid("invalid usage counter")
        result[field] = value
    return result


def aggregate(messages):
    return {
        field: {
            "value": sum(m[field] for m in messages if m[field] is not None) if any(m[field] is not None for m in messages) else None,
            "known": sum(m[field] is not None for m in messages),
            "unknown": sum(m[field] is None for m in messages),
            "complete": bool(messages) and all(m[field] is not None for m in messages),
        }
        for field in FIELDS
    }


def collect_usage(paths, session_roles=None):
    session_roles = session_roles or {}
    seen, messages, initial = {}, [], {}
    ignored = legacy = source_count = record_count = unknown_session = 0
    for file_id, stream in sources(paths):
        source_count += 1
        for line, event in records(stream):
            record_count += 1
            if record_count > 100000:
                raise Invalid("usage record limit exceeded")
            if event.get("type") != "assistant/message":
                if event.get("type") not in ("assistant/chunk", "assistant/message/chunk", "tool/call", "tool/result",
                                              "step/start", "step/end", "end", "session/start", "session/end",
                                              "session/meta", "user/message"):
                    raise Invalid("unsupported event schema")
                ignored += 1
                continue
            data = event.get("data")
            if not isinstance(data, dict):
                raise Invalid("unsupported terminal message schema")
            # Only complete message records. Explicit chunks/incomplete records are ignored.
            if data.get("terminal") is False or data.get("status") in ("streaming", "in-progress"):
                ignored += 1
                continue
            usage = data.get("usage")
            if usage is None:
                usage = {}
            if not isinstance(usage, dict):
                raise Invalid("unsupported usage schema")
            counts = counters(usage)
            session = event.get("sessionId", data.get("sessionId"))
            message = event.get("messageId", data.get("messageId"))
            event_id = event.get("eventId")
            for value in (session, message, event_id):
                if value is not None and (not isinstance(value, str) or not value or len(value) > 256):
                    raise Invalid("invalid usage identity")
            role = event.get("role", data.get("role", "unknown"))
            if role not in ROLES:
                role = "unknown"
            ledger_role = session_roles.get(session, "unknown")
            if role != "unknown" and ledger_role != "unknown" and role != ledger_role:
                raise Invalid("conflicting session role")
            if role == "unknown":
                role = ledger_role
            # Register both aliases so re-exporting with only one alias still deduplicates.
            keys = [(opaque(session), kind, opaque(value)) for kind, value in
                    (("message", message), ("event", event_id)) if session and value]
            if not keys:
                keys = [(file_id, "line", line)]
                legacy += 1
            signature = (role, counts)
            matches = [seen[key] for key in keys if key in seen]
            if matches:
                if any(previous[1] != signature for previous in matches) or len({previous[0] for previous in matches}) != 1:
                    raise Invalid("conflicting terminal message identity")
                for key in keys:
                    seen[key] = matches[0]
                continue
            for key in keys:
                seen[key] = (len(messages), signature)
            messages.append((role, counts))
            if not session:
                unknown_session += 1
            if session:
                key = opaque(session)
                if key not in initial:
                    initial[key] = (role, counts)
    return {
        "sources": source_count, "messages": len(messages), "ignoredRecords": ignored,
        "legacyRecords": legacy,
        "gaps": ["legacy-cross-export-dedup-unavailable"] if legacy else [],
        "byRole": {role: aggregate([m for r, m in messages if r == role])
                   for role in ROLES if any(r == role for r, _ in messages)},
        "initialContext": {
            "definition": "first observed terminal request input per session; not cumulative usage or universal bootstrap",
            "sessions": len(initial),
            "input": aggregate([m for _, m in initial.values()])["input"],
            "order": "explicit input order; earlier missing requests unknown",
            "unknownSessionMessages": unknown_session,
        },
    }
