"""Secret-free, offline admission checks. Never executes refs or issues permits."""

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = Path(__file__).with_name("profile.schema.json")
GROUPS = ("environment", "actors", "pg", "read", "cleanup")


def _date(value):
    result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if result.utcoffset() is None:
        raise ValueError
    return result


def _shape(value, schema, path, errors):
    """Only the finite keywords used by the bundled schema; not a schema engine."""
    if "const" in schema and (type(value) is not type(schema["const"]) or value != schema["const"]):
        errors.append(f"{path}:invalid-constant")
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{path}:invalid-choice")
    kind = schema.get("type")
    types = {"object": dict, "array": list, "string": str, "integer": int, "boolean": bool}
    if kind and type(value) is not types[kind]:
        errors.append(f"{path}:invalid-type")
        return
    if kind == "object":
        properties = schema["properties"]
        if set(value) - set(properties):
            errors.append(f"{path}:unknown-field")  # Never echo untrusted keys.
        for key in schema["required"]:
            if key not in value:
                errors.append(f"{path}.{key}:missing")
        for key, child in properties.items():
            if key in value:
                _shape(value[key], child, f"{path}.{key}", errors)
    elif kind == "array":
        if not schema["minItems"] <= len(value) <= schema["maxItems"]:
            errors.append(f"{path}:invalid-count")
        if schema.get("uniqueItems") and any(item in value[:i] for i, item in enumerate(value)):
            errors.append(f"{path}:duplicate")
        for item in value[:100]:
            _shape(item, schema["items"], f"{path}[]", errors)
    elif kind == "string":
        if "pattern" in schema and not re.fullmatch(schema["pattern"], value):
            errors.append(f"{path}:unsafe-reference")
        if schema.get("format") == "date-time":
            try:
                _date(value)
            except (ValueError, OverflowError):
                errors.append(f"{path}:invalid-expiry")
    elif kind == "integer" and not schema["minimum"] <= value <= schema["maximum"]:
        errors.append(f"{path}:invalid-budget")


def validate(profile, *, now=None):
    """Return safe field codes only. A valid declaration is not verified consent."""
    errors = []
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    _shape(profile, schema, "profile", errors)
    if errors:
        return errors[:64]
    now = now or datetime.now(timezone.utc)
    targets, resources = profile["targets"], profile["resources"]
    owner, isolation = profile["ownerRef"], profile["isolationRef"]

    def check(ok, path, code):
        if not ok:
            errors.append(f"profile.{path}:{code}")

    target_ids = [t["id"] for t in targets.values()]
    resource_ids = [r["id"] for r in resources.values()]
    check(len(set(target_ids)) == len(target_ids), "targets", "distinct-identities-required")
    # Acceptance DB is never the API DB, even under another opaque ID.
    db_keys = [(targets[k]["host"], targets[k]["port"], targets[k]["database"])
               for k in ("backendPg", "metricaPg", "acceptancePg")]
    check(len(set(db_keys)) == 3, "targets", "separate-api-acceptance-db-required")
    check(len(set(resource_ids)) == len(resource_ids), "resources", "distinct-identities-required")
    expected_targets = {
        "project": "gateway", "network": "gateway", "volume": "backendPg",
        "backendFixtures": "backendPg", "metricaFixtures": "metricaPg", "acceptanceSchema": "acceptancePg",
    }
    for key, resource in resources.items():
        check(resource["ownerRef"] == owner, f"resources.{key}.ownerRef", "owner-mismatch")
        check(resource["targetRef"] == targets[expected_targets[key]]["id"],
              f"resources.{key}.targetRef", "target-mismatch")
    check(bool(re.fullmatch("qa_" + profile["runId"] + "_[a-f0-9]{12}", resources["acceptanceSchema"]["id"])),
          "resources.acceptanceSchema.id", "run-resource-mismatch")
    for key in ("gateway", "peer"):
        for field, resource in (("projectRef", "project"), ("networkRef", "network")):
            check(targets[key][field] == resources[resource]["id"], f"targets.{key}.{field}", "resource-mismatch")
    source = profile["source"]
    check(source["sourceRevision"] == source["runtimeRevision"], "source", "revision-mismatch")
    tenants = profile["tenants"]
    check(tenants["A"] != tenants["B"], "tenants", "distinct-tenants-required")
    expected_roles = {"seoOnly": {"SEO"}, "seoAdmin": {"SEO", "ADMIN"}, "nonSeo": {"USER"}, "adminOnly": {"ADMIN"}}
    check(len({a["id"] for a in profile["actors"].values()}) == 4, "actors", "distinct-actors-required")
    check({a["tenantRef"] for a in profile["actors"].values()} == set(tenants.values()),
          "actors", "both-tenants-required")
    for key, actor in profile["actors"].items():
        check(actor["tenantRef"] in tenants.values(), f"actors.{key}.tenantRef", "tenant-mismatch")
        check(set(actor["roles"]) == expected_roles[key], f"actors.{key}.roles", "role-mismatch")
    fixtures = profile["fixtures"]
    check(fixtures["ownerRef"] == owner, "fixtures.ownerRef", "owner-mismatch")
    pages = [item for page in fixtures["pages"] for item in page]
    check(pages == fixtures["order"] and set(pages) == set(fixtures["ids"]), "fixtures", "history-order-pages-mismatch")
    check(sum(fixtures["totals"].values()) == len(fixtures["ids"]), "fixtures.totals", "total-mismatch")
    budgets = profile["budgets"]
    duration = budgets["setupSeconds"] + budgets["groupSeconds"] + budgets["cleanupSeconds"]
    check(budgets["scenarioSeconds"] <= budgets["groupSeconds"], "budgets", "group-too-short")
    scope = {
        "environment": (target_ids, [resources[k]["id"] for k in ("project", "network", "volume", "backendFixtures", "metricaFixtures")]),
        "actors": ([targets[k]["id"] for k in ("gateway", "backendPg", "metricaPg")], [resources[k]["id"] for k in ("backendFixtures", "metricaFixtures")]),
        "pg": ([targets["acceptancePg"]["id"]], [resources["acceptanceSchema"]["id"]]),
        "read": ([targets[k]["id"] for k in ("gateway", "peer")], [resources[k]["id"] for k in ("backendFixtures", "metricaFixtures")]),
        "cleanup": (target_ids, resource_ids),
    }
    permissions = profile["permissions"]
    check(("post" in permissions) == ("post" in profile), "permissions.post", "post-gates-required")
    if "post" in profile:
        post = profile["post"]
        check(post["bindingRef"] == fixtures["bindingRef"], "post.bindingRef", "binding-mismatch")
        check(post["isolationRef"] == isolation, "post.isolationRef", "isolation-mismatch")
        scope["post"] = ([targets["gateway"]["id"]], [post[k] for k in ("bindingRef", "queueRef", "workerRef", "deliveryRef")])
    for group, permit in permissions.items():
        if group not in scope:  # A POST declaration without gates was rejected above.
            continue
        prefix = f"permissions.{group}"
        expected_t, expected_r = scope[group]
        check(set(permit["targetRefs"]) == set(expected_t), prefix + ".targetRefs", "scope-mismatch")
        check(set(permit["resourceRefs"]) == set(expected_r), prefix + ".resourceRefs", "scope-mismatch")
        check(permit["ownerRef"] == owner, prefix + ".ownerRef", "owner-mismatch")
        check(permit["isolationRef"] == isolation, prefix + ".isolationRef", "isolation-mismatch")
        check((_date(permit["expiresAt"]) - now).total_seconds() >= duration, prefix + ".expiresAt", "expired-or-insufficient-budget")
        if group in ("actors", "pg", "read", "cleanup", "post"):
            expected = {"actors": {"fixture-setup"}, "pg": {"setup", "test", "teardown"}, "read": {"GET"},
                        "cleanup": {"cleanup"}, "post": {"POST-synthetic", "delivery-observe", "GET-readback"}}[group]
            check(set(permit["actions"]) == expected, prefix + ".actions", "incomplete-actions")
    smoke = profile["smoke"]
    if smoke["runtimeLoadVerified"]:
        check(smoke["diskPresent"] and "loadEvidenceRef" in smoke, "smoke", "load-evidence-required")
    return errors[:64]


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if len(argv) != 2 or argv[0] != "--profile":
        print("profile:usage --profile <path>")
        return 2
    try:
        with Path(argv[1]).open(encoding="utf-8") as stream:
            text = stream.read(262145)
        if len(text) > 262144:
            print("profile:too-large")
            return 2
        def unique_object(pairs):
            result = {}
            for key, value in pairs:
                if key in result:
                    raise ValueError
                result[key] = value
            return result

        profile = json.loads(text, object_pairs_hook=unique_object)
        errors = validate(profile)
    except (OSError, ValueError, RecursionError):
        print("profile:unreadable-or-invalid-json")
        return 2
    if errors:
        print("\n".join(errors))
        return 2
    print("offline-profile-valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
