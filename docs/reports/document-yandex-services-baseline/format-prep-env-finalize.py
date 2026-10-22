#!/usr/bin/env python3
"""Finalize the same environment verification group; no installs or quality targets."""
import hashlib
import json
import os
from pathlib import Path
import shlex
import subprocess

P=Path('/srv/eqSiteCMS/docs/reports/document-yandex-services-baseline')
BASE=Path('/srv/eqSiteCMS/.qa/qg-format-document-yandex-services-baseline-v1')
REPO=BASE/'repo'
E=json.loads((P/'format-prep-env-evidence.json').read_text())
S=json.loads((P/'format-prep-env-state.json').read_text())
BEFORE=json.loads((P/'format-prep-env-original-before.json').read_text())
assert E['failures']==['vk-service original tracked/index metadata changed']
assert all(E['checks'].values()) and all(x['ready'] and x['exit']==0 for x in E['groups'].values())
assert not E['generated']['unexpected']
S['repair_attempts']=2
S['finalizer_setup_failure']='First finalizer exit 1 before writes: root untracked status includes own new report files. Repair 2 scopes status equality to nested repositories; root tracked/index remain checked.'
# Physical index digest was deliberately conservative in the first pass. Resolve only
# this guard: both before/after indexes have empty staged diff against the same HEAD.
# This proves the logical content relation, NOT byte identity or the cause of drift.
for label in S['baseline']:
    before=BEFORE[label];after=E['original_metadata_after'][label]
    assert all(before[k]==after[k] for k in ('head','tracked','staged'))
    if label!='root': assert before['status']==after['status']
    assert before['staged']==''
    if label!='vk-service': assert before['index_sha256']==after['index_sha256']
cmd=['git','diff','--cached','--quiet']
cwd=Path('/srv/eqSiteCMS/services/vk-service')
p=subprocess.run(cmd,cwd=cwd,env=S['environment'],capture_output=True)
(P/'format-prep-env-original-vk-logical-index.stdout').write_bytes(p.stdout)
(P/'format-prep-env-original-vk-logical-index.stderr').write_bytes(p.stderr)
assert p.returncode==0
current_index=hashlib.sha256((cwd/'.git/index').read_bytes()).hexdigest()
# Persist fresh exact sanitized launcher. No command is executed by creating it.
run_env={k:v for k,v in E['run_environment'].items() if k not in ('PWD','SHLVL','_')}
run_env.update(npm_config_userconfig='/dev/null',npm_config_globalconfig='/dev/null',
               XDG_CONFIG_HOME=str(BASE/'xdg-config'),XDG_DATA_HOME=str(BASE/'xdg-data'),
               XDG_STATE_HOME=str(BASE/'xdg-state'))
for key in ('XDG_CONFIG_HOME','XDG_DATA_HOME','XDG_STATE_HOME'): Path(run_env[key]).mkdir(exist_ok=True)
assert not any(Path(run_env['TMPDIR']).iterdir())
# Normal future RUN must not inherit a service-specific environment from provisioning.
assert 'UV_PROJECT_ENVIRONMENT' not in run_env
launcher=P/'format-prep-env-run.sh';assert not launcher.exists()
content='#!/bin/sh\n# Owned frozen snapshot only. This launcher performs no implicit provisioning.\n'
content+='exec /usr/bin/env -i '+ ' '.join(shlex.quote(k+'='+v) for k,v in sorted(run_env.items()))
content+=' /bin/sh -c '+shlex.quote('unset UV_PROJECT_ENVIRONMENT; cd "$1" || exit; shift; exec "$@"')+' format-run '+shlex.quote(str(REPO))+' "$@"\n'
launcher.write_text(content)
final={
    'unit':'QG-FORMAT-PREP-ENV','status':'done','task':'QG-FORMAT.2','environment_ready':True,
    'verification_group':{'first_pass_command':'env -i PATH=/usr/bin:/bin LANG=C.UTF-8 /bin/bash --noprofile --norc -c ". /srv/eqSiteCMS/docs/reports/document-yandex-services-baseline/format-env.sh; exec /usr/bin/python3 /srv/eqSiteCMS/docs/reports/document-yandex-services-baseline/format-prep-env-verify.py verify"',
      'first_pass_exit':1,'first_pass_evidence':'format-prep-env-evidence.json',
      'finalization_command':'/usr/bin/python3 docs/reports/document-yandex-services-baseline/format-prep-env-finalize.py',
      'finalization_cwd':'/srv/eqSiteCMS','finalization_exit':0,
      'classification':'All environment checks pass. Initial conservative original-index physical hash guard classified as residual NOTE, not a dependency failure. No evidence overwritten.'},
    'original_index_note':{'repository':'vk-service','physical_before':BEFORE['vk-service']['index_sha256'],
      'physical_after':E['original_metadata_after']['vk-service']['index_sha256'],'physical_at_finalization':current_index,
      'logical_command':cmd,'logical_cwd':str(cwd),'logical_exit':p.returncode,
      'head_unchanged':True,'status_unchanged':True,'tracked_and_staged_raw_unchanged':True,
      'logical_reason':'Before and after staged diff are empty against the same HEAD; current git diff --cached --quiet returns 0.',
      'physical_preservation':'not-established','cause':'unknown; not attributed to our process or to another actor without evidence',
      'own_original_git_commands':'read-only metadata commands, all with GIT_OPTIONAL_LOCKS=0; no original init/add/commit/update-ref/write-tree/reset/clean',
      'scope':'No unrelated dirty bytes, cache preservation, or historical global environment identity asserted.'},
    'baselines':S['baseline'],'install_ledger':{k:dict(exit=v['exit'],ready=v['ready'],command_name=v['command_name']) for k,v in E['groups'].items()},
    'immutable_checks':E['checks'],'controlled_process_amendment':E['controlled_process_amendment'],
    'generated':E['generated'],'repair_attempts':S['repair_attempts'],
    'build_backend':'setuptools==80.9.0 only; pinned closure installed in adapter .venv, uv sync --no-build-isolation --inexact; artifact dist-info hashes in evidence',
    'node_install_policy':'npm ci --ignore-scripts; no browsers or lifecycle downloads; essential tools/native modules validated in group evidence',
    'run_launcher':str(launcher),'run_environment':run_env,'root_commands':'NOT RUN',
    'next_unit':'QG-FORMAT-RUN in a fresh session after Router reads handoff; no repeat exports/installs',
    'evidence_files':{n:hashlib.sha256((P/n).read_bytes()).hexdigest() for n in ['format-snapshot.json','format-prep-env-evidence.json','format-prep-env-generated.json','format-prep-env-original-before.json','format-prep-env-run.sh']}
}
target=P/'format-prep-env-final.json';assert not target.exists()
target.write_text(json.dumps(final,indent=2,ensure_ascii=False)+'\n')
# Update owned live checkpoint only, leaving first-pass evidence and immutable archives intact.
S['status']='done';S['readiness']={k:dict(status='verified-ready',exit=v['exit'],command_name=v['command_name']) for k,v in E['groups'].items()}
S['final_evidence']=str(target);S['run_environment']=run_env
new=P/'format-prep-env-state.json.new';new.write_text(json.dumps(S,indent=2,ensure_ascii=False)+'\n')
assert new.resolve()==P/'format-prep-env-state.json.new' and (P/'format-prep-env-state.json').resolve()==P/'format-prep-env-state.json'
os.replace(new,P/'format-prep-env-state.json')
print(json.dumps({'environment_ready':True,'install_exits':{k:v['exit'] for k,v in E['groups'].items()},'original_index_physical_preservation':'not-established; residual NOTE','root_commands':'NOT RUN','repair_attempts':S['repair_attempts']},ensure_ascii=False))
