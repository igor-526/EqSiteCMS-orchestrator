"""Fail before fixture setup unless integration adopted the shared context contract."""

import json
import os
from pathlib import Path

import pytest

from .contracts import load

_expected = []
_outcomes = {}
_invalid = False


def pytest_collection_modifyitems(session, config, items):
    global _expected, _invalid
    _expected = load(os.environ["QA_INFRA_MANIFEST"])["nodeIds"]
    actual = [item.nodeid for item in items]
    if set(actual) != set(_expected) or len(actual) != len(_expected):
        _invalid = True
        raise pytest.UsageError("infra selection incomplete; specify exact parametrized node IDs")
    if any("qa_infra_context" not in item.fixturenames for item in items):
        _invalid = True
        raise pytest.UsageError("infra fixture adoption required: qa_infra_context dependency")


def pytest_runtest_logreport(report):
    # Count each phase; skip/xfail/teardown failure cannot become passed.
    prior = _outcomes.setdefault(report.nodeid, {})
    prior[report.when] = report.outcome
    if getattr(report, "wasxfail", False):
        prior[report.when] = "xfail"


def complete(expected, outcomes):
    return (
        bool(expected)
        and set(expected) == set(outcomes)
        and all(phases == {"setup": "passed", "call": "passed", "teardown": "passed"} for phases in outcomes.values())
    )


def pytest_sessionfinish(session, exitstatus):
    collecting = os.environ.get("QA_INFRA_COLLECT_ONLY") == "1"
    passed = (
        not _invalid
        and exitstatus == 0
        and (
            bool(_expected) and session.testscollected == len(_expected)
            if collecting
            else complete(_expected, _outcomes)
        )
    )
    if not passed:
        session.exitstatus = 1
    # No raw traceback, captured stdout, URL, test values or node IDs exported.
    Path(os.environ["QA_INFRA_RESULT"]).write_text(
        json.dumps(
            {
                "version": 1,
                "status": "passed" if passed else "failed",
                "scope": "collection-only-not-acceptance" if collecting else "service-acceptance",
                "expected": len(_expected),
                "completed": len(_outcomes),
            }
        )
        + "\n"
    )
