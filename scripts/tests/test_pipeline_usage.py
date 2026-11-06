"""USG-01/02: synthetic-only offline collector, process ledger and privacy."""
import copy
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest
import uuid
import zipfile

ROOT = Path(__file__).resolve().parents[2]
TOOL = ROOT / "scripts/qa/usage"
sys.path.insert(0, str(TOOL))
from common import Invalid, MAX_RECORD, records  # noqa: E402
from collect import collect, markdown  # noqa: E402
from ledger import load, validate, validate_rows  # noqa: E402
from metrics import process  # noqa: E402
from usage import collect_usage  # noqa: E402

FIX = TOOL / "fixtures"
# QA_EVIDENCE_ROOT contract: validated lane root + exclusive per-suite child.
def suite_evidence(default_dir, suite, root):
    raw = os.environ.get("QA_EVIDENCE_ROOT")
    if raw is None:
        return default_dir
    def invalid():
        raise ValueError("Invalid or colliding QA_EVIDENCE_ROOT")
    if not raw or "\\" in raw or any(p in (".", "..") for p in raw.split("/")):
        invalid()
    base = root / ".qa/harden-agent-verification-pipeline"
    target = Path(os.path.abspath(root / raw))
    if not target.is_relative_to(base) or target == base:
        invalid()
    parts = target.relative_to(root).parts
    if any(not p or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.-" for c in p) for p in parts):
        invalid()
    current = root
    for part in parts:
        current = current / part
        try:
            current.mkdir()
        except FileExistsError:
            pass
        if current.is_symlink() or not current.is_dir():
            invalid()
    child = target / suite
    try:
        child.mkdir()
    except OSError:
        invalid()
    return child
# End QA_EVIDENCE_ROOT contract.

EVIDENCE = suite_evidence(ROOT / ".qa/harden-agent-verification-pipeline/USAGE-1", "pipeline-usage", ROOT)
SENTINEL = "SYNTHETIC_PRIVATE_SENTINEL_7391"


class PipelineUsage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Never use /tmp or real logs. Preserve cases as evidence, without deleting any paths.
        cls.work = EVIDENCE / ("synthetic-" + uuid.uuid4().hex)
        cls.work.mkdir(parents=True)

    def put(self, name, rows):
        path = self.work / (uuid.uuid4().hex + "-" + name)
        path.write_text("".join(json.dumps(r) + "\n" for r in rows))
        return path

    def rows(self):
        return load([FIX / "ledger.jsonl"])

    def usage_rows(self):
        return [json.loads(line) for line in (FIX / "usage.jsonl").read_text().splitlines()]

    def cli(self, script, *args):
        return subprocess.run([sys.executable, str(TOOL / script), *map(str, args)],
                              capture_output=True, text=True, cwd=ROOT, timeout=10)

    def test_usg01_golden_and_no_raw_export(self):
        result = collect([FIX / "usage.jsonl"], [FIX / "ledger.jsonl"])
        self.assertEqual(result, json.loads((FIX / "expected.json").read_text()))
        exported = json.dumps(result) + markdown(result)
        for forbidden in [SENTINEL, "example.invalid", "arguments", "metadata", "https://", "s1", "m1"]:
            self.assertNotIn(forbidden, exported)
        backend = result["usage"]["byRole"]["Backend"]
        self.assertEqual(backend["total"]["value"], 250)
        self.assertEqual(backend["cacheRead"]["value"], 160)
        self.assertEqual(backend["cacheWrite"], dict(value=None, known=0, unknown=2, complete=False))
        self.assertEqual(result["usage"]["initialContext"]["input"]["value"], 100)

    def test_usg01_digest_and_event_dedup_zip_without_extraction(self):
        archive = self.work / "synthetic.zip"
        with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as out:
            out.writestr("a/usage.jsonl", (FIX / "usage.jsonl").read_bytes())
            out.writestr("b/usage.jsonl", (FIX / "usage.jsonl").read_bytes())
        result = collect_usage([archive, archive, FIX / "usage.jsonl"])
        self.assertEqual(result["messages"], 2)
        self.assertEqual(result["sources"], 1)
        self.assertFalse((self.work / "a").exists())
        # Same events, different bytes: event identity, not archive identity, deduplicates.
        changed = self.put("export.jsonl", self.usage_rows()[::-1])
        self.assertEqual(collect_usage([FIX / "usage.jsonl", changed])["messages"], 2)

    def test_usg01_identity_conflicts_and_aliases(self):
        first = self.usage_rows()[0]
        alternate = copy.deepcopy(first)
        alternate.pop("eventId")
        path = self.put("dedup.jsonl", [first, alternate])
        self.assertEqual(collect_usage([path])["messages"], 1)
        alternate["data"]["usage"]["inputTokens"] = 999
        with self.assertRaises(Invalid):
            collect_usage([self.put("conflict.jsonl", [first, alternate])])
        first["data"]["usage"]["input_tokens"] = 999
        with self.assertRaises(Invalid):
            collect_usage([self.put("aliases.jsonl", [first])])

    def test_usg01_null_partial_legacy_roles_and_no_inference(self):
        first = self.usage_rows()[0]
        first.pop("sessionId")
        first.pop("messageId")
        first.pop("eventId")
        first["data"]["usage"] = {"totalTokens": 42}
        second = copy.deepcopy(first)
        second["role"] = "Frontend"
        second["data"]["usage"] = {"input_tokens": 0, "output_tokens": None}
        path = self.put("legacy.jsonl", [first, second])
        result = collect_usage([path, path])
        self.assertEqual(result["messages"], 2)
        self.assertEqual(result["legacyRecords"], 2)
        self.assertTrue(result["gaps"])
        self.assertIsNone(result["byRole"]["Backend"]["input"]["value"])
        self.assertEqual(result["byRole"]["Frontend"]["input"]["value"], 0)
        self.assertIsNone(result["initialContext"]["input"]["value"])

    def test_usg01_malformed_oversize_and_unsupported_safe(self):
        for content in [b'{"secret":"' + SENTINEL.encode(), b'x' * (MAX_RECORD + 1), b'[]\n', b'{"x":NaN}\n']:
            with self.assertRaises(Invalid) as error:
                list(records(io.BytesIO(content)))
            self.assertNotIn(SENTINEL, str(error.exception))
        for bad in [{"type":"assistant/message", "data":[]},
                    {"type":"assistant/message", "data":{"usage":[]}},
                    {"type":"assistant/message", "data":{"usage":{"totalTokens":True}}}]:
            result = self.cli("collect.py", "--input", self.put("bad.jsonl", [bad]),
                              "--ledger", FIX / "ledger.jsonl", "--output", self.work / "invalid.json")
            self.assertEqual(result.returncode, 2)
            self.assertNotIn(SENTINEL, result.stderr + result.stdout)

    def test_usg01_zip_slip_bomb_and_corrupt(self):
        for i, name in enumerate(["../escape.jsonl", "/escape.jsonl", "x\\escape.jsonl", "C:/escape.jsonl", "unexpected.txt"]):
            path = self.work / f"unsafe-{i}.zip"
            with zipfile.ZipFile(path, "w") as out:
                out.writestr(name, '{}\n')
            with self.assertRaises(Invalid):
                collect_usage([path])
        # Synthetic compressed oversize member, no extraction and no huge allocation in collector.
        path = self.work / "oversize.zip"
        with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as out:
            with out.open("large.jsonl", "w") as member:
                for _ in range(33):
                    member.write(b' ' * (1024 * 1024))
        with self.assertRaises(Invalid):
            collect_usage([path])
        corrupt = self.work / "corrupt.zip"
        corrupt.write_bytes(b'PK\x03\x04broken' + SENTINEL.encode())
        with self.assertRaises(Invalid):
            collect_usage([corrupt])

    def test_usg02_session_resume_split_partial_exact_reopen_overlap(self):
        result = process(self.rows())
        self.assertEqual((result["newSessions"], result["resumes"], result["units"], result["splits"]), (1, 2, 2, 1))
        self.assertEqual(result["partial"]["causes"], {"scope":1})
        self.assertEqual(result["firstPass"]["numerator"], 0)
        self.assertEqual(result["firstPass"]["denominator"], 1)
        self.assertEqual(result["exactFailPass"]["numerator"], 1)
        self.assertEqual(result["exactFailPass"]["coverage"], {"observed":1, "population":1})
        self.assertEqual(result["reopen"], {"count":1, "denominator":1})
        self.assertEqual(result["time"]["allCategories"]["overlapSeconds"], 5)
        self.assertEqual(result["time"]["allCategories"]["unionSeconds"], 15)
        self.assertEqual(result["time"]["unknownIntervals"], 3)

    def test_usg02_blocked_unknown_firstpass_and_partial_causes(self):
        rows = self.rows()
        base = rows[0]
        for number, status in enumerate(["passed", "blocked", "unchecked"]):
            rows.append(dict(base, eventId=f"qg-{number}", changeId=f"change-{number}",
                             eventType="handoff", stage="QG", qgRound=1, status=status))
        rows.append(dict(base, eventId="no-handoff", changeId="unknown-change"))
        for reason in ["ownership", "infrastructure", "other", "unknown"]:
            rows.append(dict(base, eventId=reason, eventType="handoff", status="partial", partialReason=reason))
        result = process(validate_rows(rows))
        self.assertEqual(result["firstPass"]["numerator"], 1)
        self.assertEqual(result["firstPass"]["denominator"], 2)
        self.assertEqual(result["firstPass"]["blocked"], 2)
        self.assertEqual(result["firstPass"]["unknown"], 1)
        self.assertEqual(result["firstPass"]["coverage"], {"observed":2, "population":5})
        self.assertEqual(set(result["partial"]["causes"]), {"scope", "ownership", "infrastructure", "other", "unknown"})
        self.assertEqual(process([])["firstPass"]["value"], None)
        finding = next(r for r in rows if r["eventType"] == "finding")
        rows.append(dict(finding, eventId="unknown-class", changeId="change-0", **{"class":"unknown"}))
        self.assertEqual(process(validate_rows(rows))["firstPass"]["unknown"], 2)
        rows[-1]["class"] = "nonblocking"
        rows[-1].pop("qgRound")
        self.assertEqual(process(validate_rows(rows))["firstPass"]["unknown"], 2)

    def test_usg02_exact_pair_coverage_wrong_environment_and_unreproduced(self):
        rows = self.rows()
        finding = next(r for r in rows if r["eventType"] == "finding")
        rows.append(dict(finding, eventId="missing", findingId="F-2", exactBefore=None, exactAfter=None))
        result = process(rows)
        self.assertEqual(result["exactFailPass"]["coverage"], {"observed":1,"population":2})
        before = next(r for r in rows if r.get("runId") == "before")
        before["status"] = "passed"
        self.assertEqual(process(rows)["exactFailPass"]["numerator"], 0)
        before["environmentFingerprint"] = "different"
        self.assertEqual(process(rows)["exactFailPass"]["denominator"], 0)

    def test_usg02_suite_repeats_and_dedup(self):
        rows = self.rows()
        base = next(r for r in rows if r.get("runId") == "before")
        first = dict(base, eventId="suite-1", runId="suite-1", commandClass="full-suite", stage="final-service", service="synthetic", reason="initial")
        repeat = dict(first, eventId="suite-2", runId="suite-2", previousRunId="suite-1", reason="independent-qg", stage="QG")
        rows += [first, repeat, repeat]
        result = process(validate_rows(rows))
        self.assertEqual(result["fullSuites"]["runs"], 2)
        self.assertEqual(result["fullSuites"]["repeats"], 1)
        self.assertEqual({g["reason"] for g in result["fullSuites"]["groups"]}, {"initial", "independent-qg"})
        repeat["reason"] = None
        with self.assertRaises(Invalid):
            validate_rows(rows)

    def test_usg02_ledger_strict_schema_enums_identity_and_privacy(self):
        base = self.rows()[0]
        for key, value in [("rawHandoff",SENTINEL), ("url",SENTINEL), ("env",SENTINEL), ("role","Superuser"),
                           ("eventType", []), ("timestamp",SENTINEL), ("sessionId","https://example.invalid/" + SENTINEL)]:
            bad = dict(base, **{key:value})
            with self.assertRaises(Invalid):
                validate(bad)
            result = self.cli("ledger.py", "append", "--event", self.put("bad-ledger.jsonl", [bad]), "--ledger", self.work / "reject.jsonl")
            self.assertEqual(result.returncode, 2)
            self.assertNotIn(SENTINEL, result.stderr + result.stdout)
        self.assertEqual(len(validate_rows([base, base])), 1)
        with self.assertRaises(Invalid):
            validate_rows([base, dict(base, invocationId="different")])

    def test_usg02_append_cli_collect_documented_commands_and_input_protection(self):
        target = self.work / "append.jsonl"
        for event in [FIX / "session-start.json", FIX / "session-start.json", FIX / "resume.json"]:
            result = self.cli("ledger.py", "append", "--event", event, "--ledger", target)
            self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(load([target])), 2)
        # Append a verification with a reference to an existing run, then idempotently append again.
        for event in [r for r in self.rows() if r["eventType"] == "verification"]:
            result = self.cli("ledger.py", "append", "--event", self.put("run.jsonl", [event]), "--ledger", target)
            self.assertEqual(result.returncode, 0, result.stderr)
        output = self.work / "summary.json"
        result = self.cli("collect.py", "--input", FIX / "usage.jsonl", "--ledger", FIX / "ledger.jsonl", "--output", output)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(output.read_text()), json.loads((FIX / "expected.json").read_text()))
        self.assertNotIn(SENTINEL, output.read_text() + output.with_suffix('.md').read_text() + result.stdout + result.stderr)
        original = target.read_bytes()
        result = self.cli("collect.py", "--input", FIX / "usage.jsonl", "--ledger", target, "--output", target)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(target.read_bytes(), original)

    def test_usg01_role_from_ledger_streaming_and_schema_gaps(self):
        first = self.usage_rows()[0]
        first.pop("role")
        streaming = copy.deepcopy(first)
        streaming["messageId"] = "chunk"
        streaming["data"]["terminal"] = False
        path = self.put("role.jsonl", [streaming, first])
        result = collect([path], [FIX / "ledger.jsonl"])
        self.assertEqual(result["usage"]["messages"], 1)
        self.assertIn("Backend", result["usage"]["byRole"])
        first["role"] = "Frontend"
        with self.assertRaises(Invalid):
            collect([self.put("bad-role.jsonl", [first])], [FIX / "ledger.jsonl"])
        for event in [{}, {"type":"vendor/unknown"}, {"type":"assistant/message", "data":{"usage":{"mystery":9}}}]:
            with self.assertRaises(Invalid):
                collect_usage([self.put("unsupported.jsonl", [event])])
        with self.assertRaises(Invalid):
            list(records(io.BytesIO(b'{"type":"end","type":"assistant/message"}\n')))

    def test_usg02_missing_handoff_unknown_identity_and_planned_suite(self):
        rows = self.rows()
        base = rows[0]
        rows.append(dict(base, eventId="unknown-session", changeId="new-change", unitId="new-unit", sessionId=None))
        rows.append(dict(base, eventId="unknown-partial", eventType="handoff", status="partial", partialReason=None))
        suite = dict(next(r for r in rows if r.get("runId") == "before"),
                     eventId="planned-suite", runId="planned-suite", status="planned",
                     commandClass="full-suite", service="synthetic", reason="initial")
        rows.append(suite)
        result = process(validate_rows(rows))
        self.assertEqual(result["unknownSessionStarts"], 1)
        self.assertEqual(result["firstPass"]["unknown"], 1)
        self.assertEqual(result["partial"]["causes"]["unknown"], 1)
        self.assertEqual(result["fullSuites"]["notExecuted"], 1)
        self.assertEqual(result["fullSuites"]["runs"], 0)
        self.assertLess(result["coverage"]["unitsWithHandoff"], result["coverage"]["units"])
        with self.assertRaises(Invalid):
            validate_rows([dict(suite, previousRunId="missing", reason="code-changed")])
        with self.assertRaises(Invalid):
            validate_rows([suite, dict(suite, eventId="duplicate-run")])

    def test_schemas_cover_runtime_fields(self):
        import ledger
        schema = json.loads((TOOL / "ledger.schema.json").read_text())
        self.assertEqual(set(schema["required"]), ledger.COMMON)
        self.assertEqual(set(schema["properties"]), ledger.COMMON | set.union(*ledger.SPECIFIC.values()))
        for key in ledger.ENUMS:
            actual = schema["properties"][key]
            if "anyOf" in actual:
                actual = actual["anyOf"][0]
            self.assertEqual(actual["enum"], ledger.ENUMS[key])


if __name__ == "__main__":
    unittest.main()
