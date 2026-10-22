# dsh-review-loop

Incremental diff reviewer for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

[中文](README.zh.md) · [MIT License](LICENSE)

`dsh-review-loop` turns code review of agent work into an incremental, closed-loop process: after you approve a batch of changes, a checkpoint is recorded and the next review shows only the changes made afterward — never a re-review of what you already saw. Review feedback is injected back to the agent through the harness's normal message channel, without interrupting its work.

## What it solves

An agent task commonly touches a dozen or more files. Reviewing the full diff every time is slow, and re-reviewing unchanged work wastes attention. This plugin makes review follow the agent's progress:

```
agent works (modifies files)
  -> open the review panel: only changes since the last review checkpoint
  -> inspect each file's diff, add feedback
  -> approve: a new checkpoint is recorded, feedback is injected to the agent
  -> the agent responds and keeps working; new changes become the next batch
```

## Features

- **Incremental review (since-review)**: approving snapshots the working tree into a checkpoint; the next review diffs `checkpoint -> current`, so reviewed files disappear from the queue unless they change again.
- **Two entry points**: a Web UI review panel docked above the conversation composer (2s polling), and a `/review` command for keyboard-first use. The same core logic backs both.
- **Feedback closed loop**: approvals may carry a comment, delivered to the agent as a user message via `agent.inject()`.
- **No tool-call parsing**: any on-disk change — by the agent, by you, or by another process — is reflected; the plugin reads git, not the agent loop.
- **Checkpoint persistence**: `$DSH_HOME/review-loop/<workspace-hash>.json`, written atomically, never polluting the workspace's own git status.
- **Zero core modifications**: a pure bundle plugin (`dsh.bundle` patch layer); the agent-loop skeleton is untouched.

## Installation

```sh
# one line, from a git source
dsh plugin --profile web add github:wuxiangru915/dsh-review-loop

# restart the web server, then hard-refresh the page
```

Local development:

```sh
# Development requires a sibling checkout of the DeepSeek Harness source
# repository at ../deepseek-harness: the @deepseek-ai/dsh-* packages are not
# fully published to npm (dsh-type-meta is missing), so devDependencies link
# to the workspace instead. Adjust the link paths in package.json if your
# checkout lives elsewhere.
pnpm install && pnpm build
dsh plugin --profile web add /path/to/dsh-review-loop
```

The repository ships prebuilt `lib/` artifacts, so git-source installs work without a build step on the user's machine.

## Usage

### Web UI

![Review panel (English)](assets/review-panel.en.png)

In any session whose workspace is a git repository, a review panel appears above the composer:

- A status line — `N file(s) to review` — with an **Open review** button.
- The expanded panel lists the pending files with toggleable, colorized diffs (added lines use the success token, removed lines the error token; the sign is always visible).
- An optional feedback input and an **Approve & checkpoint** button.
- After approval the panel shows the reviewed state; later edits re-surface the file.

### Command line

| Command | Behavior |
|---|---|
| `/review` | Incremental: changes since the last checkpoint (or the full change set vs HEAD when none exists) |
| `/review all` | The complete working-tree change set vs HEAD, ignoring the checkpoint |
| `/review approve` | Record a checkpoint |
| `/review approve <comment>` | Record a checkpoint and inject the comment into the agent |

## Architecture

```
src/
├── review.ts      Pure core (collectState / approve / renderState) — shared by command and HTTP paths
├── git.ts         git helpers (status / diff / hash-object; zero-dependency spawnSync)
├── checkpoint.ts  checkpoint persistence ($DSH_HOME/review-loop/<ws-hash>.json, atomic write)
├── http.ts        Web routes: GET /plugins/dsh-review-loop/state · POST /plugins/dsh-review-loop/approve
└── client/
    └── review-panel.tsx  Browser panel (conversation.input.dock slot, polling refresh)
```

```
command: /review ------> renderState() ----+
                                           +--> src/review.ts (pure, shared)
web UI:  GET /state ----> collectState() --+
         POST /approve --> approve() + agent.inject()
```

The client bundle is a CJS `__ModuleLoader__` artifact served at `/plugins/@dsh-plugin/dsh-review-loop/client.js`; routes and command share one checkpoint store, so approving from the UI advances the same queue the `/review` command reads.

### Incremental algorithm

```
for each working-tree change vs HEAD:
  compare its content hash with the checkpoint's recorded hash
    same  -> reviewed (hidden)
    changed / new / HEAD moved -> pending (the incremental queue)
approve re-snapshots the tree -> the checkpoint advances
```

## Testing

```sh
pnpm test       # 7 integration tests: real cordis + real git repositories
pnpm typecheck
pnpm build      # dual-half build: host ESM + client bundle
```

## Roadmap

- [x] `/review` command (incremental diff / approve / feedback injection)
- [x] Web UI review panel (file list + diff + approve)
- [x] Checkpoint persistence (incremental queue)
- [ ] Line-level comments (diff parser)
- [ ] Session-branch coupling (checkpoint follows session branches)
- [ ] npm publish (`@dsh-plugin/dsh-review-loop`)

## Requirements

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) >= 0.1.0-rc.5 (Cordis 4.x)
- A git repository (hard prerequisite)
- Node.js >= 22

## License

[MIT](LICENSE)
