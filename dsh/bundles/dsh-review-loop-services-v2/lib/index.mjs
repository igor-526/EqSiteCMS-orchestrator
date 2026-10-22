import { dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { boundContextSummary, createUserMessage } from "@deepseek-ai/dsh-llm";
//#region src/checkpoint.ts
/**
* Checkpoint persistence for dsh-review-loop.
*
* A checkpoint records "this is what the reviewer has seen": the HEAD sha at
* review time plus a content hash per changed file. The next incremental
* review compares the current working tree against it — unchanged files are
* considered reviewed, changed or new files surface again.
*
* Stored under $DSH_HOME/review-loop/<sha1(workspace)>.json so checkpoints
* never pollute the workspace's own git status.
*/
/** Workspace identity for the checkpoint filename — stable across machines per absolute path. */
function checkpointFile(dshHome, workspace) {
	return join(dshHome, "review-loop", `${createHash("sha1").update(workspace).digest("hex").slice(0, 16)}.json`);
}
/** Filesystem-backed store. Zero dependencies; atomic via tmp+rename. */
function fileStore(dshHome) {
	return {
		load(workspace) {
			const file = checkpointFile(dshHome, workspace);
			if (!existsSync(file)) return void 0;
			try {
				return JSON.parse(readFileSync(file, "utf8"));
			} catch {
				return;
			}
		},
		save(workspace, checkpoint) {
			const file = checkpointFile(dshHome, workspace);
			mkdirSync(dirname(file), { recursive: true });
			const tmp = `${file}.tmp`;
			writeFileSync(tmp, JSON.stringify(checkpoint, null, 2));
			renameSync(tmp, file);
		}
	};
}
//#endregion
//#region src/git.ts
/**
* Thin git helpers for dsh-review-loop. Pure spawnSync, no external deps.
* All operations are read-only except `hashObject` (git hash-object is
* content-addressed and writes nothing without `-w`).
*/
var GitError = class extends Error {
	args;
	stderr;
	constructor(args, stderr) {
		super(`git ${args.join(" ")} failed: ${stderr.trim()}`);
		this.args = args;
		this.stderr = stderr;
	}
};
function run(cwd, ...args) {
	const r = spawnSync("git", args, {
		cwd,
		encoding: "utf8"
	});
	if (r.status !== 0) throw new GitError(args, r.stderr || "");
	return (r.stdout || "").replace(/\n+$/, "");
}
/** Parse `git status --porcelain` into changed files (supports both v1 and v2 output shapes). */
function status(cwd) {
	const out = run(cwd, "status", "--porcelain", "--untracked-files=all");
	if (!out) return [];
	return out.split("\n").map((line) => ({
		status: line.slice(0, 2),
		path: line.slice(3).replace(/^"|"$/g, "")
	}));
}
/** The current HEAD sha, or empty string in a repo without commits. */
function head(cwd) {
	try {
		return run(cwd, "rev-parse", "HEAD");
	} catch {
		return "";
	}
}
/** Untracked files are invisible to `git diff HEAD`; this lists them. */
function isUntracked(f) {
	return f.status.includes("?");
}
/** Deleted files carry no content; diff shows the removal via `git diff HEAD`. */
function isDeleted(f) {
	return f.status.startsWith("D") || f.status.endsWith("D");
}
/** Content hash of one path (tracked or untracked, no -w so nothing is written). */
function fileHash(cwd, path) {
	try {
		return run(cwd, "hash-object", path);
	} catch {
		return "missing";
	}
}
/** Unified diff of one file against HEAD (covers staged + unstaged). */
function diffHead(cwd, path, maxLines = 300) {
	const out = run(cwd, "diff", "HEAD", "--", path);
	if (!out) return "";
	const lines = out.split("\n");
	return lines.length > maxLines ? [...lines.slice(0, maxLines), `… (${lines.length - maxLines} more lines)`].join("\n") : out;
}
/** Preview of an untracked file (git cannot diff it against HEAD). */
function untrackedPreview(cwd, path, maxLines = 50) {
	try {
		const lines = readFileSync(joinPath(cwd, path), "utf8").split("\n");
		return `+++ ${path} (new file)\n${(lines.length > maxLines ? [...lines.slice(0, maxLines), `… (${lines.length - maxLines} more lines)`] : lines).join("\n")}`;
	} catch {
		return `+++ ${path} (new file, unreadable)`;
	}
}
/** Tiny path join without importing node:path at module scope. */
function joinPath(dir, path) {
	return `${dir.replace(/\/+$/, "")}/${path}`;
}
//#endregion
//#region src/review.ts
/**
* Core review-loop logic, shared by the /review command and the webServer
* HTTP routes. Pure functions over git + checkpoint store — no cordis
* dependencies, so the same code powers the CLI command, the UI routes,
* and the integration tests.
*/
/** Files that differ from HEAD right now, annotated against the checkpoint. */
function collectState(cwd, store, options = {}) {
	const checkpoint = options.all ? void 0 : store.load(cwd);
	const head$1 = head(cwd);
	const changed = status(cwd);
	const reviewed = /* @__PURE__ */ new Set();
	if (checkpoint !== void 0 && checkpoint.head === head$1) for (const f of changed) {
		const seen = checkpoint.files[f.path];
		if (seen === void 0) continue;
		if (seen === "deleted") {
			if (isDeleted(f)) reviewed.add(f.path);
			continue;
		}
		if (seen === fileHash(cwd, f.path)) reviewed.add(f.path);
	}
	const files = changed.map((f) => {
		const isNew = isUntracked(f);
		const isDel = isDeleted(f);
		const diff = isNew ? untrackedPreview(cwd, f.path) : isDel || reviewed.has(f.path) ? "" : diffHead(cwd, f.path);
		return {
			path: f.path,
			status: f.status,
			reviewed: reviewed.has(f.path),
			newFile: isNew,
			deleted: isDel,
			diff
		};
	});
	return {
		workspace: cwd,
		head: head$1,
		checkpoint,
		files,
		unreviewed: files.filter((f) => !f.reviewed)
	};
}
/** Build a checkpoint snapshot of the current working tree. */
function snapshot(cwd, files) {
	const out = {};
	for (const f of files) out[f.path] = isDeleted(f) ? "deleted" : fileHash(cwd, f.path);
	return out;
}
/** Record a review: checkpoint + optional comment text. */
function approve(cwd, store, comment) {
	const files = status(cwd);
	const checkpoint = {
		head: head(cwd),
		files: snapshot(cwd, files),
		reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
	store.save(cwd, checkpoint);
	return checkpoint;
}
/** Render a ReviewState into human-readable markdown (the /review command reply). */
function renderState(state, maxChars = 6e3) {
	const files = state.unreviewed;
	if (files.length === 0) return state.checkpoint !== void 0 && state.checkpoint.head === state.head ? `[review-loop] ✅ no unreviewed changes since the last review checkpoint (${state.checkpoint?.reviewedAt}).\nRun \`/review all\` to see the full change set, or \`/review approve\` to refresh the checkpoint.` : "[review-loop] ✅ working tree is clean.\nNothing to review.";
	let body = files.map((f) => `### ${f.status.trim()} ${f.path}\n\n${f.diff}`).join("\n\n");
	if (body.length > maxChars) body = `${body.slice(0, maxChars)}\n… (truncated)`;
	const head = state.checkpoint ? `checkpoint ${state.checkpoint.head.slice(0, 7)} (${state.checkpoint.reviewedAt})` : "no checkpoint yet (full change set)";
	return [
		`[review-loop] ${files.length} unreviewed file(s) — ${head}`,
		"",
		body,
		"",
		"Run `/review approve [comment]` to mark these as reviewed (comment reaches the agent)."
	].join("\n");
}
//#endregion
//#region src/workspaces.ts
/** Multi-repository orchestration only: no Harness, HTTP, injection or Git writes.
* Discovery reads only services.manifest and Git metadata. Collectors retain each
* repository's own ignore rules, HEAD baseline and canonical checkpoint key.
*/
function failure(code, error) {
	return {
		code,
		message: error instanceof Error ? error.message : String(error)
	};
}
/** Exact format: <name> <git_repo_url>. URLs are never fetched or executed.
* Blank lines, full-line comments and whitespace-delimited trailing comments
* are accepted; service names cannot escape services/.
*/
function parseServicesManifest(text) {
	const names = [];
	for (const [index, raw] of text.split(/\r?\n/).entries()) {
		const line = raw.replace(/\s+#.*$/, "").trim();
		if (!line || line.startsWith("#")) continue;
		const fields = line.split(/\s+/);
		const name = fields[0];
		if (fields.length !== 2 || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) throw new Error(`Invalid services.manifest row ${index + 1}: expected <name> <git_repo_url>`);
		names.push(name);
	}
	return names;
}
/** Ordinary directories inside a parent Git repo MUST NOT silently become that repo. */
function canonicalGitRoot(path, requireExact) {
	const canonical = realpathSync(path);
	const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
		cwd: canonical,
		encoding: "utf8",
		env: process.env
	});
	if (result.error || result.status !== 0) throw new Error(`Not a Git workspace: ${path}: ${result.error?.message ?? result.stderr.trim()}`);
	const root = realpathSync(result.stdout.trim());
	if (requireExact && root !== canonical) throw new Error(`Expected an independent Git root at ${path}; found parent ${root}`);
	return root;
}
/** Resolve the original session cwd to its Git root, then inspect only the
* manifest's services/<name> paths. Missing manifest means a normal single repo.
* Aliases (including symlinks) share one canonical repository/checkpoint.
*/
function discoverWorkspaces(cwd) {
	let workspace;
	try {
		workspace = canonicalGitRoot(cwd, false);
	} catch (error) {
		const requested = resolve(cwd);
		return {
			workspace: requested,
			repositories: [{
				id: requested,
				label: "root",
				workspace: requested,
				error: failure("repository", error)
			}],
			diagnostics: []
		};
	}
	const repositories = [{
		id: workspace,
		label: "root",
		workspace
	}];
	const diagnostics = [];
	let names;
	try {
		names = parseServicesManifest(readFileSync(join(workspace, "services.manifest"), "utf8"));
	} catch (error) {
		if (error.code !== "ENOENT") diagnostics.push(failure("manifest", error));
		return {
			workspace,
			repositories,
			diagnostics
		};
	}
	const seen = new Set([workspace]);
	const attempted = /* @__PURE__ */ new Set();
	for (const name of names) {
		const requested = join(workspace, "services", name);
		if (attempted.has(requested)) continue;
		attempted.add(requested);
		try {
			const root = canonicalGitRoot(requested, true);
			if (seen.has(root)) continue;
			seen.add(root);
			repositories.push({
				id: root,
				label: name,
				workspace: root
			});
		} catch (error) {
			repositories.push({
				id: requested,
				label: name,
				workspace: requested,
				error: failure("repository", error)
			});
		}
	}
	return {
		workspace,
		repositories,
		diagnostics
	};
}
function collectWorkspaceState(cwd, store, options = {}) {
	const discovery = discoverWorkspaces(cwd);
	const repositories = discovery.repositories.map((repo) => {
		if (repo.error) return {
			...repo,
			error: repo.error
		};
		try {
			return {
				...repo,
				state: collectState(repo.workspace, store, options),
				error: void 0
			};
		} catch (error) {
			return {
				...repo,
				error: failure("collect", error)
			};
		}
	});
	const totals = {
		repositories: repositories.length,
		failed: 0,
		files: 0,
		unreviewed: 0
	};
	for (const repo of repositories) if (repo.state) {
		totals.files += repo.state.files.length;
		totals.unreviewed += repo.state.unreviewed.length;
	} else totals.failed++;
	return {
		workspace: discovery.workspace,
		repositories,
		diagnostics: discovery.diagnostics,
		totals,
		ok: totals.failed === 0 && discovery.diagnostics.length === 0
	};
}
/** Save independent checkpoints for ALL discovered repositories. Continues after
* one failure, but ok=false prevents a false all-approved acknowledgement.
* Feedback injection belongs to the integration layer, once per ORIGINAL actor.
*/
function approveWorkspace(cwd, store) {
	const discovery = discoverWorkspaces(cwd);
	const repositories = discovery.repositories.map((repo) => {
		if (repo.error) return {
			...repo,
			error: repo.error
		};
		try {
			return {
				...repo,
				checkpoint: approve(repo.workspace, store, ""),
				error: void 0
			};
		} catch (error) {
			return {
				...repo,
				error: failure("approve", error)
			};
		}
	});
	return {
		workspace: discovery.workspace,
		repositories,
		diagnostics: discovery.diagnostics,
		ok: discovery.diagnostics.length === 0 && repositories.every((repo) => !repo.error)
	};
}
//#endregion
//#region src/http.ts
function reviewFeedback(comment) {
	return createUserMessage({
		content: [{
			type: "text",
			text: `[review feedback] ${comment}`
		}],
		source: {
			kind: "review-loop-feedback",
			form: "notice",
			summary: boundContextSummary(`Review feedback: ${comment.replace(/[\r\n]+/g, " ")}`)
		}
	});
}
const STATE_PATH = "/plugins/dsh-review-loop/state";
const APPROVE_PATH = "/plugins/dsh-review-loop/approve";
/** Resolve the workspace from ?workspace= or ?session= (via ctx.sessions). */
function workspaceOf(req, ctx) {
	const url = new URL(req.url ?? "/", "http://localhost");
	const ws = url.searchParams.get("workspace");
	if (ws) return ws;
	const sessionId = url.searchParams.get("session");
	if (sessionId) return ctx.get("sessions")?.get(sessionId)?.header.cwd;
}
function readBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		req.on("data", (c) => chunks.push(c));
		req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
		req.on("error", reject);
	});
}
function sendJson(res, status, body) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}
/** Find live agents whose session workspace matches (approval injection targets). */
function agentsForWorkspace(ctx, workspace) {
	const agents = ctx.get("agents");
	if (agents === void 0) return [];
	return agents.list().filter((a) => a.session.header.cwd === workspace);
}
/**
* Register the state/approve routes. Returns disposers; call inside
* `ctx.effect` so they die with the plugin fiber. Uses the optional-access
* path (`ctx.get`) so the plugin also loads without a webServer capability
* (headless compositions, tests).
*/
function registerWebRoutes(ctx, deps) {
	const webServer = ctx.get("webServer");
	if (webServer === void 0) return () => {};
	const disposers = [];
	disposers.push(webServer.register({
		kind: "exact",
		path: STATE_PATH,
		handler: (req, res) => {
			if (req.method !== "GET") return sendJson(res, 405, { error: "GET required" });
			const workspace = workspaceOf(req, ctx);
			if (!workspace) return sendJson(res, 400, { error: "workspace or session query parameter required" });
			try {
				sendJson(res, 200, collectWorkspaceState(workspace, deps.store));
			} catch (err) {
				sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
			}
		}
	}));
	disposers.push(webServer.register({
		kind: "exact",
		path: APPROVE_PATH,
		handler: async (req, res) => {
			if (req.method !== "POST") return sendJson(res, 405, { error: "POST required" });
			const workspace = workspaceOf(req, ctx);
			if (!workspace) return sendJson(res, 400, { error: "workspace or session query parameter required" });
			let comment = "";
			try {
				const body = JSON.parse(await readBody(req));
				comment = typeof body.comment === "string" ? body.comment : "";
			} catch {}
			try {
				const ownerWorkspace = workspace;
				const approval = approveWorkspace(ownerWorkspace, deps.store);
				const injected = [];
				const feedbackErrors = [];
				if (comment && approval.ok) for (const agent of agentsForWorkspace(ctx, ownerWorkspace)) try {
					agent.inject(reviewFeedback(comment));
					injected.push(agent.id);
				} catch (error) {
					feedbackErrors.push({
						agentId: agent.id,
						message: error instanceof Error ? error.message : String(error)
					});
				}
				sendJson(res, 200, {
					...approval,
					injectedAgents: injected,
					feedbackErrors
				});
			} catch (err) {
				sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
			}
		}
	}));
	return () => {
		for (const dispose of disposers) dispose();
	};
}
//#endregion
//#region src/index.ts
/**
* dsh-review-loop — incremental diff reviewer for DeepSeek Harness.
*
* Commands:
*   /review               show changes since the last review checkpoint
*                         (or the full working-tree change set if none exists)
*   /review all           show the complete change set vs HEAD
*   /review approve [msg] record a checkpoint; optional feedback is injected
*                         into the agent as a user message
*
* Web (when the webServer capability is present):
*   GET  /plugins/dsh-review-loop/state?workspace=<abs path>
*   POST /plugins/dsh-review-loop/approve?workspace=<abs path>  { "comment"?: string }
*/
function bounded(text, maxChars) {
	const limit = Math.max(0, Math.floor(maxChars));
	return text.length <= limit ? text : limit < 14 ? text.slice(0, limit) : text.slice(0, limit - 14) + "\n… (truncated)";
}
function renderWorkspaceState(state, maxChars) {
	const { repositories, failed, files, unreviewed } = state.totals;
	const lines = [`[review-loop] ${repositories} repository(s), ${failed} failed, ${files} changed file(s), ${unreviewed} unreviewed file(s) — ${state.ok ? "complete" : "incomplete"}`];
	for (const diagnostic of state.diagnostics) lines.push(`ERROR [${diagnostic.code}]: ${diagnostic.message}`);
	for (const repo of state.repositories) if (repo.error) lines.push(`## ${repo.label} — ${repo.workspace}\nERROR [${repo.error.code}]: ${repo.error.message}`);
	for (const repo of state.repositories) if (repo.state) lines.push(`## ${repo.label} — ${repo.workspace}\n${renderState(repo.state, maxChars)}`);
	return bounded(lines.join("\n\n"), maxChars);
}
const name = "dsh-review-loop";
const inject = ["commands"];
const MAX_OUTPUT = 6e3;
function resolveConfig(config) {
	const dshHome = config?.dshHome ?? process.env.DSH_HOME ?? join(process.env.HOME ?? "/tmp", ".dsh");
	return {
		dshHome,
		maxOutputChars: config?.maxOutputChars ?? MAX_OUTPUT,
		store: fileStore(dshHome)
	};
}
function handleReview(invocation, ctx, cfg) {
	const cwd = invocation.agent.session.header.cwd;
	if (!cwd) return {
		kind: "error",
		text: "[review-loop] session has no cwd; open a workspace session first"
	};
	const raw = invocation.rawInput.trim();
	if (raw === "approve" || raw.startsWith("approve ")) return handleApprove(invocation, ctx, cfg, raw === "approve" ? "" : raw.slice(8));
	const showAll = raw === "all" || raw === "--all" || raw === "full";
	const state = collectWorkspaceState(cwd, cfg.store, { all: showAll });
	return {
		kind: state.ok ? "success" : "error",
		text: renderWorkspaceState(state, cfg.maxOutputChars)
	};
}
function handleApprove(invocation, ctx, cfg, comment) {
	const cwd = invocation.agent.session.header.cwd;
	if (!cwd) return {
		kind: "error",
		text: "[review-loop] session has no cwd"
	};
	const approval = approveWorkspace(cwd, cfg.store);
	const saved = approval.repositories.filter((repo) => repo.checkpoint).length;
	const failed = approval.repositories.length - saved;
	const lines = [`[review-loop] ${saved}/${approval.repositories.length} checkpoint(s) saved, ${failed} failed — ${approval.ok ? "complete" : "incomplete"}`];
	for (const diagnostic of approval.diagnostics) lines.push(`ERROR [${diagnostic.code}]: ${diagnostic.message}`);
	for (const repo of approval.repositories) {
		lines.push(`## ${repo.label} — ${repo.workspace}`);
		if (repo.checkpoint) lines.push(`checkpoint saved (${Object.keys(repo.checkpoint.files).length} file(s) reviewed at ${repo.checkpoint.head.slice(0, 7)})`);
		else lines.push(`ERROR [${repo.error.code}]: ${repo.error.message}`);
	}
	let feedbackFailed = false;
	if (comment && approval.ok) try {
		invocation.agent.inject(reviewFeedback(comment));
		lines.push(`Feedback injected into agent: "${comment}"`);
	} catch (error) {
		feedbackFailed = true;
		lines.push(`Feedback injection failed: ${error instanceof Error ? error.message : String(error)}`);
	}
	else if (comment) lines.push("Feedback not injected: approval incomplete; successful checkpoints were retained.");
	else lines.push("Run `/review approve <comment>` next time to also send review feedback to the agent.");
	return {
		kind: approval.ok && !feedbackFailed ? "success" : "error",
		text: bounded(lines.join("\n"), cfg.maxOutputChars)
	};
}
function apply(ctx, config) {
	const cfg = resolveConfig(config);
	ctx.commands.register({
		name: "review",
		description: "review the changes the agent made since the last review checkpoint",
		input: { hint: "[all | approve <comment>]" },
		handler: (invocation) => handleReview(invocation, ctx, cfg)
	});
	ctx.inject(["webServer"], (webCtx) => {
		webCtx.effect(() => registerWebRoutes(webCtx, { store: cfg.store }), "dsh-review-loop: web routes");
	});
	ctx.logger.info("[review-loop] plugin loaded, /review registered");
}
//#endregion
export { agentsForWorkspace, apply, inject, name };
