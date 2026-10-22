#!/usr/bin/python3
"""QG-FORMAT-RUN receipts only; no provisioning or source remediation."""
import os, sys, json, hashlib, subprocess, time, fnmatch, shutil
from pathlib import Path
R=Path('/srv/eqSiteCMS/docs/reports/document-yandex-services-baseline')
B=Path('/srv/eqSiteCMS/.qa/qg-format-document-yandex-services-baseline-v1')
P=B/'repo'
O=Path('/srv/eqSiteCMS')
F=json.loads((R/'format-prep-env-final.json').read_text())
M=json.loads((R/'format-snapshot.json').read_text())
E=F['run_environment']
L=R/'format-prep-env-run.sh'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def save(n,x):
 p=R/('format-run-'+n); assert not p.exists(),p
 if isinstance(x,bytes): p.write_bytes(x)
 else: p.write_text(json.dumps(x,indent=2,ensure_ascii=False)+'\n')
 return p.name
def git(cwd,args):
 p=subprocess.run(['git',*args],cwd=cwd,env=E,capture_output=True)
 assert p.returncode==0,(cwd,args,p.stderr)
 return p.stdout
def original():
 out={}
 for label in F['baselines']:
  cwd=O if label=='root' else O/'services'/label
  out[label]={n:git(cwd,args).decode() for n,args in [('head',['rev-parse','HEAD']),('status',['status','--porcelain=v1','--untracked-files=all']),('tracked',['diff','--raw']),('staged',['diff','--cached','--raw'])]}
  out[label]['index_sha256']=sha(cwd/'.git/index')
 out['overlay']={x['path']:sha(O/x['path']) for x in M['overlay']}
 return out
def snapshot(tag):
 out={'repositories':{},'generated':{},'source_drift':{},'locked_inputs_unchanged':True}
 expected=set()
 overlay={x['path']:x['sha256'] for x in M['overlay']}
 for item in M['sealed']:
  label=item['label']; cwd=Path(item['export']); prefix='' if label=='root' else 'services/'+label+'/'
  hashes=item['file_hashes']|(overlay if label=='root' else {})
  expected.update(prefix+n for n in hashes)
  out['source_drift'][label]=[{'path':n,'before':h,'after':sha(cwd/n) if (cwd/n).is_file() else None} for n,h in hashes.items() if not (cwd/n).is_file() or sha(cwd/n)!=h]
  rec={}
  for n,args in [('head',['rev-parse','HEAD']),('status',['status','--porcelain=v1','--untracked-files=all']),('tracked',['diff','--raw']),('staged',['diff','--cached','--raw']),('patch',['diff','--no-ext-diff','--no-textconv','--binary']),('staged-patch',['diff','--cached','--no-ext-diff','--no-textconv','--binary']),('index',['ls-files','--stage','-z'])]:
   data=git(cwd,args);rec[n]={'artifact':save(tag+'-'+label+'-'+n+'.log',data),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
   if n=='head': rec['head_unchanged']=data.decode().strip()==F['baselines'][label]['local_commit']
   if n=='index': rec['index_unchanged']=hashlib.sha256(data).hexdigest()==F['baselines'][label]['index_manifest_sha256']
  out['repositories'][label]=rec
 inputs=json.loads((R/'format-prep-evidence.json').read_text())['dependency_inputs']
 out['locked_inputs_unchanged']=all(sha(P/'services'/s/n)==h for s,files in inputs.items() for n,h in files.items())
 ledger=[];unexpected=[];external=[]
 for d,dirs,files in os.walk(P,followlinks=False):
  dirs[:]=[n for n in dirs if n!='.git']
  for n in files+[n for n in dirs if (Path(d)/n).is_symlink()]:
   p=Path(d)/n; rel=p.relative_to(P).as_posix()
   if rel in expected: continue
   st=p.lstat(); row={'path':rel,'type':'symlink' if p.is_symlink() else 'file','bytes':st.st_size,'mtime_ns':st.st_mtime_ns}
   if p.is_symlink():
    row['link_target']=os.readlink(p)
    if not p.resolve().is_relative_to(B): external.append(rel)
   if not any(fnmatch.fnmatch(rel+('/' if p.is_dir() and p.is_symlink() else ''),pat) for pat in F['generated']['allowlist']): unexpected.append(row)
   ledger.append(row)
 out['generated']={'count':len(ledger),'ledger':save(tag+'-generated.json',ledger),'unexpected':unexpected,'external_symlinks':external}
 out['immutable']={'manifest':sha(R/'format-snapshot.json')==F['evidence_files']['format-snapshot.json'],'archives':all(sha(Path(x['path']))==x['sha256'] and Path(x['path']).stat().st_mode&0o777==0o444 for x in json.loads((R/'format-prep-env-state.json').read_text())['archives'])}
 save(tag+'.json',out)
 print(json.dumps({'phase':tag,'source_drift':{k:len(v) for k,v in out['source_drift'].items()},'generated':len(ledger),'unexpected':len(unexpected),'external':len(external),'locked':out['locked_inputs_unchanged']}),flush=True)
 return out
def pre():
 h=json.loads((R/'format-prep-env-handoff.json').read_text())
 checks={'ready':F['environment_ready'],'installs':all(x['exit']==0 and x['ready'] for x in F['install_ledger'].values()),'launcher_hash':sha(L)==F['evidence_files']['format-prep-env-run.sh'],'manifest_hash':sha(R/'format-snapshot.json')==h['frozen_manifest_sha256'],'handoff_artifacts':all(sha(O/n)==v for n,v in h['new_owned_report_artifacts'].items()),'own_previous_writes':all(sha(O/x['path'])==x['sha256'] for x in h['own_original_writes']),'tmp_empty':not any((B/'tmp-format-run').iterdir())}
 probes={}
 for name in ['uv','node','npm','make']:
  p=subprocess.run(['sh',str(L),name,'--version'],capture_output=True)
  probes[name]={'exit':p.returncode,'stdout':p.stdout.decode(),'stderr':p.stderr.decode()}
  expected=json.loads((R/'format-prep-env-evidence.json').read_text())['tool_artifacts'][name]
  checks[name]=p.returncode==0 and p.stdout.decode().splitlines()[0]==expected['version'] and sha(Path(expected['resolved_path']))==expected['sha256']
 p=subprocess.run(['sh',str(L),'/usr/bin/env'],capture_output=True); actual=dict(x.split('=',1) for x in p.stdout.decode().splitlines())
 checks['env']=all(actual.get(k)==v for k,v in E.items()) and 'UV_PROJECT_ENVIRONMENT' not in actual
 save('ready.json',{'checks':checks,'probes':probes,'actual_environment':actual,'environment_exit':p.returncode,'inputs':{'handoff_sha256':sha(R/'format-prep-env-handoff.json'),'final_sha256':sha(R/'format-prep-env-final.json')}})
 assert all(checks.values()),checks
 save('original-before.json',original())
 s=snapshot('before')
 assert all(x['head_unchanged'] and x['index_unchanged'] and x['tracked']['bytes']==0 and x['staged']['bytes']==0 for x in s['repositories'].values())
 assert not any(s['source_drift'].values()) and not s['generated']['unexpected'] and not s['generated']['external_symlinks'] and all(s['immutable'].values()) and s['locked_inputs_unchanged']
def run(target):
 assert target in ('format','lint','test')
 start=time.time(); cmd=['sh',str(L),'make',target]
 a=R/('format-run-'+target+'.stdout'); b=R/('format-run-'+target+'.stderr'); assert not a.exists() and not b.exists()
 with a.open('wb') as stdout,b.open('wb') as stderr:
  p=subprocess.run(cmd,cwd=P,stdout=stdout,stderr=stderr)
 save(target+'-receipt.json',{'argv':cmd,'actual_command':['make',target],'cwd':str(P),'started_unix':start,'finished_unix':time.time(),'elapsed_seconds':time.time()-start,'exit':p.returncode,'stdout':a.name,'stdout_sha256':sha(a),'stderr':b.name,'stderr_sha256':sha(b),'launcher_sha256':sha(L),'environment':'format-run-ready.json'})
 print('make',target,'actual exit',p.returncode,flush=True)
 s=snapshot('after-'+target)
 assert not s['generated']['external_symlinks'] and all(x['head_unchanged'] and x['index_unchanged'] for x in s['repositories'].values()),'containment/baseline violation'
if __name__=='__main__':
 if sys.argv[1]=='pre': pre()
 elif sys.argv[1]=='original-final': save('original-final.json',original())
 else: run(sys.argv[1])
