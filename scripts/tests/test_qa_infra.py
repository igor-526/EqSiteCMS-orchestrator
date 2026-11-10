"""INF-01 OFFLINE simulations only: no sockets, PG/NATS drivers or real permits."""

import asyncio
import copy
import importlib
import io
import json
import os
import re
import sys
import types
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import AsyncMock, patch
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts/qa"))
from infra import load_context  # noqa: E402 - explicit test-support bootstrap
from infra.contracts import (  # noqa: E402 - explicit test-support bootstrap
    CHANGE,
    REGISTRY,
    GuardError,
    evidence_dir,
    fingerprint,
    load,
    validate,
)
from infra.lifecycle import Nats, Postgres, owned  # noqa: E402 - explicit test-support bootstrap
from infra.run import main, service_environment  # noqa: E402 - explicit test-support bootstrap
from infra.run import tests as run_tests  # noqa: E402 - explicit test-support bootstrap

EVIDENCE = ROOT / ".qa/seo-metrica-task-monitor/T-1-FIX-1/offline"
NEW_CHANGE = "seo-metrica-task-monitor"
TASK_FILE = "tests/integration/test_metrica_task_list_postgres.py"
TASK_NODES = [
    TASK_FILE + "::" + name
    for name in (
        "test_aggregate_identity",
        "test_status_order_pagination",
        "test_consistent_read_snapshot",
        "test_history_survives_cleanup",
    )
]
SENTINEL = "SECRET_SENTINEL_DO_NOT_EXPORT"


def case(kind="pg", change=CHANGE):
    run = uuid4().hex
    prefix = "qa_" + run + "_"
    target = {
        "id": "offline_test_target",
        "host": "test.invalid",
        "port": 5432 if kind == "pg" else 4222,
        "isolation": "dedicated-test-db-role" if kind == "pg" else "dedicated-test-broker",
    }
    if kind == "pg":
        target.update(database="isolated_test", role="acceptance_test")
        resource = {"schema": prefix + "a" * 12}
        raw = f"postgresql://acceptance_test:{SENTINEL}@test.invalid:5432/isolated_test"
    else:
        resource = {"stream": prefix + "a" * 12, "durable": prefix + "b" * 12, "subject": "qa." + run + "." + "a" * 12}
        raw = f"nats://user:{SENTINEL}@test.invalid:4222"
    m = {
        "version": 1,
        "change": change,
        "runId": run,
        "kind": kind,
        "target": target,
        "resource": resource,
        "service": "seo-service",
        "nodeIds": ["selftest"],
        "timeout": 5,
        "cleanupTimeout": 1,
        "cleanup": True,
    }
    if change == NEW_CHANGE:
        m.update(service="ya-metrica-service", nodeIds=TASK_NODES.copy())
    p = {key: copy.deepcopy(m[key]) for key in ("version", "change", "runId", "kind", "target", "resource")}
    # Synthetic permit in memory for guard simulations. Not user authorization.
    p.update(
        consentRef="approval:OFFLINE_SIMULATION",
        actions=["setup", "test", "teardown"],
        expiresAt="2099-01-01T00:00:00Z",
    )
    return m, p, {"QA_INFRA_PG_URL" if kind == "pg" else "QA_INFRA_NATS_URL": raw}


def directory():
    path = EVIDENCE / uuid4().hex
    path.mkdir(parents=True)
    return path


def write_case(path, m, p):
    (path / "manifest.json").write_text(json.dumps(m))
    (path / "permit.json").write_text(json.dumps(p))
    return ["--kind", m["kind"], "--manifest", str(path / "manifest.json"), "--permit", str(path / "permit.json")]


class Guards(unittest.TestCase):
    def test_opaque_target_id_allows_hyphen_without_relaxing_sql_names(self):
        for kind in ("pg", "nats"):
            m, p, env = case(kind)
            m["target"]["id"] = "pipeline-postgres-test" if kind == "pg" else "pipeline-nats-test"
            p["target"] = copy.deepcopy(m["target"])
            self.assertEqual(validate(m, p, kind, environ=env), next(iter(env.values())))
        m, p, env = case("pg")
        m["target"]["role"] = "pipeline-test"
        p["target"] = copy.deepcopy(m["target"])
        with self.assertRaises(GuardError):
            validate(m, p, "pg", environ=env)

    def test_valid_contracts_and_schemas(self):
        for kind in ("pg", "nats"):
            m, p, env = case(kind)
            self.assertEqual(validate(m, p, kind, environ=env), next(iter(env.values())))
        for name in ("manifest", "permit"):
            schema = load(ROOT / f"scripts/qa/infra/{name}.schema.json")
            self.assertFalse(schema["additionalProperties"])
            self.assertEqual(set(schema["required"]), set(schema["properties"]))

    def test_negative_contracts_before_adapter(self):
        for kind, change in (("pg", CHANGE), ("nats", CHANGE), ("pg", NEW_CHANGE)):
            mutations = [
                lambda m, p: p.update(expiresAt="2000-01-01T00:00:00Z"),
                lambda m, p: p.update(expiresAt="2099-01-01"),
                lambda m, p: p.update(consentRef=""),
                lambda m, p: p.update(actions=["setup"]),
                lambda m, p: p.update(runId="a" * 32),
                lambda m, p: p["target"].update(id="wrong_target"),
                lambda m, p: m.update(cleanup=False),
                lambda m, p: m.update(timeout=0),
                lambda m, p: m.update(timeout=True),
                lambda m, p: m.update(cleanupTimeout=31),
                lambda m, p: m.update(nodeIds=[]),
                lambda m, p: m.update(nodeIds=["--collect-only"]),
                lambda m, p: m.update(nodeIds=["tests/integration/test_nats_broker.py"]),
                lambda m, p: m.update(nodeIds=["../test.py::test_bad"]),
                lambda m, p: m.update(nodeIds=["selftest", "selftest"]),
                lambda m, p: m.update(service="backend"),
                lambda m, p: m.update(extra=SENTINEL),
                lambda m, p: m["target"].update(isolation="production"),
            ]
            if kind == "pg":
                mutations += [
                    lambda m, p: m["resource"].update(schema="public"),
                    lambda m, p: m["target"].update(database="app"),
                    lambda m, p: m["target"].update(role="postgres"),
                    lambda m, p: m["resource"].update(schema="qa_x; DROP SCHEMA public"),
                ]
            else:
                mutations += [
                    lambda m, p: m["resource"].update(stream="PARSE_COMMANDS"),
                    lambda m, p: m["resource"].update(durable="*"),
                    lambda m, p: m["resource"].update(subject="commands.parse.>"),
                ]
            for index, mutate in enumerate(mutations):
                with self.subTest(kind=kind, variant=index):
                    m, p, env = case(kind, change)
                    mutate(m, p)
                    factory = unittest.mock.Mock()

                    async def attempt():
                        async with owned(m, p, adapter_factory=factory, directory=directory()):
                            self.fail("unsafe body reached")

                    with patch.dict(os.environ, env, clear=True), self.assertRaises(GuardError):
                        asyncio.run(attempt())
                    factory.assert_not_called()

    def test_resource_names_even_with_matching_scope(self):
        for kind, field, value in (
            ("pg", "schema", "public"),
            ("pg", "schema", "qa_" + "b" * 32 + "_" + "a" * 12),
            ("nats", "stream", "PARSE_COMMANDS"),
            ("nats", "subject", "qa.>"),
        ):
            m, p, env = case(kind)
            m["resource"][field] = value
            p["resource"] = copy.deepcopy(m["resource"])
            with self.assertRaises(GuardError):
                validate(m, p, kind, environ=env)

    def test_url_binding_and_no_environment_fallback(self):
        for kind in ("pg", "nats"):
            m, p, env = case(kind)
            raw = next(iter(env.values()))
            for bad in (
                "",
                raw.replace("test.invalid", "product.invalid"),
                raw + "?options=public",
                raw.replace(SENTINEL + "@", SENTINEL + "@evil."),
            ):
                with self.subTest(kind=kind, variant=bool(bad)):
                    key = next(iter(env))
                    with self.assertRaises(GuardError):
                        validate(m, p, kind, environ={key: bad, "DATABASE_URL": raw, "NATS_SERVERS": raw})

    def test_missing_permit_cli_no_process_no_secret(self):
        m, p, env = case()
        path = directory()
        args = write_case(path, m, p)
        args[-1] = str(path / "missing.json")
        output = io.StringIO()
        with patch.dict(os.environ, env, clear=True), patch("subprocess.Popen") as process, redirect_stdout(output):
            self.assertEqual(main(["run", *args]), 2)
        process.assert_not_called()
        self.assertNotIn(SENTINEL, output.getvalue())

    def test_preflight_is_offline(self):
        m, p, env = case()
        args = write_case(directory(), m, p)
        with (
            patch.dict(os.environ, env, clear=True),
            patch("subprocess.Popen") as process,
            patch("infra.run.service_environment", return_value=(ROOT, Path(sys.executable), {})),
            redirect_stdout(io.StringIO()) as output,
        ):
            self.assertEqual(main(["preflight", *args]), 0)
        process.assert_not_called()
        self.assertIn("offline-preflight-only", output.getvalue())

    def test_child_environment_no_secrets_or_options(self):
        m, _, env = case()
        env.update(DATABASE_URL=SENTINEL, PYTEST_ADDOPTS="--collect-only", PYTHONPATH="unsafe")
        # File existence is mocked: this is not installed-env verification.
        with patch.dict(os.environ, env, clear=True), patch.object(Path, "is_file", return_value=True):
            _, python, child = service_environment(m, "manifest.json", "permit.json")
        self.assertTrue(str(python).endswith("seo-service/.venv/bin/python"))
        self.assertNotIn("DATABASE_URL", child)
        self.assertNotIn("PYTEST_ADDOPTS", child)
        self.assertEqual(child["PYTEST_DISABLE_PLUGIN_AUTOLOAD"], "1")

    def test_missing_locked_environment(self):
        m, _, _ = case()
        with patch.object(Path, "is_file", return_value=False), self.assertRaises(GuardError):
            service_environment(m, "manifest.json", "permit.json")

    def test_documented_bootstrap_example(self):
        readme = (ROOT / "scripts/qa/infra/README.md").read_text()
        example = readme.split("```python\n")[1].split("```")[0]
        with patch.dict(os.environ, {"QA_TEST_SUPPORT_ROOT": str(ROOT / "scripts/qa")}, clear=True):
            namespace = {}
            exec(compile(example, "README-bootstrap", "exec"), namespace)
        self.assertIs(namespace["load_context"], load_context)

    def test_runtime_failure_diagnostic_never_exports_secret(self):
        m, p, env = case()
        path = directory()
        args = write_case(path, m, p)
        driver = types.ModuleType("asyncpg")
        with (
            patch.dict(os.environ, env, clear=True),
            patch.dict(sys.modules, {"asyncpg": driver}),
            patch("infra.run.execute", AsyncMock(side_effect=RuntimeError(SENTINEL))),
            patch("infra.run.evidence_dir", return_value=path / "runtime"),
            redirect_stdout(io.StringIO()) as output,
        ):
            self.assertEqual(main(["run", *args, "--worker"]), 1)
        self.assertNotIn(SENTINEL, output.getvalue())
        summary = path / "runtime" / "summary.json"
        self.assertNotIn(SENTINEL, summary.read_text())
        self.assertEqual(load(summary)["status"], "failed")

    def test_bootstrap_fails_closed(self):
        with patch.dict(os.environ, {}, clear=True), self.assertRaises(GuardError):
            load_context("pg")


class TaskMonitorRegistry(unittest.TestCase):
    def test_exact_registry_and_old_regression(self):
        self.assertEqual(set(REGISTRY), {CHANGE, NEW_CHANGE})
        self.assertEqual(REGISTRY[NEW_CHANGE], {
            ("ya-metrica-service", "pg"): set(TASK_NODES),
        })
        old = {
            ("seo-service", "pg"): {"test_acceptance_boundaries.py"},
            ("seo-service", "nats"): {"test_nats_broker.py"},
            ("ya-metrica-service", "pg"): {"test_cleanup_worker_postgres.py", "test_acceptance_helpers.py"},
            ("ya-metrica-service", "nats"): {"test_nats_broker.py"},
        }
        self.assertEqual(REGISTRY[CHANGE], old)
        for (service, kind), files in old.items():
            for nodes in (["selftest"], *[[f"tests/integration/{file}::test_probe[param_1]"] for file in files]):
                m, p, env = case(kind)
                m.update(service=service, nodeIds=nodes)
                self.assertTrue(validate(m, p, kind, environ=env))
                self.assertEqual(evidence_dir(m), ROOT / ".qa" / CHANGE / "INFRA-1" / m["runId"])

    def test_new_change_accepts_only_exact_four_nodes(self):
        for node in TASK_NODES:
            m, p, env = case(change=NEW_CHANGE)
            m["nodeIds"] = [node]
            self.assertTrue(validate(m, p, "pg", environ=env))
        m, p, env = case(change=NEW_CHANGE)
        self.assertTrue(validate(m, p, "pg", environ=env))
        invalid = [TASK_FILE + "::test_unregistered_probe", TASK_FILE + "::test_probe[param_1]"]
        invalid += [node + suffix for node in TASK_NODES for suffix in ("[unregistered]", "_suffix", "[param_1]")]
        for node in invalid:
            with self.subTest(node=node):
                m, p, env = case(change=NEW_CHANGE)
                # A valid node alongside an invalid one must not mask the refusal.
                m["nodeIds"] = [TASK_NODES[0], node]
                factory = unittest.mock.Mock()

                async def attempt():
                    async with owned(m, p, adapter_factory=factory, directory=directory()):
                        self.fail("unregistered node reached adapter")

                with patch.dict(os.environ, env, clear=True), self.assertRaises(GuardError):
                    asyncio.run(attempt())
                factory.assert_not_called()

    def test_tool_01_preflight_is_offline_and_routes_evidence(self):
        m, p, env = case(change=NEW_CHANGE)
        args = write_case(directory(), m, p)
        with (
            patch.dict(os.environ, env, clear=True),
            patch("subprocess.Popen") as process,
            patch("socket.socket") as socket,
            patch("infra.run.service_environment", return_value=(ROOT, Path(sys.executable), {})),
            redirect_stdout(io.StringIO()) as output,
        ):
            self.assertEqual(main(["preflight", *args]), 0)
        process.assert_not_called()
        socket.assert_not_called()
        self.assertIn("offline-preflight-only", output.getvalue())
        self.assertEqual(evidence_dir(m), ROOT / ".qa" / NEW_CHANGE / "INFRA-1" / m["runId"])

    def test_tool_02_registry_rejects_before_adapter(self):
        mutations = [
            lambda m, p: (m.update(change="arbitrary"), p.update(change="arbitrary")),
            lambda m, p: p.update(change=CHANGE),
            lambda m, p: m.update(service="seo-service"),
            lambda m, p: m.update(service="backend"),
            lambda m, p: m.update(nodeIds=["selftest"]),
            lambda m, p: m.update(nodeIds=["--help"]),
            lambda m, p: m.update(nodeIds=[TASK_FILE]),
            lambda m, p: m.update(nodeIds=[TASK_NODES[0] + " --help"]),
            lambda m, p: m.update(nodeIds=[TASK_FILE + "::test_probe[../../bad]"]),
            lambda m, p: m.update(nodeIds=["../" + TASK_NODES[0]]),
            lambda m, p: m.update(nodeIds=["/" + TASK_NODES[0]]),
            lambda m, p: m.update(nodeIds=[TASK_NODES[0].replace("task_list", "other")]),
            lambda m, p: m.update(nodeIds=["tests/integration/test_cleanup_worker_postgres.py::test_probe"]),
        ]
        for mutate in mutations:
            m, p, env = case(change=NEW_CHANGE)
            mutate(m, p)
            factory = unittest.mock.Mock()

            async def attempt():
                async with owned(m, p, adapter_factory=factory, directory=directory()):
                    self.fail("unsafe body reached")

            with patch.dict(os.environ, env, clear=True), self.assertRaises(GuardError):
                asyncio.run(attempt())
            factory.assert_not_called()
        m, p, env = case("nats", NEW_CHANGE)
        m["nodeIds"] = ["tests/integration/test_nats_broker.py::test_probe"]
        with self.assertRaises(GuardError):
            validate(m, p, "nats", environ=env)

    def test_new_change_missing_required_fields_fail_closed(self):
        original_m, original_p, _ = case(change=NEW_CHANGE)
        for source, fields in (("manifest", original_m), ("permit", original_p)):
            for field in fields:
                with self.subTest(source=source, field=field):
                    m, p, env = case(change=NEW_CHANGE)
                    del (m if source == "manifest" else p)[field]
                    with self.assertRaises(GuardError):
                        validate(m, p, "pg", environ=env)

    def test_new_change_endpoint_binding_and_scope_guards(self):
        m, p, env = case(change=NEW_CHANGE)
        raw = env["QA_INFRA_PG_URL"]
        for bad in ("", raw.replace("test.invalid", "foreign.invalid"), raw + "?options=public",
                    raw.replace("acceptance_test:", "foreign_test:"), raw.replace("/isolated_test", "/other_test")):
            with self.assertRaises(GuardError):
                validate(m, p, "pg", environ={"QA_INFRA_PG_URL": bad, "DATABASE_URL": raw})
        for field, value in (("schema", "public"), ("schema", "qa_" + "b" * 32 + "_" + "a" * 12)):
            m, p, env = case(change=NEW_CHANGE)
            m["resource"][field] = value
            p["resource"] = copy.deepcopy(m["resource"])
            with self.assertRaises(GuardError):
                validate(m, p, "pg", environ=env)

    def test_evidence_rejects_traversal_foreign_root_and_symlink(self):
        for field, values in (("change", ["../foreign", "/foreign", NEW_CHANGE + "/../foreign", "other-change"]),
                              ("runId", ["../foreign", "/foreign", "a" * 32 + "/../foreign"])):
            for value in values:
                m, _, _ = case(change=NEW_CHANGE)
                m[field] = value
                with self.assertRaises(GuardError):
                    evidence_dir(m)
        m, _, _ = case(change=NEW_CHANGE)
        with patch.object(Path, "resolve", return_value=EVIDENCE):
            with self.assertRaises(GuardError):
                evidence_dir(m)

    def test_schemas_match_registry_and_keep_guards(self):
        manifest = load(ROOT / "scripts/qa/infra/manifest.schema.json")
        permit = load(ROOT / "scripts/qa/infra/permit.schema.json")
        m, p, _ = case(change=NEW_CHANGE)
        for schema, data in ((manifest, m), (permit, p)):
            self.assertEqual(schema["properties"]["change"], {"enum": list(REGISTRY)})
            self.assertEqual(set(schema["required"]), set(data))
            self.assertFalse(schema["additionalProperties"])
            self.assertEqual(schema["properties"]["version"], {"const": 1})
            self.assertEqual(schema["properties"]["runId"]["pattern"], "^[0-9a-f]{32}$")
        self.assertEqual(permit["properties"]["actions"], {"const": ["setup", "test", "teardown"]})
        self.assertEqual(permit["properties"]["expiresAt"], {"type": "string", "format": "date-time"})
        self.assertIn("consentRef", permit["required"])
        self.assertEqual(manifest["properties"]["cleanup"], {"const": True})
        self.assertEqual(manifest["properties"]["cleanupTimeout"]["maximum"], 30)
        self.assertEqual(manifest["properties"]["timeout"]["maximum"], 900)
        entries = manifest["oneOf"]
        self.assertEqual(len(entries), sum(len(entries) for entries in REGISTRY.values()))
        for entry in entries:
            props = entry["properties"]
            change, service, kind = (props[k]["const"] for k in ("change", "service", "kind"))
            nodes = props["nodeIds"]
            if change == NEW_CHANGE:
                self.assertEqual(nodes, {"items": {"enum": sorted(TASK_NODES)}})
                self.assertEqual(set(nodes["items"]["enum"]), REGISTRY[change][service, kind])
                for node in (TASK_FILE + "::test_unregistered_probe", TASK_NODES[0] + "[unregistered]",
                             TASK_FILE + "::test_probe[param_1]", TASK_NODES[0] + "_suffix"):
                    self.assertNotIn(node, nodes["items"]["enum"])
                continue
            if change == CHANGE:
                self.assertEqual(nodes["anyOf"][0], {"const": ["selftest"]})
                nodes = nodes["anyOf"][1]
            patterns = [item["pattern"] for item in nodes["items"]["anyOf"]]
            for file in REGISTRY[change][service, kind]:
                self.assertTrue(any(re.fullmatch(pattern, f"tests/integration/{file}::test_probe[param_1]")
                                    for pattern in patterns))
            for node in ("selftest", "--help", "../" + TASK_NODES[0], "tests/integration/test_unknown.py::test_probe"):
                self.assertFalse(any(re.fullmatch(pattern, node) for pattern in patterns))
        self.assertEqual(permit["allOf"], [{
            "if": {"properties": {"change": {"const": NEW_CHANGE}}},
            "then": {"properties": {"kind": {"const": "pg"}}},
        }])


class Lifecycle(unittest.IsolatedAsyncioTestCase):
    async def simulation(self, kind, fail=None, body_fail=False):
        m, p, env = case(kind)
        events = []

        class Fake:
            def __init__(self, *_):
                pass

            async def step(self, name):
                events.append(name)
                if name == fail:
                    raise RuntimeError(SENTINEL)

            async def connect(self):
                await self.step("connect")

            async def create(self):
                await self.step("create")

            async def probe(self):
                await self.step("probe")

            async def delete(self):
                await self.step("delete")

            async def close(self):
                await self.step("close")

        path = directory()
        with patch.dict(os.environ, env, clear=True):
            try:
                async with owned(m, p, adapter_factory=Fake, directory=path):
                    events.append("body")
                    if body_fail:
                        raise RuntimeError(SENTINEL)
            except (RuntimeError, GuardError):
                pass
        text = (path / "resources.json").read_text()
        self.assertNotIn(SENTINEL, text)
        return events, json.loads(text)

    async def test_success_and_finally_both_transports(self):
        for kind in ("pg", "nats"):
            for body_fail in (False, True):
                events, result = await self.simulation(kind, body_fail=body_fail)
                self.assertEqual(events, ["connect", "create", "probe", "body", "delete", "close"])
                self.assertEqual(result["state"], "removed")

    async def test_partial_setup_and_cleanup_failures(self):
        for kind in ("pg", "nats"):
            for phase in ("connect", "create", "probe", "delete", "close"):
                with self.subTest(kind=kind, phase=phase):
                    events, result = await self.simulation(kind, fail=phase)
                    self.assertEqual("delete" in events, phase not in ("connect", "create"))
                    self.assertIn("close", events)
                    if phase == "create":
                        self.assertEqual(result["state"], "residual-uncertain")
                    if phase == "delete":
                        self.assertEqual(result["state"], "residual")

    async def test_expired_during_body_preserves_residual(self):
        m, p, env = case()
        adapter = types.SimpleNamespace(
            **{name: AsyncMock() for name in ("connect", "create", "probe", "delete", "close")}
        )
        path = directory()
        with patch.dict(os.environ, env, clear=True), self.assertRaises(GuardError):
            async with owned(m, p, adapter_factory=lambda *_: adapter, directory=path):
                p["expiresAt"] = "2000-01-01T00:00:00Z"
        adapter.delete.assert_not_called()
        self.assertEqual(load(path / "resources.json")["state"], "residual")

    async def test_bounded_cleanup_timeout(self):
        m, p, env = case()
        m["cleanupTimeout"] = 1
        adapter = types.SimpleNamespace(
            **{name: AsyncMock() for name in ("connect", "create", "probe", "delete", "close")}
        )
        adapter.delete.side_effect = lambda: None

        async def hang():
            await asyncio.sleep(10)

        adapter.delete.side_effect = hang
        with patch.dict(os.environ, env, clear=True), self.assertRaises(GuardError):
            async with owned(m, p, adapter_factory=lambda *_: adapter, directory=directory()):
                pass
        adapter.close.assert_awaited_once()

    async def test_pg_statements_never_public_and_owner_checked(self):
        m, _, env = case()
        adapter = Postgres(m, next(iter(env.values())))
        adapter.connection = types.SimpleNamespace(execute=AsyncMock(), fetchval=AsyncMock(return_value=True))
        await adapter.create()
        await adapter.delete()
        statements = " ".join(str(call) for call in adapter.connection.execute.call_args_list)
        self.assertNotIn("public", statements)
        self.assertIn(m["resource"]["schema"], statements)
        adapter.connection.fetchval.return_value = False
        with self.assertRaises(GuardError):
            await adapter.delete()
        self.assertEqual(adapter.connection.execute.await_count, 2)

    async def test_pg_connect_rejects_privilege_and_product_access(self):
        m, _, env = case()
        for flags, product_access in (({"rolsuper": True}, 0), ({"rolsuper": False}, 1)):
            connection = types.SimpleNamespace(
                fetchrow=AsyncMock(return_value=flags), fetchval=AsyncMock(return_value=product_access)
            )
            driver = types.ModuleType("asyncpg")
            driver.connect = AsyncMock(return_value=connection)
            adapter = Postgres(m, next(iter(env.values())))
            with patch.dict(sys.modules, {"asyncpg": driver}), self.assertRaises(GuardError):
                await adapter.connect()

    async def test_pg_probe_sets_only_exact_schema(self):
        m, _, env = case()
        adapter = Postgres(m, next(iter(env.values())))
        schema = m["resource"]["schema"]
        adapter.connection = types.SimpleNamespace(execute=AsyncMock(), fetchval=AsyncMock(return_value=schema))
        await adapter.probe()
        adapter.connection.execute.assert_awaited_once_with(f'SET search_path TO "{schema}"')
        adapter.connection.fetchval.return_value = schema + ",public"
        with self.assertRaises(GuardError):
            await adapter.probe()

    async def test_reused_run_does_not_connect_or_overwrite(self):
        m, p, env = case()
        path = directory()
        (path / "resources.json").write_text('{"state":"foreign"}')
        factory = unittest.mock.Mock()
        with patch.dict(os.environ, env, clear=True), self.assertRaises(GuardError):
            async with owned(m, p, adapter_factory=factory, directory=path):
                self.fail("reused")
        factory.assert_not_called()
        self.assertEqual(load(path / "resources.json"), {"state": "foreign"})

    async def test_nats_delete_checks_exact_owner(self):
        m, _, env = case("nats")
        adapter = Nats(m, next(iter(env.values())))
        adapter.js = types.SimpleNamespace(stream_info=AsyncMock(), delete_stream=AsyncMock())
        adapter.js.stream_info.return_value = types.SimpleNamespace(
            config=types.SimpleNamespace(description="foreign")
        )
        with self.assertRaises(GuardError):
            await adapter.delete()
        adapter.js.delete_stream.assert_not_called()
        adapter.js.stream_info.return_value.config = types.SimpleNamespace(
            description=fingerprint(m), subjects=[m["resource"]["subject"] + ".>"]
        )
        await adapter.delete()
        adapter.js.delete_stream.assert_awaited_once_with(m["resource"]["stream"])

    async def test_test_process_timeout_is_failure_and_killed(self):
        m, _, _ = case()
        m["timeout"] = 1

        class Process:
            returncode = None

            async def wait(self):
                if self.returncode is None:
                    await asyncio.sleep(10)
                return self.returncode

            def kill(self):
                self.returncode = -9

        process = Process()
        with patch("asyncio.create_subprocess_exec", AsyncMock(return_value=process)), self.assertRaises(TimeoutError):
            await run_tests(m, ROOT, Path(sys.executable), {})
        self.assertEqual(process.returncode, -9)


class Completeness(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Test plugin logic without importing any service environment or driver.
        fake = types.ModuleType("pytest")
        fake.UsageError = RuntimeError
        with patch.dict(sys.modules, {"pytest": fake}):
            cls.gate = importlib.import_module("infra.pytest_gate")

    def test_no_skip_no_zero_no_collection_only(self):
        complete = self.gate.complete
        self.assertFalse(complete([], {}))
        good = {"setup": "passed", "call": "passed", "teardown": "passed"}
        self.assertTrue(complete(["x"], {"x": good}))
        for variant in (
            {},
            {"setup": "passed"},
            {**good, "call": "skipped"},
            {**good, "call": "xfail"},
            {**good, "teardown": "failed"},
        ):
            self.assertFalse(complete(["x"], {"x": variant}))
        self.assertFalse(complete(["x", "y"], {"x": good}))

    def test_legacy_fixture_blocked_before_setup(self):
        m, p, _ = case("nats")
        m["nodeIds"] = [
            "tests/integration/test_nats_broker.py::test_stream_creation_idempotent_setup_and_duplicate_ack"
        ]
        path = directory()
        write_case(path, m, p)
        item = types.SimpleNamespace(nodeid=m["nodeIds"][0], fixturenames=["broker"])
        with patch.dict(os.environ, {"QA_INFRA_MANIFEST": str(path / "manifest.json")}):
            with self.assertRaisesRegex(RuntimeError, "adoption required"):
                self.gate.pytest_collection_modifyitems(None, None, [item])


if __name__ == "__main__":
    unittest.main()
