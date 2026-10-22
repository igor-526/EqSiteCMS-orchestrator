#!/usr/bin/env python3
"""One environment verification group; no format/lint/test target execution."""
import fnmatch
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tomllib

REPORT=Path('/srv/eqSiteCMS/docs/reports/document-yandex-services-baseline')
BASE=Path('/srv/eqSiteCMS/.qa/qg-format-document-yandex-services-baseline-v1')
REPO=BASE/'repo'
ORIGINAL=Path('/srv/eqSiteCMS')
M=json.loads((REPORT/'format-snapshot.json').read_text())
S=json.loads((REPORT/'format-prep-env-state.json').read_text())
ENV=S['environment']


def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()


def metadata():
    result={}
    for b in M['sealed']:
        label=b['label']; cwd=ORIGINAL if label=='root' else ORIGINAL/'services'/label
        rows={}
        for name,args in [('head',['rev-parse','HEAD']),('status',['status','--porcelain=v1','--untracked-files=all']),('tracked',['diff','--raw']),('staged',['diff','--cached','--raw'])]:
            p=subprocess.run(['git',*args],cwd=cwd,env=ENV,capture_output=True)
            assert p.returncode==0,(label,args,p.stderr.decode())
            rows[name]=p.stdout.decode()
        index=cwd/'.git/index'
        rows['index_sha256']=sha(index) if index.is_file() else None
        result[label]=rows
    result['allowed_overlay_hashes']={x['path']:sha(ORIGINAL/x['path']) for x in M['overlay']}
    return result


def before():
    path=REPORT/'format-prep-env-original-before.json'
    assert not path.exists()
    path.write_text(json.dumps(metadata(),indent=2,ensure_ascii=False)+'\n')
    print('original metadata recorded; after own baseline/report writes, before installs complete')


def allowed(n):
    return any(fnmatch.fnmatch(n,p) for p in M['generated_allowlist_before_run'])


def verify():
    result={'unit':'QG-FORMAT-PREP-ENV','root_commands':'NOT RUN','checks':{},'groups':{},'baselines':{},'generated':{},'failures':[]}
    def require(value,msg):
        if not value: result['failures'].append(msg)
        return bool(value)
    def command(name,cmd,cwd):
        p=subprocess.run(cmd,cwd=cwd,env=ENV,capture_output=True)
        out=REPORT/f'format-prep-env-verify-{name}.stdout';err=REPORT/f'format-prep-env-verify-{name}.stderr'
        assert not out.exists() and not err.exists()
        out.write_bytes(p.stdout);err.write_bytes(p.stderr)
        require(p.returncode==0, f'{name}: exit {p.returncode}')
        return dict(argv=cmd,cwd=str(cwd),exit=p.returncode,stdout=str(out),stderr=str(err)),p.stdout
    inputs=json.loads((REPORT/'format-prep-evidence.json').read_text())['dependency_inputs']
    result['dependency_inputs_after']={s:{n:sha(REPO/'services'/s/n) for n in files} for s,files in inputs.items()}
    result['checks']['locked_inputs_unchanged']=require(result['dependency_inputs_after']==inputs,'locked inputs changed')
    result['checks']['manifest_unchanged']=require(sha(REPORT/'format-snapshot.json')==S['manifest_sha256'],'frozen manifest changed')
    result['checks']['archives_unchanged']=require(all(sha(Path(x['path']))==x['sha256'] and Path(x['path']).stat().st_mode&0o777==0o444 for x in S['archives']),'archive changed')
    overlay={x['path']:x['sha256'] for x in M['overlay']}
    for item in M['sealed']:
        cwd=Path(item['export']);label=item['label']; hashes=item['file_hashes']| (overlay if label=='root' else {})
        require(all(sha(cwd/n)==h for n,h in hashes.items()),label+' approved bytes changed')
        records={}
        for n,cmd in [('head',['rev-parse','HEAD']),('status',['status','--porcelain=v1','--untracked-files=all']),('tracked',['diff','--raw']),('staged',['diff','--cached','--raw']),('index',['ls-files','--stage','-z'])]:
            rec,data=command(label+'-'+n,['git',*cmd],cwd)
            records[n]=rec
            if n=='head': require(data.decode().strip()==S['baseline'][label]['local_commit'],label+' HEAD changed')
            if n in ('tracked','staged'): require(not data,label+' '+n+' dirty')
            if n=='index': require(hashlib.sha256(data).hexdigest()==S['baseline'][label]['index_manifest_sha256'],label+' index changed')
            if n=='status':
                rows=data.decode().splitlines();require(all(x.startswith('?? ') and allowed(('' if label=='root' else 'services/'+label+'/')+x[3:]) for x in rows),label+' unexpected untracked status')
        result['baselines'][label]=S['baseline'][label]|{'verification_commands':records}
    # Enumerate generated metadata only; never follow symlinks into dependencies.
    ledger=[]; unexpected=[]
    expected=set()
    for item in M['sealed']:
        prefix='' if item['label']=='root' else 'services/'+item['label']+'/'
        expected.update(prefix+n for n in item['file_hashes'])
    expected.update(overlay)
    for d,dirs,files in os.walk(REPO,followlinks=False):
        dirs[:]=[n for n in dirs if n!='.git']
        for n in files:
            p=Path(d)/n;rel=p.relative_to(REPO).as_posix()
            if rel in expected: continue
            record={'path':rel,'type':'symlink' if p.is_symlink() else 'file','bytes':p.lstat().st_size}
            if p.is_symlink():
                record['link_target']=os.readlink(p)
                target=p.resolve()
                record['owned_or_pinned_interpreter']=target.is_relative_to(BASE) or (rel.startswith('services/') and '/.venv/bin/python' in rel and str(target).startswith('/usr/bin/python'))
                require(record['owned_or_pinned_interpreter'],rel+' external symlink')
            (ledger if allowed(rel) else unexpected).append(record)
        for n in dirs:
            p=Path(d)/n
            if p.is_symlink():
                rel=p.relative_to(REPO).as_posix();record={'path':rel,'type':'symlink-dir','link_target':os.readlink(p)}
                require(p.resolve().is_relative_to(BASE),rel+' external directory symlink')
                (ledger if allowed(rel+'/') else unexpected).append(record)
    result['generated']={'allowlist':M['generated_allowlist_before_run'],'file_count':len(ledger),'unexpected':unexpected,'ledger':'format-prep-env-generated.json'}
    (REPORT/'format-prep-env-generated.json').write_text(json.dumps(ledger,indent=2)+'\n')
    require(not unexpected,'unaccounted generated paths')
    for svc, ready in S['readiness'].items():
        group=dict(ready);cwd=REPO/'services'/svc
        require(ready['exit']==0,svc+' install not ready')
        if ready['exit']!=0:
            result['groups'][svc]=group; continue
        if svc=='frontend':
            # Validate each installed platform-applicable package and essential native loads, no tests.
            js="""const fs=require('fs'); const lock=require('./package-lock.json'); let checked=0, missing=[]; for(const [n,p] of Object.entries(lock.packages)){if(!n)continue; let f=n+'/package.json'; if(fs.existsSync(f)){let x=JSON.parse(fs.readFileSync(f,'utf8'));if(x.version!==p.version)throw Error(n+' version mismatch');checked++;}else if(!p.optional)missing.push(n);} if(missing.length)throw Error('missing: '+missing.join(',')); for(const n of ['eslint','typescript','vitest','next','@tailwindcss/oxide'])console.log(n,require.resolve(n)); require('@tailwindcss/oxide');require('sharp');console.log(JSON.stringify({checked,missing}));"""
            group['verification'],_=command(svc,['node','-e',js],cwd)
            group['lock_sha256']=sha(cwd/'package-lock.json')
        else:
            # importlib.metadata only: do not import service/settings or read env files.
            code="import importlib.metadata as m,json,sys; print(json.dumps({'python':sys.version,'executable':sys.executable,'packages':{d.metadata['Name'].lower().replace('_','-'):d.version for d in m.distributions()}},sort_keys=True))"
            group['verification'],data=command(svc,[str(cwd/'.venv/bin/python'),'-c',code],cwd)
            installed=json.loads(data)
            locked=tomllib.loads((cwd/'uv.lock').read_text())['package']
            # Locks may include alternative platform branches; every installed distribution must match a locked version.
            versions={}
            for x in locked: versions.setdefault(x['name'].lower().replace('_','-'),set()).add(x['version'])
            extra=[]
            for n,v in installed['packages'].items():
                if v not in versions.get(n,set()) and not (svc=='ya-metrica-service' and n=='setuptools' and v=='80.9.0'): extra.append([n,v])
            require(not extra,svc+' unlocked distributions '+str(extra))
            tools=['ruff','mypy','flake8','pytest']+(['basedpyright'] if svc in ('notification-service','email-service','vk-service') else [])
            require(all((cwd/'.venv/bin'/t).is_file() for t in tools),svc+' missing required tool')
            group['installed']=installed;group['unlocked_distributions']=extra;group['required_tools']=tools
            interpreter=(cwd/'.venv/bin/python').resolve()
            group['interpreter_artifact']={'path':str(interpreter),'sha256':sha(interpreter)}
            require(interpreter.is_relative_to(BASE/'python'),svc+' interpreter outside owned pinned installation')
        group['ready']=group['verification']['exit']==0
        result['groups'][svc]=group
    # Fixed tool artifacts and backend build closure hashes are evidence-local, never service edits.
    result['tool_artifacts']={}
    for name,cmd in [('uv',['uv','--version']),('node',['node','--version']),('npm',['npm','--version']),('make',['make','--version'])]:
        import shutil
        path=Path(shutil.which(cmd[0],path=ENV['PATH'])).resolve()
        rec,data=command('tool-'+name,cmd,BASE)
        result['tool_artifacts'][name]={'resolved_path':str(path),'sha256':sha(path),'version':data.decode().splitlines()[0], 'verification':rec}
    # Stable installed dist files pin the explicitly allowed build closure.
    build=cwd  # no source access
    adapter=REPO/'services/ya-metrica-service'
    result['build_closure_artifacts']={p.relative_to(adapter).as_posix():sha(p) for p in adapter.glob('.venv/lib/python*/site-packages/setuptools-80.9.0.dist-info/*') if p.is_file()}
    original_after=metadata();before_data=json.loads((REPORT/'format-prep-env-original-before.json').read_text())
    result['original_metadata_after']=original_after
    result['original_preservation']={'scope':'HEAD/index/tracked raw metadata and 18 allowed file hashes only; no unrelated byte/cache audit','own_writes':'new format-prep-env-* report/evidence files; format.md append and task.2 only if ready'}
    for label in S['baseline']:
        require(all(original_after[label][k]==before_data[label][k] for k in ('head','index_sha256','tracked','staged')),label+' original tracked/index metadata changed')
        if label!='root': require(original_after[label]['status']==before_data[label]['status'],label+' original status changed')
    require(original_after['allowed_overlay_hashes']==before_data['allowed_overlay_hashes'],'original allowed docs changed before own task update')
    result['controlled_process_amendment']={n:{'frozen_sha256':h,'current_original_sha256':original_after['allowed_overlay_hashes'][n]} for n,h in overlay.items() if h!=original_after['allowed_overlay_hashes'][n]}
    # Empty standalone TMPDIR is a sibling, distinct from the populated install TMPDIR.
    run_tmp=BASE/'tmp-format-run'
    run_tmp.mkdir(exist_ok=False)
    result['run_environment']=ENV|{'TMPDIR':str(run_tmp),'UV_NO_SYNC':'true','UV_FROZEN':'true','UV_PYTHON_DOWNLOADS':'never','npm_config_offline':'true','npm_config_yes':'false'}
    result['run_environment'].pop('UV_PROJECT_ENVIRONMENT',None)
    result['ready']=not result['failures'] and all(x.get('ready') for x in result['groups'].values())
    result['repair_attempts']=S['repair_attempts']
    target=REPORT/'format-prep-env-evidence.json';assert not target.exists()
    target.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({'ready':result['ready'],'failures':result['failures'],'generated_count':len(ledger),'groups':{k:v.get('ready',False) for k,v in result['groups'].items()}},ensure_ascii=False))
    sys.exit(0 if result['ready'] else 1)


{'before':before,'verify':verify}[sys.argv[1]]()
