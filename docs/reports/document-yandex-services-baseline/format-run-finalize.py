#!/usr/bin/python3
"""Final read-only accounting; writes new owned evidence only."""
import runpy, json, os, hashlib
from pathlib import Path
X=runpy.run_path('/srv/eqSiteCMS/docs/reports/document-yandex-services-baseline/format-run-evidence.py')
R=X['R']; O=X['O']; B=X['B']; P=X['P']; save=X['save']; sha=X['sha']
phases=['before','after-format','after-lint','after-test']
result={'unit':'QG-FORMAT-RUN','lane_verdict':'BLOCKED','checks':{},'phases':{},'generated_deltas':{},'limitations':['Original preservation scoped to metadata and approved overlay hashes; no unrelated byte/cache audit.','Original VK physical index identity before PREP not established; logical staged/HEAD unchanged.']}
previous=None
for phase in phases:
 d=json.loads((R/f'format-run-{phase}.json').read_text())
 result['phases'][phase]={'source_drift':d['source_drift'],'generated':d['generated']['count'],'unexpected':d['generated']['unexpected'],'external_symlinks':d['generated']['external_symlinks'],'immutable':d['immutable'],'locked_inputs_unchanged':d['locked_inputs_unchanged']}
 result['checks'][phase]=not any(d['source_drift'].values()) and not d['generated']['unexpected'] and not d['generated']['external_symlinks'] and all(d['immutable'].values()) and d['locked_inputs_unchanged'] and all(v['head_unchanged'] and v['index_unchanged'] and not v['tracked']['bytes'] and not v['staged']['bytes'] and not v['patch']['bytes'] and not v['staged-patch']['bytes'] for v in d['repositories'].values())
 now={x['path']:x for x in json.loads((R/d['generated']['ledger']).read_text())}
 if previous is not None:
  result['generated_deltas'][phase]={'added':sorted(now.keys()-previous.keys()),'removed':sorted(previous.keys()-now.keys()),'metadata_changed':[k for k in sorted(now.keys()&previous.keys()) if now[k]!=previous[k]]}
 previous=now
short={}
for label,b in X['F']['baselines'].items():
 data=X['git'](Path(b['cwd']),['status','--short','--untracked-files=all'])
 short[label]={'artifact':save('final-'+label+'-short.log',data),'bytes':len(data)}
result['final_short_status']=short
before=json.loads((R/'format-run-original-before.json').read_text()); after=X['original']();save('original-final.json',after)
comparisons={}
for label in X['F']['baselines']:
 comparisons[label]={k:before[label][k]==after[label][k] for k in ['head','tracked','staged','index_sha256']}
 if label!='root': comparisons[label]['status']=before[label]['status']==after[label]['status']
result['original_comparison']=comparisons
result['checks']['original_metadata']=all(v for label,values in comparisons.items() for k,v in values.items() if not (label=='vk-service' and k=='index_sha256'))
result['vk_physical_index_during_run']=comparisons['vk-service']['index_sha256']
root_new=sorted(set(after['root']['status'].splitlines())-set(before['root']['status'].splitlines()))
root_removed=sorted(set(before['root']['status'].splitlines())-set(after['root']['status'].splitlines()))
result['original_root_status_delta']={'added':root_new,'removed':root_removed}
result['checks']['original_status_only_own_artifacts']=not root_removed and all(x.startswith('?? docs/reports/document-yandex-services-baseline/format-run-') for x in root_new)
tasks='openspec/changes/document-yandex-services-baseline/tasks.md'
ids=['QG-FORMAT.3','QG-FORMAT.4','QG-FORMAT.5','QG-FORMAT.6','QG-FORMAT.7','QG-FORMAT.V']
t=(O/tasks).read_text()
for n in ids:
 assert t.count('- [x] '+n+' ')==1,n
 t=t.replace('- [x] '+n+' ','- [ ] '+n+' ')
result['checks']['exact_six_task_edits']=hashlib.sha256(t.encode()).hexdigest()==before['overlay'][tasks]
result['checks']['other_approved_original_hashes']=all(after['overlay'][n]==h for n,h in before['overlay'].items() if n!=tasks)
report=R/'format.md'; marker=b'\n## QG-FORMAT-RUN '
prefix=report.read_bytes().split(marker)[0]
result['checks']['report_append_only']=hashlib.sha256(prefix).hexdigest()=='311f8daa7a408a7aba668ae59f41aff5a365d0a37e9ba443836b7729b690706d'
tmp=B/'tmp-format-run'; inventory=[]
for root,dirs,files in os.walk(tmp,followlinks=False):
 for name in files+[n for n in dirs if (Path(root)/n).is_symlink()]:
  p=Path(root)/name;s=p.lstat();row={'path':str(p.relative_to(tmp)),'bytes':s.st_size,'mtime_ns':s.st_mtime_ns,'type':'symlink' if p.is_symlink() else 'file'}
  if p.is_symlink(): row['target']=os.readlink(p)
  inventory.append(row)
result['owned_tmp']={'path':str(tmp),'initially_empty':True,'outside_exported_repo':not tmp.is_relative_to(P),'inside_original_ancestor':tmp.is_relative_to(O),'files':len(inventory),'inventory':save('tmp-generated.json',inventory),'contents_not_read':True}
result['receipts']={k:json.loads((R/f'format-run-{k}-receipt.json').read_text()) for k in ['format','lint','test']}
result['checks']['receipt_integrity']=all(sha(R/v[n])==v[n+'_sha256'] for v in result['receipts'].values() for n in ['stdout','stderr'])
result['accounting_success']=all(result['checks'].values())
save('accounting.json',result)
assert result['accounting_success'],result['checks']
artifacts={p.name:sha(p) for p in R.glob('format-run-*') if p.is_file()}
handoff={'unit':'QG-FORMAT-RUN','profile':'Quality Gate','status':'blocked','execution_complete':True,'lane_verdict':'BLOCKED','next_unit':'QG-SYNTH','actual_exits':{k:v['exit'] for k,v in result['receipts'].items()},'source_integrity':True,'accounting_success':True,'findings':['FORMAT-RUN-INFRA-01','FORMAT-RUN-TEST-02'],'findings_file':str(R/'format-run-findings.json'),'report':str(report),'marked_tasks':ids,'progress':'24/40','repairs_in_run':0,'prep_budget':'2/2 used','ownership_original_writes':{'report_append':{'path':str(report),'sha256':sha(report)},'six_checkboxes':{'path':str(O/tasks),'sha256':sha(O/tasks)},'new_artifacts':artifacts},'isolation':str(P),'launcher_unchanged':sha(X['L'])==X['F']['evidence_files']['format-prep-env-run.sh'],'limits':result['limitations']+['Downstream services not reached, no whole aggregation PASS.','No live auth / GoLive / PostgreSQL / provider runtime coverage inferred.'],'followup_owners':{'FORMAT-RUN-INFRA-01':'Quality Gate environment owner: bounded npm config launcher follow-up, no repair in RUN','FORMAT-RUN-TEST-02':'Backend test owner: two discovery tests, coordinate isolated TMP boundary; no source remediation in documentation baseline'},'remaining_inside_run':None,'no_actions':['delegation','source/config/lock fixes','new dependencies','exports','new Git baselines','reset/cleanup','Docker','sync/archive','task-finalize','commit/release']}
save('handoff.json',handoff)
print(json.dumps({'accounting_success':result['accounting_success'],'checks':result['checks'],'exits':handoff['actual_exits'],'status':handoff['status'],'tmp_files':len(inventory),'original_metadata':comparisons},ensure_ascii=False))
