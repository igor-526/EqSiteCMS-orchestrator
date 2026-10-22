window.__ModuleLoader__.load({
	id: "@local/dsh-review-loop-services-v2",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react);
		//#region src/client/review-panel.tsx
		/**
		* dsh-review-loop browser half: a review panel docked above the conversation
		* composer. Polls the host's JSON state route and renders the incremental
		* review queue — file list, colorized diffs, and an approve box that posts
		* the checkpoint (with optional feedback) back through the approve route.
		*
		* Collapsed: one status line. Expanded: full list. The /review command
		* remains available as the keyboard path.
		*
		* Visual language follows the DSH web client: --dsw-alias-* tokens, no
		* emoji, diff rows colored by meaning (added=success, removed=error) with
		* the sign preserved so color never carries meaning alone.
		*/
		const STATE_PATH = "/plugins/dsh-review-loop/state";
		const APPROVE_PATH = "/plugins/dsh-review-loop/approve";
		const POLL_MS = 2e3;
		const NS = "review-loop";
		const zh = {
			"status.reviewed": "全部已审查",
			"status.pending": "{count} 个文件待审查",
			"status.clean": "工作区干净",
			"action.expand": "展开审查",
			"action.collapse": "收起",
			"action.approve": "批准并记录审查点",
			"action.approving": "提交中…",
			"file.reviewed": "已审查",
			"file.new": "新增",
			"file.deleted": "删除",
			"file.modified": "修改",
			"comment.placeholder": "审查意见（将发给 agent）…",
			"checkpoint.at": "审查点 {head} · {at}",
			"diff.show": "显示 diff",
			"diff.hide": "隐藏 diff",
			"error.load": "审查状态加载失败",
			"status.loading": "审查状态加载中…",
			"status.repositories": "{count} 个仓库",
			"status.failed": "{count} 个仓库失败",
			"status.diagnostics": "{count} 条诊断",
			"checkpoint.none": "无审查点",
			"diff.empty": "无 diff — 自审查点以来文件未变更",
			"approval.partial": "部分批准：{approved} 个仓库成功，{failed} 个仓库失败。失败的仓库未获批准。",
			"approval.success": "已批准并记录 {count} 个仓库的审查点。",
			"approval.feedback": "审查意见发送失败（审查点已保存）",
			"approval.scope": "批准所有已配置仓库的当前文件状态；每个仓库保存自己的审查点。"
		};
		const en = {
			"status.reviewed": "All reviewed",
			"status.pending": "{count} file(s) to review",
			"status.clean": "Working tree clean",
			"action.expand": "Open review",
			"action.collapse": "Collapse",
			"action.approve": "Approve & checkpoint",
			"action.approving": "Submitting…",
			"file.reviewed": "reviewed",
			"file.new": "new",
			"file.deleted": "deleted",
			"file.modified": "modified",
			"comment.placeholder": "Review feedback (sent to the agent)…",
			"checkpoint.at": "checkpoint {head} · {at}",
			"diff.show": "Show diff",
			"diff.hide": "Hide diff",
			"error.load": "Failed to load review state",
			"status.loading": "Loading review state…",
			"status.repositories": "{count} repositories",
			"status.failed": "{count} repositories failed",
			"status.diagnostics": "{count} diagnostics",
			"checkpoint.none": "no checkpoint",
			"diff.empty": "no diff — file unchanged since checkpoint",
			"approval.partial": "Partial approval: {approved} repositories succeeded, {failed} failed. Failed repositories were not approved.",
			"approval.success": "Approved & checkpointed {count} repositories.",
			"approval.feedback": "Feedback delivery failed (checkpoints saved)",
			"approval.scope": "Approves the current filesystem state of all configured repositories; each saves its own checkpoint."
		};
		/** Poll only the original session; the Host resolves its owner workspace. */
		function useReviewState(sessionId, refresh) {
			const [frame, setFrame] = (0, react.useState)();
			(0, react.useEffect)(() => {
				let alive = true;
				let busy = false;
				const poll = async () => {
					if (busy) return;
					busy = true;
					try {
						const res = await fetch(`${STATE_PATH}?session=${encodeURIComponent(sessionId)}`, { headers: { accept: "application/json" } });
						if (!res.ok) throw new Error(`state failed: ${res.status}`);
						const state = await res.json();
						if (alive) setFrame({
							sessionId,
							state,
							failed: false
						});
					} catch {
						if (alive) setFrame((previous) => ({
							sessionId,
							state: previous?.sessionId === sessionId ? previous.state : void 0,
							failed: true
						}));
					} finally {
						busy = false;
					}
				};
				poll();
				const timer = setInterval(() => {
					poll();
				}, POLL_MS);
				return () => {
					alive = false;
					clearInterval(timer);
				};
			}, [sessionId, refresh]);
			return frame?.sessionId === sessionId ? frame : { failed: false };
		}
		const buttonStyle = {
			padding: "4px 8px",
			borderRadius: 6,
			border: "1px solid var(--dsw-alias-border-l2)",
			background: "var(--dsw-alias-markdown-code-block)",
			color: "var(--dsw-alias-label-primary)",
			font: "inherit",
			fontSize: 12,
			cursor: "pointer"
		};
		/** One line of a unified diff, colored by role. The sign stays visible so color never carries meaning alone. */
		function DiffLine({ line }) {
			if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("diff --git") || line.startsWith("index ")) return /* @__PURE__ */ react.createElement("div", { style: { color: "var(--dsw-alias-label-tertiary)" } }, line);
			if (line.startsWith("@@")) return /* @__PURE__ */ react.createElement("div", { style: { color: "var(--dsw-alias-label-secondary)" } }, line);
			if (line.startsWith("+")) return /* @__PURE__ */ react.createElement("div", { style: { color: "var(--dsw-alias-state-success-primary)" } }, line);
			if (line.startsWith("-")) return /* @__PURE__ */ react.createElement("div", { style: { color: "var(--dsw-alias-state-error-primary)" } }, line);
			return /* @__PURE__ */ react.createElement("div", { style: { color: "var(--dsw-alias-label-primary)" } }, line);
		}
		/** A file's diff body: colorized unified-diff lines, never soft-wrapped. */
		function DiffBody({ diff }) {
			const lines = diff.split("\n");
			return /* @__PURE__ */ react.createElement("div", { style: {
				padding: 8,
				background: "var(--dsw-alias-markdown-code-block)",
				borderRadius: 6,
				overflowX: "auto",
				font: "var(--dsw-font-markdown-code-block)",
				fontSize: 12,
				lineHeight: 1.5,
				whiteSpace: "pre"
			} }, lines.map((line, i) => /* @__PURE__ */ react.createElement(DiffLine, {
				key: i,
				line
			})));
		}
		/** One file row: status chip + toggleable colorized diff. */
		function FileRow({ file, t }) {
			const [open, setOpen] = (0, react.useState)(false);
			const diffId = (0, react.useId)();
			const chip = file.reviewed ? t("file.reviewed") : file.newFile ? t("file.new") : file.deleted ? t("file.deleted") : t("file.modified");
			const color = file.reviewed ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-state-warn-primary)";
			return /* @__PURE__ */ react.createElement("div", { style: {
				borderBottom: "1px solid var(--dsw-alias-border-l2)",
				padding: "4px 0"
			} }, /* @__PURE__ */ react.createElement("button", {
				type: "button",
				"aria-expanded": open,
				"aria-controls": diffId,
				onClick: () => setOpen((v) => !v),
				style: {
					background: "none",
					border: "none",
					color: "inherit",
					cursor: "pointer",
					textAlign: "left",
					width: "100%",
					font: "inherit",
					display: "flex",
					gap: 8,
					alignItems: "center"
				}
			}, /* @__PURE__ */ react.createElement("span", { style: {
				color,
				fontSize: 11,
				whiteSpace: "nowrap"
			} }, chip), /* @__PURE__ */ react.createElement("code", { style: {
				flex: 1,
				font: "var(--dsw-font-markdown-code-block)",
				fontSize: 12
			} }, file.path), /* @__PURE__ */ react.createElement("span", { style: {
				fontSize: 11,
				color: "var(--dsw-alias-label-tertiary)"
			} }, open ? t("diff.hide") : t("diff.show"))), /* @__PURE__ */ react.createElement("div", {
				id: diffId,
				hidden: !open
			}, open && (file.diff ? /* @__PURE__ */ react.createElement(DiffBody, { diff: file.diff }) : /* @__PURE__ */ react.createElement("div", { style: {
				margin: "4px 0 0",
				fontSize: 12,
				color: "var(--dsw-alias-label-tertiary)"
			} }, t("diff.empty")))));
		}
		/**
		* The review panel docked in the conversation input area.
		* @param props - the input-dock runtime share (session kit) + locale seat.
		*/
		function ReviewPanel(props) {
			return /* @__PURE__ */ react.createElement(SessionReviewPanel, {
				key: props.session.sessionId,
				...props
			});
		}
		function SessionReviewPanel(props) {
			const { t, session } = props;
			const [open, setOpen] = (0, react.useState)(false);
			const [comment, setComment] = (0, react.useState)("");
			const [submitting, setSubmitting] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)("");
			const [approval, setApproval] = (0, react.useState)();
			const [bump, setBump] = (0, react.useState)(0);
			const { state, failed } = useReviewState(session.sessionId, bump);
			const panelId = (0, react.useId)();
			if (state === void 0) return /* @__PURE__ */ react.createElement("div", { role: failed ? "alert" : "status" }, t(failed ? "error.load" : "status.loading"));
			const pending = state.totals.unreviewed;
			const approve = async () => {
				setSubmitting(true);
				setError("");
				setApproval(void 0);
				try {
					const res = await fetch(`${APPROVE_PATH}?session=${encodeURIComponent(session.sessionId)}`, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ comment: comment.trim() })
					});
					const result = await res.json();
					if (!Array.isArray(result.repositories)) throw new Error(`approve failed: ${res.status}`);
					if (!res.ok && result.ok) throw new Error(`approve failed: ${res.status}`);
					setApproval(result);
					if (result.ok) setComment("");
				} catch (err) {
					setError(err instanceof Error ? err.message : String(err));
				} finally {
					setBump((value) => value + 1);
					setSubmitting(false);
				}
			};
			const approvalFailures = approval?.repositories.filter((repository) => repository.error) ?? [];
			const approvalCount = approval?.repositories.filter((repository) => !repository.error).length ?? 0;
			const statusText = pending === 0 && state.totals.files === 0 ? t("status.clean") : pending === 0 ? t("status.reviewed") : t("status.pending").replace("{count}", String(pending));
			return /* @__PURE__ */ react.createElement("div", { style: {
				maxWidth: "var(--dsh-composer-card-max-width, 780px)",
				margin: "0 auto",
				padding: "0 var(--dsh-composer-dock-inset, 8px)"
			} }, /* @__PURE__ */ react.createElement("div", { style: {
				display: "flex",
				gap: 8,
				alignItems: "center",
				fontSize: 13
			} }, /* @__PURE__ */ react.createElement("span", { style: {
				display: "inline-block",
				width: 8,
				height: 8,
				borderRadius: "50%",
				background: pending > 0 ? "var(--dsw-alias-state-warn-primary)" : "var(--dsw-alias-state-success-primary)"
			} }), /* @__PURE__ */ react.createElement("span", { style: { color: "var(--dsw-alias-label-primary)" } }, statusText), /* @__PURE__ */ react.createElement("span", { style: {
				color: "var(--dsw-alias-label-tertiary)",
				fontSize: 11
			} }, t("status.repositories").replace("{count}", String(state.totals.repositories))), state.totals.failed > 0 && /* @__PURE__ */ react.createElement("span", {
				role: "status",
				style: { color: "var(--dsw-alias-state-error-primary)" }
			}, t("status.failed").replace("{count}", String(state.totals.failed))), /* @__PURE__ */ react.createElement("button", {
				type: "button",
				"aria-expanded": open,
				"aria-controls": panelId,
				onClick: () => setOpen((value) => !value),
				style: {
					...buttonStyle,
					marginLeft: "auto"
				}
			}, open ? t("action.collapse") : t("action.expand"))), failed && /* @__PURE__ */ react.createElement("div", { role: "alert" }, t("error.load")), /* @__PURE__ */ react.createElement("div", {
				id: panelId,
				hidden: !open,
				style: {
					marginTop: 6,
					border: "1px solid var(--dsw-alias-border-l2)",
					borderRadius: 8,
					padding: 8,
					maxHeight: "40vh",
					overflowY: "auto"
				}
			}, state.diagnostics.length > 0 && /* @__PURE__ */ react.createElement("div", { role: "status" }, t("status.diagnostics").replace("{count}", String(state.diagnostics.length))), state.repositories.map((repository) => /* @__PURE__ */ react.createElement("section", {
				key: repository.id,
				"aria-label": repository.label,
				style: { marginBottom: 8 }
			}, /* @__PURE__ */ react.createElement("h3", { style: {
				margin: "4px 0",
				fontSize: 13,
				color: "var(--dsw-alias-label-primary)"
			} }, repository.label), /* @__PURE__ */ react.createElement("div", { style: {
				fontSize: 11,
				color: "var(--dsw-alias-label-tertiary)",
				overflowWrap: "anywhere"
			} }, repository.workspace), repository.error ? /* @__PURE__ */ react.createElement("div", { role: "alert" }, repository.error.code, ": ", repository.error.message) : /* @__PURE__ */ react.createElement(react.Fragment, null, /* @__PURE__ */ react.createElement("div", { style: {
				fontSize: 11,
				color: "var(--dsw-alias-label-secondary)"
			} }, "HEAD ", repository.state.head.slice(0, 7), " · ", repository.state.checkpoint ? t("checkpoint.at").replace("{head}", repository.state.checkpoint.head.slice(0, 7)).replace("{at}", new Date(repository.state.checkpoint.reviewedAt).toLocaleString()) : t("checkpoint.none")), repository.state.files.length === 0 && /* @__PURE__ */ react.createElement("div", { style: {
				fontSize: 11,
				color: "var(--dsw-alias-label-tertiary)"
			} }, t("status.clean")), repository.state.files.map((file) => /* @__PURE__ */ react.createElement(FileRow, {
				key: JSON.stringify([repository.id, file.path]),
				file,
				t
			}))))), /* @__PURE__ */ react.createElement("div", { style: {
				fontSize: 11,
				color: "var(--dsw-alias-label-secondary)"
			} }, t("approval.scope")), /* @__PURE__ */ react.createElement("div", { style: {
				display: "flex",
				gap: 8,
				marginTop: 8
			} }, /* @__PURE__ */ react.createElement("input", {
				value: comment,
				onChange: (e) => setComment(e.target.value),
				"aria-label": t("comment.placeholder"),
				placeholder: t("comment.placeholder"),
				disabled: submitting,
				style: {
					flex: 1,
					padding: "4px 8px",
					borderRadius: 6,
					border: "1px solid var(--dsw-alias-border-l2)",
					background: "transparent",
					color: "inherit",
					fontSize: 12
				}
			}), /* @__PURE__ */ react.createElement("button", {
				type: "button",
				style: buttonStyle,
				onClick: () => {
					approve();
				},
				disabled: submitting || pending === 0
			}, submitting ? t("action.approving") : t("action.approve"))), approval && /* @__PURE__ */ react.createElement("div", {
				role: "status",
				style: {
					marginTop: 4,
					fontSize: 12
				}
			}, approval.ok ? t("approval.success").replace("{count}", String(approvalCount)) : t("approval.partial").replace("{approved}", String(approvalCount)).replace("{failed}", String(approvalFailures.length)), approvalFailures.map((repository) => /* @__PURE__ */ react.createElement("div", { key: repository.id }, repository.label, ": ", repository.error?.message))), approval?.feedbackErrors?.map((feedback) => /* @__PURE__ */ react.createElement("div", {
				role: "alert",
				key: feedback.agentId
			}, t("approval.feedback"), ": ", feedback.message)), error !== "" && /* @__PURE__ */ react.createElement("div", {
				role: "alert",
				style: {
					fontSize: 11,
					color: "var(--dsw-alias-state-error-primary)",
					marginTop: 4
				}
			}, error)));
		}
		/** Register the panel into the conversation input dock. */
		const inject = ["slots", "locale"];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "review-loop: dictionaries");
			ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
				name: "conversation.input.dock",
				id: "review-loop",
				order: 10,
				locale: NS
			}, ReviewPanel));
		}
		//#endregion
		exports.ReviewPanel = ReviewPanel;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
