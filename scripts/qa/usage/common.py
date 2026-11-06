"""Bounded offline input primitives. Diagnostics never interpolate input values."""
import hashlib
import json
import zipfile
import zlib
from pathlib import PurePosixPath

MAX_RECORD = 256 * 1024
MAX_FILE = 32 * 1024 * 1024
MAX_ARCHIVE = 128 * 1024 * 1024
MAX_MEMBERS = 256
MAX_RECORDS = 100000


class Invalid(ValueError):
    pass


def reject_constant(_):
    raise ValueError


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError
        result[key] = value
    return result


def records(stream):
    total = 0
    for number in range(1, MAX_RECORDS + 2):
        line = stream.readline(MAX_RECORD + 1)
        if not line:
            return
        total += len(line)
        if len(line) > MAX_RECORD or total > MAX_FILE or number > MAX_RECORDS:
            raise Invalid("input limit exceeded")
        if not line.strip():
            continue
        try:
            value = json.loads(line, parse_constant=reject_constant, object_pairs_hook=unique_object)
        except (ValueError, UnicodeError, RecursionError):
            raise Invalid(f"malformed record at line {number}") from None
        if not isinstance(value, dict):
            raise Invalid(f"record must be object at line {number}")
        yield number, value


def digest(stream):
    result = hashlib.sha256()
    size = 0
    while True:
        chunk = stream.read(65536)
        if not chunk:
            break
        size += len(chunk)
        if size > MAX_FILE:
            raise Invalid("input limit exceeded")
        result.update(chunk)
    stream.seek(0)
    return result.hexdigest()


def sources(paths):
    """Only explicitly named files; ZIP members are read, never extracted."""
    seen = set()
    for path in paths:
        try:
            with open(path, "rb") as raw:
                if zipfile.is_zipfile(raw):
                    if raw.seek(0, 2) > MAX_ARCHIVE:
                        raise Invalid("archive limit exceeded")
                    raw.seek(0)
                    with zipfile.ZipFile(raw) as archive:
                        members = archive.infolist()
                        if len(members) > MAX_MEMBERS:
                            raise Invalid("archive member limit exceeded")
                        size = 0
                        for member in members:
                            name = member.filename
                            parts = PurePosixPath(name).parts
                            if (name.startswith("/") or ".." in parts or "\\" in name
                                    or ":" in name or (member.external_attr >> 16) & 0o170000 == 0o120000):
                                raise Invalid("unsafe archive member")
                            if member.is_dir():
                                continue
                            if not name.endswith(".jsonl"):
                                raise Invalid("unsupported archive member")
                            size += member.file_size
                            if member.file_size > MAX_FILE or size > MAX_ARCHIVE:
                                raise Invalid("archive limit exceeded")
                            with archive.open(member) as stream:
                                identity = digest(stream)
                                if identity not in seen:
                                    seen.add(identity)
                                    yield identity, stream
                else:
                    raw.seek(0)
                    identity = digest(raw)
                    if identity not in seen:
                        seen.add(identity)
                        yield identity, raw
        except Invalid:
            raise
        except (OSError, ValueError, zipfile.BadZipFile, RuntimeError, NotImplementedError, EOFError, zlib.error):
            raise Invalid("cannot read explicit input") from None


def opaque(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()
