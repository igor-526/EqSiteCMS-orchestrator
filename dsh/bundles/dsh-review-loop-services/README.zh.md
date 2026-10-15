# dsh-review-loop

面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的增量代码审查插件。

[English](README.md) · [MIT License](LICENSE)

`dsh-review-loop` 把"人审查 agent 干的活"变成增量、闭环、不重复的过程：批准一批改动后记录审查检查点（checkpoint），下次审查只显示此后新增的改动——已看过的内容不会再次出现。审查意见通过 harness 常规消息通道注入 agent，不打断它正在进行的任务。

## 解决什么问题

agent 跑完一个任务通常改动十几个文件。每次都看完整 diff 很慢，重复看已审查的内容更是浪费。本插件让审查跟着 agent 的进度推进：

```
agent 干活（改文件）
  -> 打开审查面板：只显示上次审查检查点之后的改动
  -> 逐文件查看 diff、填写审查意见
  -> 批准：记录新的检查点，意见注入 agent
  -> agent 响应意见继续工作；新改动成为下一批审查
```

## 特性

- **增量审查（since-review）**：批准时把工作区快照记为检查点；下次审查只比较「检查点 -> 当前」，已审文件从队列中消失，除非再次被修改。
- **双入口**：Web UI 审查面板（输入框上方 dock，2 秒轮询）+ `/review` 命令（键盘优先）。两者共用同一套核心逻辑。
- **反馈闭环**：批准时可附评论，通过 `agent.inject()` 作为用户消息送达 agent。
- **不解析工具调用**：任何磁盘改动（agent、你或其它进程产生）都会被反映——插件读的是 git，不是 agent 循环。
- **检查点持久化**：`$DSH_HOME/review-loop/<workspace-hash>.json`，原子写入，绝不污染工作区自身的 git 状态。
- **零核心修改**：纯 bundle 插件（`dsh.bundle` patch 层），不动 agent-loop 骨架。

## 安装

```sh
# 一行安装（git 源）
dsh plugin --profile web add github:wuxiangru915/dsh-review-loop

# 重启 web 服务，然后强制刷新页面
```

本地开发：

```sh
# 开发需要 DSH 源码仓库的 sibling checkout（位于 ../deepseek-harness）：
# @deepseek-ai/dsh-* 尚未完整发布到 npm（缺 dsh-type-meta），devDependencies
# 通过 link 指向该工作区；checkout 不在该路径时请调整 package.json 中的 link 路径。
pnpm install && pnpm build
dsh plugin --profile web add /path/to/dsh-review-loop
```

仓库已随附构建产物 `lib/`，git 源安装无需在用户机器上执行构建。

## 用法

### Web UI

![审查面板（中文）](assets/review-panel.zh.png)

任意工作区为 git 仓库的会话中，输入框上方会出现审查面板：

- 状态行显示 `N 个文件待审查` 及**展开审查**按钮。
- 展开后面板列出待审文件，diff 可折叠查看且按行着色（新增行使用 success 语义色、删除行使用 error 语义色，行首符号始终可见，不依赖颜色传递语义）。
- 提供可选的意见输入框与**批准并记录审查点**按钮。
- 批准后面板显示已审查状态；之后若有改动，对应文件会重新进入队列。

### 命令行

| 命令 | 行为 |
|---|---|
| `/review` | 增量：上次检查点之后的改动（无检查点时显示相对 HEAD 的完整改动集） |
| `/review all` | 相对 HEAD 的完整改动集，忽略检查点 |
| `/review approve` | 记录检查点 |
| `/review approve <评论>` | 记录检查点并将评论注入 agent |

## 架构

```
src/
├── review.ts      纯核心逻辑（collectState / approve / renderState）——命令与 HTTP 共用
├── git.ts         git 操作封装（status / diff / hash-object；零依赖 spawnSync）
├── checkpoint.ts  检查点持久化（$DSH_HOME/review-loop/<ws-hash>.json，原子写）
├── http.ts        Web 路由：GET /plugins/dsh-review-loop/state · POST /plugins/dsh-review-loop/approve
└── client/
    └── review-panel.tsx  浏览器端面板（conversation.input.dock 槽位，轮询刷新）
```

```
命令:   /review ------> renderState() ----+
                                          +--> src/review.ts（纯核心，共享）
Web:    GET /state ----> collectState() --+
        POST /approve --> approve() + agent.inject()
```

客户端 bundle 为 CJS `__ModuleLoader__` 产物，服务路径 `/plugins/@dsh-plugin/dsh-review-loop/client.js`；路由与命令共享同一检查点存储，UI 批准与 `/review` 命令推进的是同一条队列。

### 增量算法

```
对每个相对 HEAD 的改动文件：
  将其内容 hash 与检查点记录的 hash 比较
    相同  -> 已审查（隐藏）
    变化 / 新增 / HEAD 移动 -> 待审查（增量队列）
批准时重新快照工作区 -> 检查点前移
```

## 测试

```sh
pnpm test       # 7 个集成测试：真实 cordis + 真实 git 仓库
pnpm typecheck
pnpm build      # 双 half 构建：host ESM + client bundle
```

## Roadmap

- [x] `/review` 命令（增量 diff / 批准 / 反馈注入）
- [x] Web UI 审查面板（文件列表 + diff + 批准）
- [x] 检查点持久化（增量队列）
- [ ] 行级评论（diff 解析）
- [ ] 会话分支联动（检查点随分支）
- [ ] npm 发布（`@dsh-plugin/dsh-review-loop`）

## 环境要求

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) >= 0.1.0-rc.5（Cordis 4.x）
- git 仓库（硬前置）
- Node.js >= 22

## License

[MIT](LICENSE)
