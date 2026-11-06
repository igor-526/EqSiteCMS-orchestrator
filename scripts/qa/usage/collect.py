#!/usr/bin/env python3
"""Collect explicit offline JSONL/ZIP usage and ledger into safe JSON + Markdown."""
import argparse
import json
import sys
from pathlib import Path

from common import Invalid
from ledger import load
from metrics import process
from usage import collect_usage


def collect(inputs, ledgers):
    rows = load(ledgers)
    roles = {}
    for row in rows:
        session, role = row["sessionId"], row["role"]
        if session is not None and role != "unknown":
            if session in roles and roles[session] != role:
                raise Invalid("conflicting ledger session role")
            roles[session] = role
    return {"schemaVersion": 1, "usage": collect_usage(inputs, roles), "process": process(rows),
            "cost": "not-calculated", "quota": "not-calculated",
            "notes": ["total includes repeated cache reads; cache is not unique tokens or quota",
                      "no savings percentage: comparable multi-change sample not supplied",
                      "only explicit sources observed; missing data remains unknown"]}


def markdown(summary):
    # JSON inside fenced Markdown intentionally retains all denominators/completeness, not just a flattering ratio.
    return "# Offline pipeline measurement\n\nSynthetic/offline observations; no cost/quota conversion.\n\n```json\n" + json.dumps(summary, indent=2, sort_keys=True) + "\n```\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", action="append", required=True, help="explicit JSONL or ZIP; repeatable")
    parser.add_argument("--ledger", action="append", required=True, help="explicit JSONL ledger; repeatable")
    parser.add_argument("--output", required=True, help="JSON output; paired .md output beside it")
    args = parser.parse_args()
    try:
        output = Path(args.output)
        if output.suffix != ".json":
            raise Invalid("output must have json suffix")
        protected = {Path(p).resolve() for p in args.input + args.ledger}
        if output.resolve() in protected or output.with_suffix(".md").resolve() in protected:
            raise Invalid("output aliases an input")
        summary = collect(args.input, args.ledger)
        output.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        output.with_suffix(".md").write_text(markdown(summary), encoding="utf-8")
        print('{"status":"collected"}')
        return 0
    except (Invalid, OSError, RecursionError):
        print("collection rejected: invalid schema, identity, archive or limit", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
