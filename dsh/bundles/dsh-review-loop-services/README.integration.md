# Local services integration (BE-INTEGRATION-2)

Source-only integration for `@local/dsh-review-loop-services`. Production artifacts remain unchanged until a later build/install unit; this unit neither installs nor restarts the Harness.

## Discovery and checkpoint ownership

The original request/command cwd is resolved to its enclosing canonical Git root. Optional root `services.manifest` contains `<name> <git_repo_url>` rows; only local `services/<name>` independent Git roots are inspected. No fetch, recursive repository scan, new configuration, or cross-repository Git writes. Missing manifest means root only. Canonical roots deduplicate aliases and key checkpoints. Each repository keeps its own HEAD baseline and Git ignore rules. Untracked directories enumerate actual files (`--untracked-files=all`), not directory placeholders. Approval saves each discovered valid repository once. Successful saves survive another repository's failure: this is not a transaction.

## Existing HTTP URLs, new JSON contract

- `GET /plugins/dsh-review-loop/state?workspace=<cwd>` (or `?session=<id>`): HTTP 200 `WorkspaceState`:
  `{workspace,repositories:[{id,label,workspace,state}|{id,label,workspace,error:{code,message}}],diagnostics:[{code,message}],totals:{repositories,failed,files,unreviewed},ok}`.
  Each `state` is the unchanged per-repository `ReviewState` (`workspace,head,checkpoint?,files,unreviewed`). There is **no top-level files array**. Totals count successful states; failed counts repository failures, not standalone diagnostics. `ok=false` means incomplete, never clean.
- `POST /plugins/dsh-review-loop/approve?workspace=<cwd>` (or `?session=<id>`), body `{comment?:string}`: HTTP 200
  `{workspace,repositories:[{id,label,workspace,checkpoint}|{id,label,workspace,error:{code,message}}],diagnostics:[{code,message}],ok,injectedAgents:string[],feedbackErrors:[{agentId,message}]}`.
  Partial approval is still HTTP 200 with `ok=false` and explicit success/error rows. No top-level checkpoint remains. Unexpected integration exceptions return HTTP 500 `{error:string}`; repository/store failures normally remain aggregate rows. Missing/unresolved workspace context returns 400 `{error:"workspace or session query parameter required"}`. Wrong method returns 405 `{error:"GET required"}` / `{error:"POST required"}` before side effects. Empty/malformed JSON or non-string comment retains existing no-comment behavior.

These are existing local Harness carrier routes, not EqSiteCMS public service endpoints. This unit does not add or change authentication, roles, or trust policy; existing carrier/profile access controls and same-cwd broadcast behavior remain the boundary. Mock-route tests do not establish deployed authentication behavior.

## Feedback

No comment means no injection. On complete approval only, HTTP sends `[review feedback] <comment>` once per live agent whose session cwd **exactly equals the original request cwd**, not the canonical aggregate root or any discovered service cwd. Session resolution preserves that original cwd (including child directories). `/review approve <comment>` retains its original command actor only. No caller override or new cross-session model is introduced.

If approval is incomplete, **all comment delivery is suppressed**, even when some checkpoints saved. A retry is explicit; failed repositories never receive invented checkpoints or reviewed flags. Injection exceptions do not discard checkpoint results: HTTP reports them in `feedbackErrors` and continues other matching agents; `ok` describes approval persistence, not feedback delivery. CLI reports injection failure with `kind:error`. Messages use the producer-specific `review-loop-feedback` source augmentation plus current public `ContextFormed`, `notice`, and bounded single-line summary; no shared catch-all `plugin` source.

## Command text

`/review` and `/review all` (also `--all`, `full`) begin:

```text
[review-loop] N repository(s), F failed, C changed file(s), U unreviewed file(s) — complete|incomplete
```

Discovery diagnostics use `ERROR [code]: message`; failed repository sections come before successful diff sections. Every section heading is `## <label> — <canonical repository workspace>` (failed discovery uses the attempted workspace). Successful sections reuse the existing per-repo renderer including clean/no-unreviewed branches and HEAD diff semantics. `all` passes `{all:true}` to every base collector. `kind` is `error` if incomplete, otherwise `success`.

Approval begins:

```text
[review-loop] S/N checkpoint(s) saved, F failed — complete|incomplete
## <label> — <workspace>
checkpoint saved (C file(s) reviewed at <HEAD first 7 characters>)
```

Failures replace the checkpoint line with `ERROR [code]: message`. Partial comment delivery says `Feedback not injected: approval incomplete; successful checkpoints were retained.` It never announces unqualified all-approved success. Output is bounded by `maxOutputChars`; truncation can omit later details, while the first line summarizes completeness/counts.

## Isolated verification

From this bundle directory, using Node 24:

```sh
node --experimental-transform-types --test tests/workspaces.test.mjs tests/integration.test.mjs
```

The test-only resolver maps production local `.js` imports to source `.ts`; real source modules execute with mock route/command/agent interfaces and real temporary Git repositories/checkpoint stores. No actual agents are spawned and no real workspace is approved. This is runtime TS transformation, **not** a full TypeScript typecheck or production build. The legacy Vitest command call now supplies the current submitted-attachments argument and uses a temporary checkpoint home; Vitest is not part of this Node verification group.
