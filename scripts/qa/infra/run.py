#!/usr/bin/env python3
"""Offline preflight / explicitly permitted fixed-command real acceptance."""

import argparse
import asyncio
import os
import signal
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from infra.contracts import (  # noqa: E402
    ROOT,
    GuardError,
    evidence_dir,
    fingerprint,
    load,
    require,
    validate,
)
from infra.lifecycle import owned, save  # noqa: E402


def service_environment(m, manifest_path, permit_path):
    service = ROOT / "services" / m["service"]
    python = service / ".venv/bin/python"
    require(python.is_file() and (service / "uv.lock").is_file(), "missing-service-lockfile-environment")
    # Deliberately do not inherit application settings, PYTEST_ADDOPTS or plugin auto-load.
    env = {key: os.environ[key] for key in ("PATH", "LANG", "HOME", "SSL_CERT_FILE") if key in os.environ}
    for key in ("QA_INFRA_PG_URL", "QA_INFRA_NATS_URL"):
        if key in os.environ:
            env[key] = os.environ[key]
    env.update(
        {
            "PYTHONPATH": str(ROOT / "scripts/qa"),
            "QA_TEST_SUPPORT_ROOT": str(ROOT / "scripts/qa"),
            "PYTEST_DISABLE_PLUGIN_AUTOLOAD": "1",
            "QA_INFRA_MANIFEST": str(Path(manifest_path).resolve()),
            "QA_INFRA_PERMIT": str(Path(permit_path).resolve()),
            "QA_INFRA_ACTIVE": m["runId"],
            "QA_INFRA_RESULT": str(evidence_dir(m) / "tests.json"),
        }
    )
    return service, python, env


async def tests(m, service, python, env, *, collecting=False):
    # asyncio plugin explicitly loaded; service lockfile owns pytest/driver versions.
    argv = [
        str(python),
        "-m",
        "pytest",
        "-p",
        "infra.pytest_gate",
        "-p",
        "pytest_asyncio.plugin",
        "-o",
        "addopts=",
        "--strict-markers",
        *m["nodeIds"],
    ]
    if collecting:
        argv.append("--collect-only")
        env = {**env, "QA_INFRA_COLLECT_ONLY": "1", "QA_INFRA_RESULT": str(evidence_dir(m) / "collection.json")}
    process = await asyncio.create_subprocess_exec(
        *argv,
        cwd=service,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        rc = await asyncio.wait_for(process.wait(), m["timeout"])
    finally:
        if process.returncode is None:
            process.kill()
            await process.wait()
    require(rc == 0, "acceptance-command-failed")
    result = load(env["QA_INFRA_RESULT"])
    require(result.get("status") == "passed" and result.get("expected") == len(m["nodeIds"]), "acceptance-incomplete")
    if not collecting:
        require(
            result.get("scope") == "service-acceptance" and result.get("completed") == len(m["nodeIds"]),
            "acceptance-incomplete",
        )


async def execute(m, p, args):
    service, python, env = service_environment(m, args.manifest, args.permit)
    require(Path(sys.prefix).resolve() == (service / ".venv").resolve(), "worker-not-in-service-environment")
    directory = evidence_dir(m)
    require(
        not (directory / "resources.json").exists() and not (directory / "summary.json").exists(),
        "run-id-already-used",
    )
    directory.mkdir(parents=True, exist_ok=True)
    if m["nodeIds"] != ["selftest"]:
        await tests(m, service, python, env, collecting=True)
    async with owned(m, p):
        if m["nodeIds"] != ["selftest"]:
            await tests(m, service, python, env)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["preflight", "run"])
    parser.add_argument("--kind", choices=["pg", "nats"], required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--permit", required=True)
    parser.add_argument("--worker", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args(argv)
    m = None
    try:
        m, p = load(args.manifest), load(args.permit)
        validate(m, p, args.kind)
        service, python, env = service_environment(m, args.manifest, args.permit)
        if args.command == "preflight":
            print('{"status":"passed","scope":"offline-preflight-only"}')
            return 0
        if not args.worker:
            # Fixed helper + fixed service interpreter only, never a generic exec.
            with subprocess.Popen(
                [
                    str(python),
                    str(Path(__file__).resolve()),
                    "run",
                    "--kind",
                    args.kind,
                    "--manifest",
                    str(Path(args.manifest).resolve()),
                    "--permit",
                    str(Path(args.permit).resolve()),
                    "--worker",
                ],
                cwd=service,
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            ) as process:
                try:
                    rc = process.wait(timeout=2 * m["timeout"] + 100)
                except (subprocess.TimeoutExpired, KeyboardInterrupt):
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait()
                    # Entire worker group is stopped. Journal survives; no PASS.
                    raise GuardError("worker-stopped-inspect-residual-manifest") from None
            print('{"status":"passed"}' if rc == 0 else '{"status":"failed","reason":"worker-failed-inspect-summary"}')
            return 0 if rc == 0 else 1
        directory = evidence_dir(m)
        # Fail before connecting if drivers/plugins cannot be imported.
        if m["kind"] == "pg":
            import asyncpg  # noqa: F401
        else:
            import nats  # noqa: F401
        if m["nodeIds"] != ["selftest"]:
            import pytest_asyncio  # noqa: F401
        require(
            not (directory / "resources.json").exists() and not (directory / "summary.json").exists(),
            "run-id-already-used",
        )
        # Atomic run reservation: concurrent invocation must not overwrite evidence.
        directory.mkdir(parents=True, exist_ok=False)
        try:
            asyncio.run(execute(m, p, args))
        except BaseException:
            save(
                directory / "summary.json",
                {
                    "version": 1,
                    "status": "failed",
                    "reason": "lifecycle-or-test-failed",
                    "fingerprint": fingerprint(m),
                },
            )
            raise
        save(
            directory / "summary.json",
            {
                "version": 1,
                "status": "passed",
                "fingerprint": fingerprint(m),
                "scope": "real-helper-selftest" if m["nodeIds"] == ["selftest"] else "service-acceptance",
            },
        )
        return 0
    except GuardError as error:
        print('{"status":"blocked","reason":"' + str(error) + '"}')
        return 2
    except (Exception, KeyboardInterrupt):
        # Exceptions from drivers/tests may contain credentials; do not print them.
        print('{"status":"failed","reason":"infra-operation-failed"}')
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
