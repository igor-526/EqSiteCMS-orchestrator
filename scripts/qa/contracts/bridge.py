"""Isolated adapter loader. stdout is exclusively the bounded JSON protocol."""
import contextlib
import importlib.util
import json
import os
from pathlib import Path
import sys


def main():
    module_path, callable_name, repo, phase = sys.argv[1:]
    # -I ignores PYTHONPATH/user site; each process sees only its service source.
    sys.path[:0] = [str(Path(repo) / "src"), repo]
    os.environ["EQCMS_MONOREPO"] = "1"
    os.environ["EQCMS_WIRE_PHASE"] = phase
    request = json.loads(sys.stdin.buffer.read(1048577))
    with open(os.devnull, "w") as sink, contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
        spec = importlib.util.spec_from_file_location("eqcms_wire_adapter", module_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        result = getattr(module, callable_name)(request)
    sys.stdout.write(json.dumps(result, allow_nan=False, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except BaseException:
        # Includes pytest.skip/SystemExit: neither is acceptance success.
        sys.stdout.write('{"status":"failed"}')
        sys.exit(1)
