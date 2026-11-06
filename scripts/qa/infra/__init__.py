"""Explicit shared test-support; not a product runtime dependency."""

import os

from .contracts import GuardError as GuardError
from .contracts import load, require, validate


def load_context(kind):
    """Fixture API: validate before connecting; consume runner-owned exact resources.

    Fixtures must NOT create another schema/stream or perform root teardown.
    Returned mapping includes credentials only in memory. Never log it.
    """
    m = load(os.environ.get("QA_INFRA_MANIFEST", ""))
    p = load(os.environ.get("QA_INFRA_PERMIT", ""))
    raw = validate(m, p, kind)
    require(os.environ.get("QA_INFRA_ACTIVE") == m["runId"], "not-runner-owned")
    from .contracts import evidence_dir, fingerprint

    journal = load(evidence_dir(m) / "resources.json")
    require(
        journal.get("fingerprint") == fingerprint(m)
        and journal.get("state") == "owned"
        and journal.get("confirmed") is True,
        "resource-not-confirmed-owned",
    )
    result = {"manifest": m, "url": raw, "resource": m["resource"]}
    if kind == "pg":
        result["connect_args"] = {"server_settings": {"search_path": m["resource"]["schema"]}}
        result["version_table_schema"] = m["resource"]["schema"]
    return result
