"""COL-01..03: offline pytest identity regression, never PG/NATS acceptance.

Run: python3 -m unittest discover -s scripts/tests -p test_metrica_collection.py
Only services/ya-metrica-service/.venv/bin/python executes pytest, always with
--collect-only -q, no -m/-k exclusions. Importlib preserves both same-basename
modules (73 unit + 26 integration cases) and four guarded PG node IDs. Baseline
node digests were captured separately under prepend before the configuration
change; combined prepend collection failed with import-file mismatch. Existing
local tests.* imports work unchanged; no package markers or import rewrites are
needed. Missing service dependencies are failures, not skips. Collection never
executes fixtures/tests and does not establish SQL/topology runtime correctness.
"""

import ast
import hashlib
import os
import shlex
import subprocess
import tomllib
import unittest
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SERVICE = ROOT / "services/ya-metrica-service"
TOPOLOGY = {
    "tests/unit/test_maintenance_topology.py": (
        {
            "test_valid_owner_creation_and_existing_durables_are_not_updated": 1,
            "test_every_stream_rejects_incompatible_config_before_consumer_start": 39,
            "test_existing_durable_is_validated_not_silently_updated": 27,
            "test_transient_owner_lookup_retry_and_exhaustion": 4,
            "test_consumer_bad_request_is_permanent_and_returned_config_is_validated": 1,
            "test_topology_error_uses_existing_supervisor_permanent_error_class": 1,
        },
        "1f7b0995187de5b106e617c8e12a7664157594db27c285fc412066275d4cf871",
    ),
    "tests/integration/test_maintenance_topology.py": (
        {
            "test_real_valid_topology_owner_discard_new_and_durable_reuse": 1,
            "test_real_incompatible_stream_fails_without_repair_or_consumer": 21,
            "test_real_incompatible_existing_durable_fails_without_update": 4,
        },
        "4c16b7a071a30e0ec09065875ecc502ec946380ba3a5e8b6ff84c787cff330b9",
    ),
}
PG_NODES = tuple(
    f"tests/integration/test_metrica_task_list_postgres.py::{name}"
    for name in (
        "test_aggregate_identity",
        "test_status_order_pagination",
        "test_consistent_read_snapshot",
        "test_history_survives_cleanup",
    )
)


def collect(*targets):
    """Finite targets only; collection does not run infrastructure fixtures."""
    result = subprocess.run(
        [str(SERVICE / ".venv/bin/python"), "-m", "pytest", "--collect-only", "-q", *targets],
        cwd=SERVICE,
        env={**os.environ, "PYTEST_ADDOPTS": ""},
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=120,
        check=False,
    )
    if result.returncode:
        raise AssertionError(f"collection exit {result.returncode}:\n{result.stdout}")
    return [line for line in result.stdout.splitlines() if line.startswith("tests/") and "::" in line]


def verify_topology(nodes):
    """Fail closed on lost modules, renamed nodes, parameter drift or duplicates."""
    if len(nodes) != 99 or len(set(nodes)) != 99:
        raise AssertionError("expected 99 distinct topology node IDs (73 unit + 26 integration)")
    for path, (functions, digest) in TOPOLOGY.items():
        selected = [node for node in nodes if node.startswith(path + "::")]
        actual = Counter(node.split("::", 1)[1].split("[", 1)[0] for node in selected)
        if actual != functions:
            raise AssertionError(f"function/parameter inventory changed: {path}: {actual}")
        if hashlib.sha256("\n".join(sorted(selected)).encode()).hexdigest() != digest:
            raise AssertionError(f"node IDs changed: {path}")


class MetricaCollectionTests(unittest.TestCase):
    def test_col01_both_topology_modules_keep_exact_identity(self):
        for path, (functions, _) in TOPOLOGY.items():
            tree = ast.parse((SERVICE / path).read_text())
            names = [
                node.name
                for node in tree.body
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name.startswith("test_")
            ]
            self.assertCountEqual(names, functions)
        verify_topology(collect(*TOPOLOGY))

    def test_col02_no_exclusions_and_negative_inventory_controls(self):
        config = tomllib.loads((SERVICE / "pyproject.toml").read_text())["tool"]["pytest"]["ini_options"]
        self.assertEqual(shlex.split(config["addopts"]), ["--strict-markers", "--import-mode=importlib"])
        self.assertEqual(config["pythonpath"], ["src"])
        self.assertEqual(config["testpaths"], ["tests"])
        self.assertEqual(config["asyncio_mode"], "auto")
        self.assertEqual(
            config["markers"],
            ["infrastructure: requires local infrastructure, another service, an external provider, or secrets"],
        )
        # Finite synthetic negative inputs: each removed module, renaming with
        # unchanged count, and duplicate nodes must all be rejected by the oracle.
        synthetic = [
            f"{path}::{name}[{index}]"
            for path, (functions, _) in TOPOLOGY.items()
            for name, count in functions.items()
            for index in range(count)
        ]
        for path in TOPOLOGY:
            with self.subTest(missing=path), self.assertRaises(AssertionError):
                verify_topology([node for node in synthetic if not node.startswith(path + "::")])
        for invalid in (
            [node.replace("test_", "renamed_", 1) for node in synthetic],
            [synthetic[0]] * 99,
            synthetic,  # correct counts/functions, wrong parametrized IDs
        ):
            with self.subTest(invalid=invalid[0]), self.assertRaises(AssertionError):
                verify_topology(invalid)

    def test_col03_four_guarded_pg_nodes_collect_without_execution(self):
        self.assertCountEqual(collect(*PG_NODES), PG_NODES)


if __name__ == "__main__":
    unittest.main()
