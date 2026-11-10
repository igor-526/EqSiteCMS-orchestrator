"""ENV-01..03/SK-01: finite offline simulations, never runtime acceptance.

Synthetic consent references below are in-memory negative/positive test inputs,
not operator authorization. No network, credentials, fixture setup or cleanup.
"""

import ast
import copy
import importlib.util
import io
import json
import re
import unittest
from contextlib import ExitStack, redirect_stdout
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
READINESS = ROOT / "scripts/qa/readiness"
SPEC = importlib.util.spec_from_file_location("qa_readiness_validator", READINESS / "validate.py")
VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)
NOW = datetime(2030, 1, 1, tzinfo=timezone.utc)
SENTINEL = "SECRET_SENTINEL_DO_NOT_EXPORT"


def synthetic():
    """A declaration only; intentionally no supplied runtime targets or permits."""
    schema = json.loads((READINESS / "profile.schema.json").read_text())

    def fill(node):
        if "const" in node:
            return node["const"]
        if "enum" in node:
            return node["enum"][0]
        if node.get("type") == "object":
            return {key: fill(node["properties"][key]) for key in node["required"]}
        if node.get("type") == "array":
            return [fill(node["items"])]
        if node.get("type") == "boolean":
            return False
        if node.get("type") == "integer":
            return node["minimum"]
        if node.get("format") == "date-time":
            return "2099-01-01T00:00:00Z"
        pattern = node.get("pattern", "")
        if pattern.startswith("^approval:"):
            return "approval:OFFLINE_SIMULATION_ONLY"
        if pattern.endswith("_test$"):
            return "simulation_test"
        if pattern == "^[a-f0-9]{32}$":
            return "a" * 32
        if pattern == "^[a-f0-9]{40}$":
            return "b" * 40
        return "simulation_ref"

    profile = fill(schema)
    profile["ownerRef"] = "simulation_owner"
    profile["isolationRef"] = "simulation_isolation"
    targets = profile["targets"]
    for key, target in targets.items():
        target["id"] = "simulation_" + key
        if "endpoint" in target:
            target["endpoint"]["host"] = key.lower() + ".invalid"
            target["projectRef"] = "simulation_project"
            target["networkRef"] = "simulation_network"
        else:
            target["host"] = key.lower() + ".invalid"
    bindings = {"project": "gateway", "network": "gateway", "volume": "backendPg",
                "backendFixtures": "backendPg", "metricaFixtures": "metricaPg", "acceptanceSchema": "acceptancePg"}
    resources = profile["resources"]
    for key, resource in resources.items():
        resource.update(id="simulation_" + key, targetRef=targets[bindings[key]]["id"], ownerRef=profile["ownerRef"])
    resources["acceptanceSchema"]["id"] = "qa_" + profile["runId"] + "_" + "c" * 12
    profile["tenants"] = {"A": "simulation_tenant_A", "B": "simulation_tenant_B"}
    roles = {"seoOnly": ["SEO"], "seoAdmin": ["SEO", "ADMIN"], "nonSeo": ["USER"], "adminOnly": ["ADMIN"]}
    for key, actor in profile["actors"].items():
        actor.update(id="simulation_" + key, roles=roles[key], tenantRef=profile["tenants"]["B" if key == "seoAdmin" else "A"])
    profile["fixtures"].update(ids=["history_A", "history_B"], ownerRef=profile["ownerRef"],
                               order=["history_A", "history_B"], pages=[["history_A"], ["history_B"]])
    all_targets = [t["id"] for t in targets.values()]
    scope = {
        "environment": (all_targets, [resources[k]["id"] for k in ("project", "network", "volume", "backendFixtures", "metricaFixtures")], ["review-existing"]),
        "actors": ([targets[k]["id"] for k in ("gateway", "backendPg", "metricaPg")], [resources[k]["id"] for k in ("backendFixtures", "metricaFixtures")], ["fixture-setup"]),
        "pg": ([targets["acceptancePg"]["id"]], [resources["acceptanceSchema"]["id"]], ["setup", "test", "teardown"]),
        "read": ([targets[k]["id"] for k in ("gateway", "peer")], [resources[k]["id"] for k in ("backendFixtures", "metricaFixtures")], ["GET"]),
        "cleanup": (all_targets, [r["id"] for r in resources.values()], ["cleanup"]),
    }
    for group, (target_refs, resource_refs, actions) in scope.items():
        profile["permissions"][group].update(targetRefs=target_refs, resourceRefs=resource_refs, actions=actions,
                                              ownerRef=profile["ownerRef"], isolationRef=profile["isolationRef"])
    profile["smoke"].update(diskPresent=True, runtimeLoadVerified=False)
    return profile


def optional_post(profile):
    profile["post"] = dict(bindingRef=profile["fixtures"]["bindingRef"], queueRef="simulation_queue",
                           workerRef="simulation_worker", deliveryRef="simulation_delivery",
                           noVendorEgress=True, isolationRef=profile["isolationRef"])
    permit = copy.deepcopy(profile["permissions"]["read"])
    permit.update(targetRefs=[profile["targets"]["gateway"]["id"]],
                  resourceRefs=[profile["post"][k] for k in ("bindingRef", "queueRef", "workerRef", "deliveryRef")],
                  actions=["POST-synthetic", "delivery-observe", "GET-readback"])
    profile["permissions"]["post"] = permit


class OfflineReadiness(unittest.TestCase):
    def invalid(self, profile, field):
        errors = VALIDATOR.validate(profile, now=NOW)
        self.assertTrue(errors)
        self.assertTrue(any(field in error for error in errors), errors)
        self.assertNotIn(SENTINEL, "\n".join(errors))

    def test_ENV02_complete_synthetic_read_without_post(self):
        profile = synthetic()
        self.assertEqual(VALIDATOR.validate(profile, now=NOW), [])
        self.assertNotIn("post", profile["permissions"])
        self.assertFalse(profile["smoke"]["runtimeLoadVerified"])
        self.assertEqual(profile["vendorStatus"], "unchecked")
        optional_post(profile)
        self.assertEqual(VALIDATOR.validate(profile, now=NOW), [])

    def test_ENV01_missing_fields_and_null_template(self):
        self.invalid(json.loads((READINESS / "examples/profile.template.json").read_text()), "targets")
        paths = [("targets",), ("source",), ("ownerRef",), ("isolationRef",),
                 ("targets", "gateway", "attestationRef"), ("targets", "backendPg", "clusterAclAttestationRef"),
                 ("actors", "seoOnly", "credentialRef"), ("permissions", "read", "expiresAt")]
        paths += [("permissions", group, field) for group in VALIDATOR.GROUPS
                  for field in ("targetRefs", "resourceRefs", "actions", "consentRef", "manifestRef", "permitRef", "ownerRef", "isolationRef")]
        for path in paths:
            with self.subTest(path=path):
                profile = synthetic()
                parent = profile
                for key in path[:-1]:
                    parent = parent[key]
                del parent[path[-1]]
                self.invalid(profile, ".".join(path))

    def test_ENV01_unsafe_values_and_closed_fields(self):
        mutations = [
            (("targets", "gateway", "endpoint", "host"), "http://user:" + SENTINEL + "@app.invalid?q=x"),
            (("targets", "gateway", "endpoint", "scheme"), "file"),
            (("targets", "gateway", "endpoint", "host"), "*.invalid"),
            (("actors", "seoOnly", "credentialRef"), "/secrets/" + SENTINEL),
            (("actors", "seoOnly", "credentialRef"), "Bearer " + SENTINEL),
            (("targets", "backendPg", "role"), "postgres"),
            (("targets", "metricaPg", "database"), "app"),
            (("targets", "peer", "isolation"), "shared-app"),
            (("permissions", "pg", "consentRef"), "approval:apply"),
            (("permissions", "read", "actions"), ["POST-synthetic"]),
            (("source", "runtimeRevision"), None),
            (("version",), True),
            (("vendorStatus",), "passed"),
        ]
        for path, value in mutations:
            with self.subTest(path=path, variant=type(value).__name__):
                profile = synthetic()
                parent = profile
                for key in path[:-1]:
                    parent = parent[key]
                parent[path[-1]] = value
                self.invalid(profile, ".".join(path))
        for key in ("password", "token", "Authorization", SENTINEL):
            profile = synthetic()
            profile["actors"]["seoOnly"][key] = SENTINEL
            self.invalid(profile, "unknown-field")

    def test_ENV03_expiry_all_groups_and_bounded_budgets(self):
        for group in VALIDATOR.GROUPS:
            for expiry in ("2000-01-01T00:00:00Z", "2030-01-01T00:00:01Z", "2099-01-01", "not-a-date"):
                with self.subTest(group=group, expiry=expiry):
                    profile = synthetic()
                    profile["permissions"][group]["expiresAt"] = expiry
                    self.invalid(profile, f"permissions.{group}.expiresAt")
        for field, value in (("scenarioSeconds", 121), ("httpSeconds", 11), ("cleanupSeconds", 31), ("groupSeconds", 901)):
            profile = synthetic()
            profile["budgets"][field] = value
            self.invalid(profile, "budgets")
        profile = synthetic()
        profile["permissions"]["pg"]["actions"] = ["test"]
        self.invalid(profile, "permissions.pg.actions")

    def test_ENV03_cross_field_mismatches(self):
        mutations = [
            (("resources", "acceptanceSchema", "id"), "qa_" + "d" * 32 + "_" + "c" * 12),
            (("resources", "backendFixtures", "targetRef"), "foreign_target"),
            (("resources", "metricaFixtures", "ownerRef"), "foreign_owner"),
            (("targets", "peer", "networkRef"), "foreign_network"),
            (("source", "runtimeRevision"), "e" * 40),
            (("actors", "seoOnly", "roles"), ["ADMIN"]),
            (("actors", "nonSeo", "tenantRef"), "foreign_tenant"),
            (("fixtures", "totals", "A"), 9),
            (("fixtures", "order"), ["history_B", "history_A"]),
        ]
        mutations += [(("permissions", g, k), v) for g in VALIDATOR.GROUPS
                      for k, v in (("targetRefs", ["foreign_target"]), ("resourceRefs", ["foreign_resource"]),
                                   ("ownerRef", "foreign_owner"), ("isolationRef", "foreign_isolation"))]
        for path, value in mutations:
            with self.subTest(path=path):
                profile = synthetic()
                parent = profile
                for key in path[:-1]:
                    parent = parent[key]
                parent[path[-1]] = value
                self.invalid(profile, ".".join(path[:-1]))
        profile = synthetic()
        for key in ("host", "port", "database"):
            profile["targets"]["acceptancePg"][key] = profile["targets"]["metricaPg"][key]
        self.invalid(profile, "separate-api-acceptance-db-required")

    def test_ENV03_post_independent_gates(self):
        profile = synthetic()
        optional_post(profile)
        del profile["permissions"]["post"]
        self.invalid(profile, "post-gates-required")
        profile = synthetic()
        optional_post(profile)
        del profile["post"]
        self.invalid(profile, "post-gates-required")
        for field in ("bindingRef", "queueRef", "workerRef", "deliveryRef", "isolationRef", "noVendorEgress"):
            profile = synthetic()
            optional_post(profile)
            del profile["post"][field]
            self.invalid(profile, "post." + field)
        profile = synthetic()
        optional_post(profile)
        profile["post"]["noVendorEgress"] = False
        self.invalid(profile, "post.noVendorEgress")
        profile = synthetic()
        optional_post(profile)
        profile["permissions"]["post"]["expiresAt"] = "2000-01-01T00:00:00Z"
        self.invalid(profile, "permissions.post.expiresAt")

    def cli(self, text, argv=None):
        original = Path.open
        reads = []

        def guarded_open(path, *args, **kwargs):
            reads.append(path)
            if path == Path("offline-profile.json"):
                return io.StringIO(text)
            if path == VALIDATOR.SCHEMA:
                return original(path, *args, **kwargs)
            raise AssertionError("unexpected file read")

        out = io.StringIO()
        with patch.object(Path, "open", guarded_open), redirect_stdout(out):
            code = VALIDATOR.main(["--profile", "offline-profile.json"] if argv is None else argv)
        self.assertTrue(set(reads) <= {Path("offline-profile.json"), VALIDATOR.SCHEMA})
        return code, out.getvalue()

    def test_ENV02_cli_safe_exit_contract(self):
        self.assertEqual(self.cli(json.dumps(synthetic())), (0, "offline-profile-valid\n"))
        for value in ("not-json-" + SENTINEL, '{"password":"' + SENTINEL + '"}',
                      '{"version":1,"version":1}', "[]", "null", " " * 262145):
            code, output = self.cli(value)
            self.assertEqual(code, 2)
            self.assertNotIn(SENTINEL, output)
            self.assertNotIn("offline-profile-valid", output)
        self.assertEqual(self.cli("", ["--unknown", SENTINEL]), (2, "profile:usage --profile <path>\n"))
        out = io.StringIO()
        with patch.object(Path, "open", side_effect=OSError(SENTINEL)), redirect_stdout(out):
            self.assertEqual(VALIDATOR.main(["--profile", SENTINEL]), 2)
        self.assertNotIn(SENTINEL, out.getvalue())

    def test_ENV01_no_network_process_env_or_credential_reads(self):
        profile = synthetic()
        class DeniedEnvironment:
            def __getattribute__(self, name):
                raise AssertionError("environment access prohibited")

        with ExitStack() as stack:
            for target in ("socket.socket", "socket.create_connection", "socket.getaddrinfo",
                           "subprocess.Popen", "subprocess.run", "os.getenv", "os.system"):
                stack.enter_context(patch(target, side_effect=AssertionError("external operation prohibited")))
            stack.enter_context(patch("os.environ", DeniedEnvironment()))
            self.assertEqual(VALIDATOR.validate(profile, now=NOW), [])
            self.assertEqual(self.cli(json.dumps(profile)), (0, "offline-profile-valid\n"))
        tree = ast.parse((READINESS / "validate.py").read_text())
        imports = {node.names[0].name.split(".")[0] for node in ast.walk(tree) if isinstance(node, ast.Import)}
        imports |= {node.module.split(".")[0] for node in ast.walk(tree) if isinstance(node, ast.ImportFrom)}
        self.assertLessEqual(imports, {"json", "re", "sys", "datetime", "pathlib"})

    def test_SK01_disk_is_not_runtime_or_acceptance(self):
        for path in (".agents/skills/api-smoke-test/SKILL.md", ".claude/skills/api-smoke-test/SKILL.md"):
            self.assertTrue((ROOT / path).is_file())  # No contents or adjacent credentials opened.
        profile = synthetic()
        self.assertEqual(VALIDATOR.validate(profile, now=NOW), [])
        profile["smoke"]["runtimeLoadVerified"] = True
        self.invalid(profile, "load-evidence-required")
        profile["smoke"]["loadEvidenceRef"] = "simulation_loader_evidence"
        self.assertEqual(VALIDATOR.validate(profile, now=NOW), [])
        profile["smoke"]["diskPresent"] = False
        self.invalid(profile, "load-evidence-required")
        readme = (READINESS / "README.md").read_text()
        for phrase in ("blocked-tool", "внешнему владельцу DSH", "новую сессию", "deferred / non-waived",
                       "Missing native fixture tool", "vendor unchecked", "202 ≠ delivery ≠ completion"):
            self.assertIn(phrase, readme)
        self.assertIn('skill(name="api-smoke-test")', readme)
        names = ("test_aggregate_identity", "test_status_order_pagination", "test_consistent_read_snapshot", "test_history_survives_cleanup")
        nodes = re.findall(r"^tests/integration/test_metrica_task_list_postgres.py::(\w+)$", readme, re.M)
        self.assertEqual(tuple(nodes), names)
        for link in re.findall(r"\]\(([^)#]+)(?:#[^)]*)?\)", readme):
            self.assertTrue((READINESS / link).exists(), link)


if __name__ == "__main__":
    unittest.main()
