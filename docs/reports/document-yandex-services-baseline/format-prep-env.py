#!/usr/bin/env python3
"""Bounded FORMAT environment preparation; never runs quality targets or exports."""
import hashlib
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import time

ORIGINAL = Path('/srv/eqSiteCMS')
REPORT = ORIGINAL / 'docs/reports/document-yandex-services-baseline'
BASE = ORIGINAL / '.qa/qg-format-document-yandex-services-baseline-v1'
REPO = BASE / 'repo'
STATE = REPORT / 'format-prep-env-state.json'
MANIFEST = json.loads((REPORT / 'format-snapshot.json').read_text())
INPUTS = json.loads((REPORT / 'format-prep-evidence.json').read_text())['dependency_inputs']
ENV = dict(os.environ)
assert ENV['HOME'] == str(BASE / 'home')
assert ENV['UV_CACHE_DIR'] == str(BASE / 'uv-cache')
ENV.update(GIT_CONFIG_NOSYSTEM='1', GIT_CONFIG_GLOBAL='/dev/null', GIT_TERMINAL_PROMPT='0',
           GIT_AUTHOR_NAME='FORMAT measurement', GIT_AUTHOR_EMAIL='format@invalid.local',
           GIT_COMMITTER_NAME='FORMAT measurement', GIT_COMMITTER_EMAIL='format@invalid.local',
           GIT_AUTHOR_DATE='2026-01-01T00:00:00Z', GIT_COMMITTER_DATE='2026-01-01T00:00:00Z',
           UV_PYTHON_INSTALL_DIR=str(BASE / 'python'), UV_PYTHON_BIN_DIR=str(BASE / 'python-bin'),
           PYTHONNOUSERSITE='1', PYTHON_KEYRING_BACKEND='keyring.backends.null.Keyring',
           PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD='1', SENTRYCLI_SKIP_DOWNLOAD='1')
ENV.pop('UV_PROJECT_ENVIRONMENT', None)


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def save(state):
    # Atomic replacement of own checkpoint, not an original source move.
    temp = STATE.with_suffix('.json.new')
    temp.write_text(json.dumps(state, indent=2, ensure_ascii=False) + '\n')
    assert temp.resolve() == REPORT / 'format-prep-env-state.json.new'
    assert STATE.resolve() == REPORT / 'format-prep-env-state.json'
    os.replace(temp, STATE)


def run(state, name, cmd, cwd, extra=None, stdin=None):
    out = REPORT / f'format-prep-env-{name}.stdout'
    err = REPORT / f'format-prep-env-{name}.stderr'
    assert not out.exists() and not err.exists(), name
    env = ENV | (extra or {})
    start = time.time()
    with out.open('wb') as o, err.open('wb') as e:
        proc = subprocess.run(cmd, cwd=cwd, env=env, input=stdin, stdout=o, stderr=e)
    rec = dict(name=name, argv=cmd, command=shlex.join(cmd), cwd=str(cwd),
               environment_overrides=extra or {}, exit=proc.returncode,
               elapsed_seconds=round(time.time()-start, 3), stdout=str(out), stderr=str(err))
    state.setdefault('commands', []).append(rec)
    save(state)
    print(name, 'exit', proc.returncode, flush=True)
    return rec, out.read_bytes()


def git(state, name, cwd, args, stdin=None):
    rec, data = run(state, name, ['git', '-c', 'core.hooksPath=/dev/null', '-c', 'core.autocrlf=false', *args], cwd, stdin=stdin)
    assert rec['exit'] == 0, rec
    return data


def check_inputs():
    return {svc: {n: digest(REPO/'services'/svc/n) for n in files} for svc, files in INPUTS.items()}


def initialize():
    assert not STATE.exists(), 'existing checkpoint: use resume-baseline after recorded setup failure'
    tmp = BASE/'tmp-run-prep-env'
    tmp.mkdir(exist_ok=False)
    ENV['TMPDIR'] = str(tmp)
    state = dict(unit='QG-FORMAT-PREP-ENV', status='preparing', repair_attempts=0,
                 environment=ENV, baseline={}, readiness={s: {'status':'not-installed','exit':None} for s in INPUTS},
                 root_commands='NOT RUN', manifest_sha256=digest(REPORT/'format-snapshot.json'),
                 generated_allowlist=MANIFEST['generated_allowlist_before_run'])
    save(state)
    archives = MANIFEST['sealed'] + [dict(tar=MANIFEST['overlay_archive']['path'], sha256=MANIFEST['overlay_archive']['sha256'])]
    state['archives'] = []
    for item in archives:
        p = Path(item['tar'])
        assert p.is_file() and not p.is_symlink() and p.stat().st_mode & 0o777 == 0o444
        assert digest(p) == item['sha256'], p
        state['archives'].append(dict(path=str(p),sha256=item['sha256'],mode='0444'))
    assert check_inputs() == INPUTS
    state['dependency_inputs_before'] = check_inputs()
    overlays = {x['path']:x['sha256'] for x in MANIFEST['overlay']}
    expected_all = set()
    for item in MANIFEST['sealed']:
        cwd = Path(item['export'])
        assert cwd == REPO or cwd.parent == REPO/'services'
        assert not (cwd/'.git').exists()
        hashes = item['file_hashes'].copy()
        if item['label'] == 'root': hashes.update(overlays)
        for n, h in hashes.items():
            p = cwd/n
            assert p.is_file() and not p.is_symlink() and digest(p) == h, str(p)
            expected_all.add(p.relative_to(REPO).as_posix())
    actual = set()
    for d, dirs, files in os.walk(REPO, followlinks=False):
        assert not any((Path(d)/n).is_symlink() for n in dirs)
        for n in files:
            p=Path(d)/n
            assert not p.is_symlink()
            actual.add(p.relative_to(REPO).as_posix())
    assert actual == expected_all, dict(extra=sorted(actual-expected_all), missing=sorted(expected_all-actual))
    state['verified_export_files'] = len(actual)
    finish_baseline(state)


def resume_baseline():
    state=json.loads(STATE.read_text()); ENV.update(state['environment'])
    assert state['baseline'] == {} and [x['name'] for x in state['commands']] == ['root-init']
    state['repair_attempts']=1
    state['setup_failure']='initialize exit 1: --template= leaves no .git/info; mkdir owned info directory'
    save(state)
    finish_baseline(state, resume_root=True)


def finish_baseline(state, resume_root=False):
    overlays = {x['path']:x['sha256'] for x in MANIFEST['overlay']}
    # Index only positive safe-path lists: no git add . and no original objects.
    for item in MANIFEST['sealed']:
        cwd = Path(item['export']); label=item['label']
        names = sorted(set(item['file_hashes']) | (set(overlays) if label=='root' else set()))
        if not (resume_root and label=='root'):
            git(state, f'{label}-init', cwd, ['init', '--template=', '--initial-branch=format-measurement', '.'])
        (cwd/'.git/info').mkdir(exist_ok=True)
        excludes=[]
        if label=='root':
            excludes=['/services/'+x['label']+'/' for x in MANIFEST['sealed'] if x['label']!='root']
            (cwd/'.git/info/exclude').write_text('\n'.join(excludes)+'\n')
        git(state, f'{label}-add', cwd, ['--literal-pathspecs','add','--force','--pathspec-from-file=-','--pathspec-file-nul'], b'\0'.join(n.encode() for n in names)+b'\0')
        indexed=git(state,f'{label}-index',cwd,['ls-files','--stage','-z'])
        actual_names=[x.split(b'\t',1)[1].decode() for x in indexed.split(b'\0') if x]
        assert actual_names == names
        tree=git(state,f'{label}-tree',cwd,['write-tree']).decode().strip()
        commit=git(state,f'{label}-commit-tree',cwd,['commit-tree',tree,'-m','Synthetic safe exported snapshot; diff measurement only']).decode().strip()
        git(state,f'{label}-head',cwd,['update-ref','HEAD',commit])
        status=git(state,f'{label}-initial-status',cwd,['status','--porcelain=v1','--untracked-files=all']).decode()
        tracked=git(state,f'{label}-initial-tracked',cwd,['diff','--raw']).decode()
        staged=git(state,f'{label}-initial-staged',cwd,['diff','--cached','--raw']).decode()
        assert not status and not tracked and not staged
        state['baseline'][label]=dict(cwd=str(cwd),exported_head=item['revision'],local_commit=commit,tree=tree,
             indexed_files=len(names),index_manifest_sha256=hashlib.sha256(indexed).hexdigest(),
             initial_status=status,initial_tracked_diff=tracked,initial_index_diff=staged,
             independently_accounted_nested_exclusions=excludes,
             excluded_paths_metadata_only=item.get('excluded_paths_metadata_only', []))
        save(state)
    state['baseline_ready']=True
    state['status']='baseline-ready'
    save(state)


def provision():
    state=json.loads(STATE.read_text()); ENV.update(state['environment'])
    assert state['baseline_ready'] and state['status']=='baseline-ready'
    for tool, cmd in [('uv',['uv','--version']),('node',['node','--version']),('npm',['npm','--version']),('make',['make','--version']),('git',['git','--version'])]:
        rec, _=run(state,tool+'-version',cmd,BASE); assert rec['exit']==0
    # Explicit pinned interpreter provisioning; downloads permitted only here.
    rec,_=run(state,'python-install',['uv','python','install','3.13.5','3.14.6','--no-bin'],BASE,{'UV_PYTHON_DOWNLOADS':'automatic'})
    if rec['exit']:
        state['status']='partial-python-tools';save(state);return
    for svc in ['backend','notification-service','email-service','vk-service','seo-service','yandex-service','ya-metrica-service','frontend']:
        cwd=REPO/'services'/svc
        if svc=='frontend':
            cmd=['npm','ci','--include=dev','--ignore-scripts','--no-audit','--no-fund','--offline=false']
            rec,_=run(state,'install-'+svc,cmd,cwd,{'npm_config_offline':'false'})
        else:
            # No unlocked build isolation. The only sdist closure gets pinned setuptools below.
            if svc=='ya-metrica-service':
                rec,_=run(state,'adapter-venv',['uv','venv','--python','3.14.6','.venv'],cwd)
                if rec['exit']: break
                rec,_=run(state,'adapter-setuptools',['uv','pip','install','--python',str(cwd/'.venv/bin/python'),'--only-binary',':all:','setuptools==80.9.0'],cwd)
                if rec['exit']: break
            cmd=['uv','sync','--frozen','--all-groups','--python','3.13.5' if svc=='backend' else '3.14.6','--no-build-isolation']
            if svc=='ya-metrica-service': cmd+=['--inexact']
            rec,_=run(state,'install-'+svc,cmd,cwd,{'UV_NO_SYNC':'false'})
        state['readiness'][svc]=dict(status='installed-unverified' if rec['exit']==0 else 'install-failed',exit=rec['exit'],command_name=rec['name'])
        save(state)
        if rec['exit']:
            state['status']='partial-install-failure'; save(state); return
    state['status']='installed-awaiting-verification';save(state)


if __name__=='__main__':
    {'initialize':initialize,'resume-baseline':resume_baseline,'provision':provision}[sys.argv[1]]()
