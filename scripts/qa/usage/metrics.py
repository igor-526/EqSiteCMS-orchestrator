"""Process metrics retain denominators and gaps rather than manufacturing outcomes."""
from collections import Counter, defaultdict

from ledger import time_value


def ratio(numerator, denominator, observed, population):
    return {"numerator": numerator, "denominator": denominator,
            "coverage": {"observed": observed, "population": population},
            "value": numerator / denominator if denominator else None}


def intervals(rows):
    grouped = defaultdict(list)
    unknown = Counter()
    for row in rows:
        if row["eventType"] == "wait":
            category, start, end = row["category"], row["start"], row["end"]
        elif row["eventType"] == "verification":
            category, start, end = "tool", row["startedAt"], row["finishedAt"]
        else:
            continue
        if start is None or end is None:
            unknown[category] += 1
        else:
            grouped[category].append((time_value(start), time_value(end)))
    def summary(spans):
        total = sum(end - start for start, end in spans)
        merged = []
        for start, end in sorted(spans):
            if merged and start <= merged[-1][1]:
                merged[-1] = (merged[-1][0], max(end, merged[-1][1]))
            else:
                merged.append((start, end))
        union = sum(end - start for start, end in merged)
        return {"measuredSeconds": total, "unionSeconds": union, "overlapSeconds": total - union, "intervals": len(spans)}
    by_category = {key: dict(summary(grouped[key]), unknownIntervals=unknown[key])
                   for key in ["model", "tool", "user", "external-blocker"]}
    return {"byCategory": by_category,
            "allCategories": summary([span for values in grouped.values() for span in values]),
            "unknownIntervals": sum(unknown.values()),
            "gaps": ["unrecorded intervals unknown; measured spans are not complete wall time"]}


def process(rows):
    changes = {r["changeId"] for r in rows}
    units = {(r["changeId"], r["unitId"]) for r in rows}
    starts = [r for r in rows if r["eventType"] == "session-start"]
    sessions = {(r["changeId"], r["sessionId"]) for r in starts if r["sessionId"] is not None}
    resumes = [r for r in rows if r["eventType"] == "resume"]
    handoffs = [r for r in rows if r["eventType"] == "handoff"]
    partials = [r for r in handoffs if r["status"] == "partial"]
    findings = [r for r in rows if r["eventType"] == "finding"]
    runs = {r["runId"]: r for r in rows if r["eventType"] == "verification"}
    first = defaultdict(list)
    for row in handoffs:
        if row.get("stage") == "QG" and row.get("qgRound") == 1:
            first[row["changeId"]].append(row)
    completed = passed = blocked = unknown = 0
    for change in changes:
        events = first[change]
        if not events:
            unknown += 1
            continue
        statuses = {e["status"] for e in events}
        if statuses & {"blocked", "unchecked"}:
            blocked += 1
        elif len(statuses) != 1 or not statuses <= {"passed", "failed"}:
            unknown += 1
        else:
            classified = [f for f in findings if f["changeId"] == change and f.get("qgRound") == 1]
            # Explicit QG handoff is the census closure. Missing finding classes never imply success.
            if (any(f["class"] == "unknown" for f in classified)
                    or any(f["changeId"] == change and "qgRound" not in f for f in findings)):
                unknown += 1
                continue
            if statuses == {"failed"} and not classified:
                unknown += 1
                continue
            if classified and all(f["class"] == "infrastructure" for f in classified):
                blocked += 1
                continue
            completed += 1
            if not any(f["class"] == "product-blocking" for f in classified):
                passed += 1
    fix_findings = {(f["changeId"], f["findingId"]): f for f in findings if f["class"] == "product-blocking"}
    paired = exact = 0
    for finding in fix_findings.values():
        before, after = runs.get(finding.get("exactBefore")), runs.get(finding.get("exactAfter"))
        if not before or not after:
            continue
        # Exact reproducer identity covers scenario, environment, options and symbolic command.
        same = all(before[k] == after[k] for k in ["changeId", "scenarioId", "environmentFingerprint", "options", "command"])
        if not same or before["changeId"] != finding["changeId"]:
            continue
        if not before["environmentFingerprint"] or before["commandClass"] != "exact" or after["commandClass"] != "exact":
            continue
        if before["status"] not in ["passed", "failed"] or after["status"] not in ["passed", "failed"]:
            continue
        paired += 1
        if before["status"] == "failed" and after["status"] == "passed" and after["previousRunId"] == before["runId"]:
            exact += 1
    suite_records = [r for r in runs.values() if r["commandClass"] == "full-suite"]
    suites = [r for r in suite_records if r["status"] in ["passed", "failed"]]
    suite_ids = {r["runId"] for r in suites}
    groups = Counter((r["service"], r["revision"], r["reason"] or "unknown") for r in suites)
    return {
        "changes": len(changes), "units": len(units), "newSessions": len(sessions),
        "unknownSessionStarts": sum(r["sessionId"] is None for r in starts),
        "resumes": len(resumes),
        "splits": len({(r["changeId"], r["unitId"], r["splitFrom"]) for r in handoffs if r.get("splitFrom")}),
        "partial": {"count": len(partials), "denominator": len(handoffs),
                    "causes": dict(Counter(r.get("partialReason") or "unknown" for r in partials))},
        "firstPass": dict(ratio(passed, completed, completed, len(changes)), blocked=blocked, unknown=unknown),
        "exactFailPass": ratio(exact, paired, paired, len(fix_findings)),
        "reopen": {"count": len({(f["changeId"], f["findingId"]) for f in findings if f["reopened"]}),
                   "denominator": len({(f["changeId"], f["findingId"]) for f in findings})},
        "fullSuites": {"runs": len(suites), "notExecuted": len(suite_records) - len(suites),
                       "repeats": sum(r["previousRunId"] in suite_ids for r in suites),
                       "denominator": len(suites),
                       "groups": [{"service": s, "revision": v, "reason": reason, "count": count}
                                  for (s, v, reason), count in sorted(groups.items(), key=lambda item: str(item[0]))]},
        "time": intervals(rows),
        "coverage": {"ledgerEvents": len(rows), "unitsWithHandoff": len({(r["changeId"], r["unitId"]) for r in handoffs}),
                     "units": len(units), "unobservedChanges": "unknown"},
    }
