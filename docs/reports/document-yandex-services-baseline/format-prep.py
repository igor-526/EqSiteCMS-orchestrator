#!/usr/bin/env python3
"""Safe QG-FORMAT PREP export. No commits, clones, installs or quality runs."""
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile

ROOT = Path('/srv/eqSiteCMS')
OUT = ROOT / 'docs/reports/document-yandex-services-baseline'
BASE = ROOT / '.qa/qg-format-document-yandex-services-baseline-v1'
RUN = BASE / 'repo'
SERVICES = ['backend', 'frontend', 'notification-service', 'email-service',
            'vk-service', 'seo-service', 'yandex-service', 'ya-metrica-service']
ENV = dict(os.environ, GIT_OPTIONAL_LOCKS='0')
ENV.pop('UV_PROJECT_ENVIRONMENT', None)

def cmd(args, cwd=ROOT):
    p = subprocess.run(args, cwd=cwd, env=ENV, capture_output=True)
    if p.returncode:
        raise RuntimeError((args, str(cwd), p.returncode, p.stderr.decode(errors='replace')))
    return p.stdout

def sha(data):
    return hashlib.sha256(data).hexdigest()

def forbidden(name):
    p = Path(name)
    assert not p.is_absolute() and '..' not in p.parts, name
    return (any(x in ('.venv', 'node_modules') for x in p.parts)
            or p.name == '.env'
            or (p.name.startswith('.env.') and p.name not in ('.env.example', '.env.sample', '.env.template'))
            or p.name in ('.credentials.yaml', '.openai-codex-auth.json', 'credentials.json'))

# Resume only the precisely known failed first attempt, before any export.
assert BASE.resolve() == Path('/srv/eqSiteCMS/.qa/qg-format-document-yandex-services-baseline-v1')
assert (OUT/'format-original-before.json').is_file()
assert not RUN.exists() and not list((BASE/'sealed').iterdir()), 'Do not repeat completed preparation'
original = json.loads((OUT/'format-original-before.json').read_text())
manifest = {'original': str(ROOT), 'isolation': str(RUN), 'sealed': [], 'overlay': [],
            'root_commands': {x: {'status': 'NOT RUN', 'exit': None} for x in ['make format', 'make lint', 'make test']},
            'generated_allowlist_before_run': ['services/*/.venv/**', 'services/frontend/node_modules/**',
                'services/*/.ruff_cache/**', 'services/*/.mypy_cache/**', 'services/*/.pytest_cache/**',
                '**/__pycache__/**', '**/*.pyc', '**/*.egg-info/**',
                'services/frontend/.next/**', 'services/frontend/next-env.d.ts',
                'services/frontend/tsconfig.tsbuildinfo'],
            'policy': 'Only HEAD tracked non-secret paths + explicit accepted docs. No original env/deps/symlinks/binds. No commits/clones/installs. Git-index baseline NOT PREPARED; FORMAT.2 remains pending.'}
for label, source, target in [('root', ROOT, RUN)] + [(s, ROOT/'services'/s, RUN/'services'/s) for s in SERVICES]:
    revision = cmd(['git', 'rev-parse', 'HEAD'], source).decode().strip()
    assert revision == original[label]['head'].strip(), label
    if label != 'root':
        assert cmd(['git', 'status', '--porcelain=v1', '--untracked-files=all'], source) == b''
    names = cmd(['git', 'ls-tree', '-r', '--name-only', revision], source).decode().splitlines()
    tree = cmd(['git', 'ls-tree', '-r', revision], source).decode()
    non_regular = {line.split('\t', 1)[1] for line in tree.splitlines()
                   if line.startswith(('120000 ', '160000 '))}
    excluded = [x for x in names if forbidden(x) or x in non_regular]
    safe = [x for x in names if not forbidden(x) and x not in non_regular]
    assert safe
    # Explicit positive path manifest excludes secret blobs before git archive reads data.
    archive = cmd(['git', 'archive', '--format=tar', revision, '--', *safe], source)
    sealed = BASE / 'sealed' / (label + '.tar')
    sealed.write_bytes(archive)
    sealed.chmod(0o444)
    hashes = {}
    with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
        for entry in tar.getmembers():
            assert not forbidden(entry.name), entry.name
            assert entry.isdir() or entry.isfile(), entry.name
            dest = target / entry.name
            if entry.isdir():
                dest.mkdir(parents=True, exist_ok=True)
            else:
                data = tar.extractfile(entry).read()
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(data)
                dest.chmod(entry.mode)
                hashes[entry.name] = sha(data)
    manifest['sealed'].append({'label': label, 'revision': revision, 'tar': str(sealed),
        'sha256': sha(archive), 'files': len(hashes), 'mode': '0444', 'export': str(target),
        'excluded_paths_metadata_only': excluded, 'file_hashes': hashes, 'git_status': 'NOT AVAILABLE: filesystem export, no .git'})
change = Path('openspec/changes/document-yandex-services-baseline')
allowed = [change / x for x in ['.openspec.yaml', 'proposal.md', 'design.md', 'tasks.md']]
allowed += [change/'specs'/cap/'spec.md' for cap in ['yandex-oauth-accounts', 'yandex-metrica-gateway',
               'ya-metrica-adapter', 'yandex-service-runtime', 'yandex-services-access-evidence']]
allowed += [Path('openspec/specs')/cap/'spec.md' for cap in ['yandex-peer-http-contract', 'yandex-client-failures']]
allowed += [Path('docs/reports/document-yandex-services-baseline')/name for name in ['backfill.md',
    'doc-1-prep-metadata.json', 'doc-1-accept-evidence.json', 'contracts.md', 'contracts-evidence.json',
    'contracts-final-evidence.json', 'contracts-check.py']]
accepted = json.loads((OUT/'contracts-evidence.json').read_text())
def prior_hashes(value):
    result = {}
    if isinstance(value, dict):
        if 'path' in value and 'sha256' in value:
            result[value['path']] = value['sha256']
        for item in value.values():
            result.update(prior_hashes(item))
    elif isinstance(value, list):
        for item in value:
            result.update(prior_hashes(item))
    return result
prior = prior_hashes(accepted)
for rel in allowed:
    src = ROOT / rel
    assert src.is_file() and not src.is_symlink(), str(rel)
    data = src.read_bytes()
    if str(rel).startswith(str(change/'specs')):
        assert prior[str(rel)] == sha(data), str(rel)
    dest = RUN / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    dest.chmod(src.stat().st_mode & 0o777)
    manifest['overlay'].append({'path': str(rel), 'sha256': sha(data), 'bytes': len(data)})
with tarfile.open(BASE/'sealed/approved-docs.tar', 'w') as tar:
    for rel in allowed:
        tar.add(RUN/rel, arcname=str(rel), recursive=False)
(BASE/'sealed/approved-docs.tar').chmod(0o444)
manifest['overlay_archive'] = {'path': str(BASE/'sealed/approved-docs.tar'),
    'sha256': sha((BASE/'sealed/approved-docs.tar').read_bytes())}
manifest['initial_file_manifest_verified'] = True
for item in manifest['sealed']:
    target = Path(item['export'])
    for name, expected in item['file_hashes'].items():
        assert sha((target/name).read_bytes()) == expected
manifest['clean_git_baseline_ready'] = False
manifest['dependency_state'] = {}
for svc in SERVICES:
    directory = RUN/'services'/svc
    filenames = ['package.json', 'package-lock.json'] if svc == 'frontend' else ['pyproject.toml', 'uv.lock', '.python-version']
    manifest['dependency_state'][svc] = {'environment_exists': False, 'inputs': {
        x: sha((directory/x).read_bytes()) for x in filenames if (directory/x).is_file()}}
(OUT/'format-snapshot.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'snapshot': str(RUN), 'base_archives': len(manifest['sealed']),
    'approved_documents': len(allowed), 'file_hashes_verified': True,
    'git_baseline_ready': False, 'dependencies_ready': False, 'root_commands': 'NOT RUN'}, indent=2))
