"""Bounded real adapters and lifecycle; imports drivers only after offline guard."""

import asyncio
import json
from contextlib import asynccontextmanager

from .contracts import GuardError, evidence_dir, fingerprint, require, validate


def save(path, data):
    # Safe fields only. Atomic replacement leaves the last complete journal on crash.
    temp = path.with_suffix(".new")
    temp.write_text(json.dumps(data, sort_keys=True, indent=2) + "\n")
    temp.replace(path)


class Postgres:
    def __init__(self, m, raw):
        self.m, self.raw, self.connection = m, raw, None

    async def connect(self):
        import asyncpg

        self.connection = await asyncpg.connect(self.raw, timeout=5, command_timeout=5)
        flags = await self.connection.fetchrow(
            "SELECT rolsuper, rolcreatedb, rolcreaterole, rolbypassrls FROM pg_roles WHERE rolname=current_user"
        )
        require(flags is not None and not any(flags.values()), "privileged-test-role")
        unsafe = await self.connection.fetchval(
            "SELECT count(*) FROM pg_database WHERE NOT datistemplate AND right(datname,5) <> '_test' "
            "AND has_database_privilege(current_user, oid, 'CONNECT')"
        )
        require(unsafe == 0, "test-role-can-connect-nontest-database")
        require(
            await self.connection.fetchval("SELECT current_database()") == self.m["target"]["database"],
            "database-mismatch",
        )

    async def create(self):
        schema = self.m["resource"]["schema"]
        # CREATE without IF NOT EXISTS: a collision must fail, never adopt existing.
        await self.connection.execute(f'CREATE SCHEMA "{schema}"')

    async def probe(self):
        schema = self.m["resource"]["schema"]
        await self.connection.execute(f'SET search_path TO "{schema}"')
        require(await self.connection.fetchval("SELECT current_schema()") == schema, "search-path-mismatch")
        require(await self.connection.fetchval("SHOW search_path") == schema, "public-fallback")

    async def delete(self):
        schema = self.m["resource"]["schema"]
        owner = await self.connection.fetchval(
            "SELECT pg_get_userbyid(nspowner)=current_user FROM pg_namespace WHERE nspname=$1", schema
        )
        require(owner is True, "schema-ownership-lost")
        await self.connection.execute(f'DROP SCHEMA "{schema}" CASCADE')

    async def close(self):
        if self.connection:
            await self.connection.close(timeout=3)


class Nats:
    def __init__(self, m, raw):
        self.m, self.raw, self.connection = m, raw, None

    async def connect(self):
        import nats

        self.connection = await nats.connect(
            servers=[self.raw],
            connect_timeout=5,
            allow_reconnect=False,
            max_reconnect_attempts=0,
            error_cb=self.ignore_error,
        )
        self.js = self.connection.jetstream(timeout=5)
        await self.js.account_info()

    async def ignore_error(self, _error):
        # Never allow a driver callback to export a credential-bearing URL.
        return None

    async def create(self):
        from nats.js.api import StreamConfig
        from nats.js.errors import NotFoundError

        r = self.m["resource"]
        try:
            await self.js.stream_info(r["stream"])
        except NotFoundError:
            pass
        else:
            raise GuardError("stream-already-exists")
        await self.js.add_stream(
            config=StreamConfig(
                name=r["stream"],
                subjects=[r["subject"] + ".>"],
                description=fingerprint(self.m),
                max_age=300,
            )
        )
        await self.check_owner()
        # Stream is confirmed owned before child consumer setup: partial failure
        # is cleaned by lifecycle, not by wildcard consumer enumeration.

    async def probe(self):
        from nats.js.api import ConsumerConfig

        r = self.m["resource"]
        await self.js.add_consumer(
            r["stream"],
            config=ConsumerConfig(
                durable_name=r["durable"],
                filter_subject=r["subject"] + ".probe",
            ),
        )
        info = await self.check_owner()
        self.before = info.config.as_dict()
        await self.js.publish(r["subject"] + ".probe", b"qa-infra-selftest")
        after = (await self.check_owner()).config.as_dict()
        require(self.before == after, "unexpected-topology-change")
        self.snapshots = {
            phase: {key: config.get(key) for key in ("name", "subjects", "max_age", "discard", "retention", "storage")}
            for phase, config in (("before", self.before), ("after", after))
        }

    async def check_owner(self):
        r = self.m["resource"]
        info = await self.js.stream_info(r["stream"])
        require(info.config.description == fingerprint(self.m), "stream-ownership-lost")
        require(info.config.subjects == [r["subject"] + ".>"], "stream-subjects-changed")
        return info

    async def delete(self):
        await self.check_owner()
        await self.js.delete_stream(self.m["resource"]["stream"])

    async def close(self):
        if self.connection:
            await self.connection.close()


@asynccontextmanager
async def owned(manifest, permit, *, adapter_factory=None, directory=None):
    """Create exactly one owned root; always cleanup confirmed creates in finally.

    An uncertain CREATE is NOT adopted/deleted. Journal records residual/uncertain
    for operator reconciliation under the same target/resource permit.
    """
    m = manifest
    raw = validate(m, permit, m["kind"])
    directory = directory or evidence_dir(m)
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / "resources.json"
    require(not path.exists(), "run-id-already-used")
    journal = {
        "version": 1,
        "fingerprint": fingerprint(m),
        "runId": m["runId"],
        "targetId": m["target"]["id"],
        "kind": m["kind"],
        "resource": m["resource"],
        "state": "connecting",
        "confirmed": False,
        "cleanup": "pending",
    }
    try:
        with path.open("x") as initial:
            initial.write(json.dumps(journal, sort_keys=True, indent=2) + "\n")
    except FileExistsError:
        raise GuardError("run-id-already-used") from None
    adapter = None
    confirmed = False
    failed = False
    try:
        adapter = (adapter_factory or (Postgres if m["kind"] == "pg" else Nats))(m, raw)
        await asyncio.wait_for(adapter.connect(), 10)
        validate(m, permit, m["kind"])  # expiry still valid immediately before mutation
        journal["state"] = "creating-uncertain"
        save(path, journal)
        await asyncio.wait_for(adapter.create(), 10)
        confirmed = True
        journal.update(state="owned", confirmed=True)
        save(path, journal)
        validate(m, permit, m["kind"])
        await asyncio.wait_for(adapter.probe(), 10)
        if hasattr(adapter, "snapshots"):
            journal["topology"] = adapter.snapshots
            save(path, journal)
        yield adapter
    except BaseException:
        failed = True
        raise
    finally:
        cleanup_failed = False
        if adapter is not None:
            if confirmed:
                try:
                    validate(m, permit, m["kind"])  # expired permit cannot authorize teardown
                    await asyncio.wait_for(adapter.delete(), m["cleanupTimeout"])
                    journal.update(state="removed", cleanup="passed")
                except BaseException:
                    journal.update(state="residual", cleanup="failed")
                    cleanup_failed = True
            elif journal["state"] == "creating-uncertain":
                journal.update(state="residual-uncertain", cleanup="blocked")
            else:
                journal.update(state="not-created", cleanup="not-needed")
            try:
                await asyncio.wait_for(adapter.close(), m["cleanupTimeout"])
            except BaseException:
                cleanup_failed = True
                journal["close"] = "failed"
        save(path, journal)
        if cleanup_failed and not failed:
            raise GuardError("cleanup-failed-see-residual-manifest")
