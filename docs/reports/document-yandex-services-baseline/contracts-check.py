#!/usr/bin/env python3
"""QG-CONTRACTS: только документы и targeted link stat/line-count, без source audit."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path('/srv/eqSiteCMS')
CHANGE = ROOT / 'openspec/changes/document-yandex-services-baseline'
OUT = ROOT / 'docs/reports/document-yandex-services-baseline'
CAPS = ['yandex-oauth-accounts', 'yandex-metrica-gateway', 'ya-metrica-adapter',
        'yandex-service-runtime', 'yandex-services-access-evidence']
ARTIFACTS = [CHANGE / name for name in ['proposal.md', 'design.md', 'tasks.md']]
ARTIFACTS += [CHANGE / 'specs' / cap / 'spec.md' for cap in CAPS]
LINK = re.compile(r'\[[^\]\n]*\]\(\s*(?:<([^>]+)>|([^\s)]+))\s*\)')

def rel(path):
    return str(path.relative_to(ROOT))

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def headings(text):
    seen = {}
    result = set()
    for line in text.splitlines():
        match = re.match(r'^#{1,6}\s+(.+?)\s*#*$', line)
        if not match:
            continue
        title = re.sub(r'<[^>]+>', '', match[1]).replace('`', '')
        slug = re.sub(r'[^\w\- ]', '', title.lower()).replace(' ', '-')
        index = seen.get(slug, 0)
        seen[slug] = index + 1
        result.add(slug + (f'-{index}' if index else ''))
    return result

texts = {path: path.read_text() for path in ARTIFACTS}
errors = []
records = []
line_cache = {}
for artifact, text in texts.items():
    for number, line in enumerate(text.splitlines(), 1):
        for match in LINK.finditer(line):
            target = unquote(match[1] or match[2])
            parsed = urlsplit(target)
            if parsed.scheme or parsed.netloc:
                continue
            path = (artifact.parent / parsed.path).resolve() if parsed.path else artifact
            record = {'artifact': rel(artifact), 'line': number, 'target': target,
                      'resolved': str(path), 'status': 'PASS'}
            try:
                path.relative_to(ROOT)
                stat = path.stat()
                record['size_bytes'] = stat.st_size
                if parsed.fragment:
                    fragment = parsed.fragment
                    ranges = re.fullmatch(r'L(\d+)(?:-L?(\d+))?', fragment)
                    if ranges:
                        if path not in line_cache:
                            # Считаем строки только конкретного link target; содержимое не выводим/не анализируем.
                            with path.open('rb') as stream:
                                line_cache[path] = sum(1 for _ in stream)
                        start = int(ranges[1])
                        end = int(ranges[2] or ranges[1])
                        record['target_line_count'] = line_cache[path]
                        if not 1 <= start <= end <= line_cache[path]:
                            raise ValueError(f'line range {start}..{end} exceeds {line_cache[path]}')
                    elif path.suffix == '.md':
                        if fragment not in headings(path.read_text()):
                            raise ValueError(f'heading fragment not found: {fragment}')
                    else:
                        raise ValueError(f'unverified fragment: {fragment}')
            except (OSError, ValueError) as exc:
                record['status'] = 'FAIL'
                record['error'] = str(exc)
                errors.append(record)
            records.append(record)

prior = json.loads((OUT / 'doc-1-accept-evidence.json').read_text())
slices = []
for cap, expected in zip(CAPS, [21, 22, 17, 20, 20]):
    path = CHANGE / 'specs' / cap / 'spec.md'
    text = texts[path]
    scenarios = [{'line': i, 'title': line.removeprefix('#### Scenario: ')}
                 for i, line in enumerate(text.splitlines(), 1) if line.startswith('#### Scenario: ')]
    previous = next(item for item in prior['slices'] if item['capability'] == cap)
    accepted_unchanged = sha(path) == previous['sha256']
    manifest = f'[ {cap} ]'  # actual manifest check below is exact Markdown path
    proposal_link = f'specs/{cap}/spec.md'
    item = {'capability': cap, 'path': rel(path), 'sha256': sha(path),
            'requirements': len(re.findall(r'^### Requirement:', text, re.M)),
            'scenarios': scenarios, 'scenario_count': len(scenarios),
            'expected_scenario_count': expected, 'doc_1_sha256_match': accepted_unchanged,
            'proposal_manifest_match': proposal_link in texts[CHANGE / 'proposal.md']}
    if len(scenarios) != expected or not accepted_unchanged or not item['proposal_manifest_match']:
        errors.append({'coverage': cap, 'detail': item})
    slices.append(item)

access = texts[CHANGE / 'specs/yandex-services-access-evidence/spec.md']
rows = []
for i, line in enumerate(access.splitlines(), 1):
    if 26 <= i <= 46 and line.startswith('| '):
        cells = [cell.strip() for cell in line.strip('|').split('|')]
        assert len(cells) == 7, (i, cells)
        rows.append({'line': i, 'cells': cells})
route_rows = [row for row in rows if not row['cells'][0].startswith('R1')]
expanded = []
for row in route_rows:
    cells = row['cells']
    app = cells[0].split(' / ')[1]
    path = cells[2].strip('`')
    for method in re.findall(r'GET|HEAD|POST|DELETE|PATCH', cells[1]):
        expanded.append([app, method, path])
counts = {'app_qualified_paths': len({(app, path) for app, method, path in expanded}),
          'method_path': len(expanded), 'GET': sum(x[1] == 'GET' for x in expanded),
          'HEAD_inferred': sum(x[1] == 'HEAD' for x in expanded),
          'POST': sum(x[1] == 'POST' for x in expanded),
          'DELETE': sum(x[1] == 'DELETE' for x in expanded),
          'routing_rejection_rows': len(rows) - len(route_rows)}
assert counts == {'app_qualified_paths': 20, 'method_path': 28, 'GET': 16,
                  'HEAD_inferred': 8, 'POST': 2, 'DELETE': 2, 'routing_rejection_rows': 1}, counts
assert len(set(tuple(item) for item in expanded)) == 28
assert all(all(row['cells']) for row in rows)

# Семантический manifest E1..E10 сопоставляется с принятой OAuth трассировкой;
# исходники по этим ссылкам не перечитываются.
e_rows = [line for line in texts[CHANGE / 'proposal.md'].splitlines()
          if re.match(r'^\| E(?:[1-9]|10) \|', line)]
assert len(e_rows) == 10
cli = []
exe = '/srv/eqSiteCMS/.cache/openspec-tool/1.14.3/openspec-local'
for args in [['status', '--change', 'document-yandex-services-baseline', '--json'],
             ['validate', 'document-yandex-services-baseline', '--type', 'change', '--strict']]:
    completed = subprocess.run([exe] + args, cwd=ROOT, capture_output=True, text=True)
    cli.append({'argv': [exe] + args, 'exit_code': completed.returncode,
                'stdout': completed.stdout, 'stderr': completed.stderr})
    if completed.returncode:
        errors.append({'cli': args[0], 'exit_code': completed.returncode})
protected = ARTIFACTS + [ROOT / 'openspec/specs/yandex-peer-http-contract/spec.md',
                        ROOT / 'openspec/specs/yandex-client-failures/spec.md',
                        OUT / 'backfill.md', OUT / 'doc-1-accept-evidence.json']
result = {'unit': 'QG-CONTRACTS', 'group': ['DOC-ACCESS', 'DOC-SECURITY', 'DOC-LINKS', 'CLI'],
          'runtime': 'NOT RUN', 'production_ready': False, 'qg_approved': False,
          'artifacts': [{'path': rel(path), 'sha256': sha(path),
                         'local_link_count': sum(r['artifact'] == rel(path) for r in records)}
                        for path in ARTIFACTS],
          'capability_count': len(slices), 'scenario_count': sum(s['scenario_count'] for s in slices),
          'slices': slices, 'access': {'rows': rows, 'counts': counts, 'expanded': expanded},
          'proposal_E1_E10': e_rows,
          'links': {'count': len(records), 'errors': len([r for r in records if r['status'] == 'FAIL']),
                    'records': records}, 'cli': cli,
          'protected_sha256': {rel(path): sha(path) for path in protected},
          'errors': errors}
(OUT / 'contracts-evidence.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'artifacts': len(ARTIFACTS), 'capabilities': len(slices),
                  'scenarios': result['scenario_count'], 'links': result['links']['count'],
                  'link_errors': result['links']['errors'], 'access': counts,
                  'cli_exit_codes': [c['exit_code'] for c in cli], 'errors': len(errors)},
                 ensure_ascii=False, indent=2))
print('[exit code: %d]' % (1 if errors else 0))
sys.exit(1 if errors else 0)
