# pi-gui 简体中文国际化（zh-CN i18n）— 进度交接文档

> **状态更新（2026-10-24）：本交接已完成。** §5 待办全部执行完毕：typecheck/guards/lint/format 通过、i18n 单测与 e2e 语言切换用例补齐、真机验证通过（并修复了设置页语言显示陈旧、命令面板 aria-label 两个缺陷）、`electron-builder.cn.yml` + `package:mac:cn` 已就绪。交付说明见 [docs/i18n-zh-cn.md](docs/i18n-zh-cn.md)。本文保留为历史交接记录。

> 本文件是给下一个接手 Agent 的**完整交接记录**。请先通读本文，再继续执行。
> 任务总要求见对话最上方（或本仓库根目录任务说明）：实现 pi-gui 简体中文界面 + 运行时中英文切换，交付 macOS ARM64 `Pi GUI CN.app`，不得破坏官方 pi-gui 与 pi CLI。

## 1. 基线与环境

- **仓库**：`minghinmatthewlam/pi-gui`，已克隆到 `/Users/jack/项目/开源/agent`（本地目录名"agent"）。
- **基线 commit**：`d6f8c4641a880bd2f29ca400a6593a40aa24c49f`（记录在 `.i18n-baseline.txt`）。
- **平台**：macOS Apple Silicon；node v22.19.0，corepack pnpm 10.25.0。
- **网络注意**：本机直连 GitHub 极慢。`pnpm install` 的 electron postinstall 下载 Electron 二进制（~105MB）已失败多次（ECONNRESET / <50KB/s）。实测镜像速度：
  - 华为云 `https://mirrors.huaweicloud.com/electron/` ≈ 100KB/s（**最快，推荐**）
  - `npmmirror.com` ≈ 3–10KB/s；GitHub 直连超时
  - 正确命令：`ELECTRON_MIRROR="https://mirrors.huaweicloud.com/electron/" pnpm install`
  - 已在后台用华为云镜像重跑安装（`/tmp/pnpm-install3.log`），**接手时先确认安装是否完成**：`ls node_modules/electron/dist` 应存在；若没完成/失败，用上面命令重跑（Electron 37.10.3）。
- **官方 pi-gui 已安装在本机**：`/Applications/pi-gui.app`（bundle id `com.pi-gui.desktop`）。切勿覆盖它；CN 版必须用不同 productName/appId（见 §6）。

## 2. 已完成的架构（核心设计，勿推翻）

### 2.1 i18n 基础设施（新建 `apps/desktop/src/i18n/`）

- `index.ts` — 语言 store，**仿照 `src/ui/active-theme.ts` 的模式**（模块级 store + `useSyncExternalStore`，非 Context/Provider）：
  - `LanguageId = "en-US" | "zh-CN"`，`LanguageSetting = "auto" | LanguageId`
  - localStorage key `pi-gui.language` 持久化；`auto` 时用 `navigator.languages` 检测（zh* → zh-CN，否则 en-US）
  - `t(key, params?)` **独立函数**（非 React hook），供非组件代码（如 `composer-commands.ts`、`model-onboarding.ts`、`workbench-state.ts`）调用；`{param}` 插值；zh 缺 key 时回退英文
  - `useI18n()` hook → `{ language, languageSetting, setLanguageSetting, t }`
  - 多窗口同步：`window.addEventListener("storage", ...)`；系统语言变化：`languagechange` 事件
  - 副作用 import 已加到 `src/main.tsx`（首帧前设置 `<html lang>`）
  - Node 环境（playwright unit tests 直接 import renderer 源码）安全：所有 `localStorage`/`document`/`window` 访问均有 `typeof` 或 try/catch 防护
- `en-us.ts` — 英文源字典（**key 集合的唯一真源**），`export type TranslationKey = keyof typeof enUs`
- `zh-cn.ts` — `Record<TranslationKey, string>` **强制全量**（少一个 key typecheck 即失败，保证翻译完整性）
- 字典已积累约 **400 个 key**（`grep -c '"' en-us.ts` ≈ 823 行含 key+value），按命名空间组织：`common.* settings.* sidebar.* topbar.* app.* conversation.* composer.* timeline.* turnChanges.* extensionCard.* context.* files.* review.* workbench.* terminal.* palette.* scheduled.* skills.* extensions.* extension.* extensionView.* customize.* newThread.* threadActions.* threadSwitcher.* forkModal.* treeModal.* annotation.* relative.* recovery.* workspaceMenu.*`

### 2.2 语言设置入口

- `settings-appearance-section.tsx`：新增 **Language 行**（Settings → Appearance），`LanguageSelect` 组件直接用 `useI18n()` hook（不经过 props 下传，因为语言是 renderer-local 状态而非 DesktopAppState）
- 选项：跟随系统 / English / 简体中文

### 2.3 关键设计决策（已定，保持一致）

1. **语言状态放 renderer localStorage**（不放 DesktopAppState/IPC/ui-state）：零侵入，不碰 contract/persistence 版本号/guards。代价：主进程不知道语言（见 §5 待办）。
2. **模块级常量里的文案一律改为函数或调用时解析**，否则语言切换后不更新。已处理的例子：
   - `settings-sections.tsx`：`title/description` → `titleKey/descriptionKey` + `settingsSectionDefinition()`/`settingsNavItemDefinition()` 运行时解析
   - `composer-commands.ts`：`HOST_ACTION_SLASH_COMMANDS` → `hostActionSlashCommands()` 函数；`THINKING_OPTIONS` → `thinkingOptions()`；`MODEL_OPTIONS_EMPTY_TITLE` → `modelOptionsEmptyTitle()`（所有引用处已同步改）
   - `builtin-tools.tsx`：`BUILTIN_TOOLS` 改存 `labelKey/descriptionKey`，提供 `builtinToolLabel/builtinToolDescription/builtinToolEntries()`
   - `diff-panel.tsx`：`SCOPE_LABELS` → `scopeLabel(id)` 函数；`SCOPE_OPTIONS` 不再存 label
   - `scheduled tasks`：契约里的 `formatScheduledTaskRowMeta/Recurrence/NextRun` 保持不动（有单测），**新建了 renderer 侧 `src/features/scheduled-tasks/schedule-format.ts`**（`formatRowMeta/formatRecurrence/formatNextRun/weekdayShortName`，用 `toLocaleTimeString` 本地化时钟），UI 已改用它
   - `palette-sections.ts`：`COMMAND_FILTERS` → `commandFilters()`
   - `model-onboarding.ts`：derive 函数内部直接 t()（App 订阅了 useI18n 会重渲染）
3. **memo 组件的坑**：`MeasuredTimelineItem = memo(...)`（conversation-timeline.tsx）props 不变时不会重渲染。解法：在 `timeline-item.tsx` 的 `TimelineItem` 组件体首行加 `useI18n();`（useSyncExternalStore 的订阅独立于 memo 生效）。其他 memo 组件（如 MessageMarkdown）同理如遇到需处理。
4. **App.tsx 顶部加了 `const { t } = useI18n();`**，使整棵树随语言切换重渲染（App.tsx 有 eslint max-lines 1447 上限，**当前行数接近上限**，改 App.tsx 前先 `wc -l`，必要时把逻辑挪到 hook）。
5. **contracts 不能 import renderer i18n**（architecturally wrong，虽然 guard 不禁止）：主题预设描述改为 appearance-section 内 `themePresetDescription(presetId)` 映射；scheduled-tasks 见上。
6. **Hooks 规则**：hook 必须在任何 early return 之前调用（曾在 composer-surface.tsx MentionMenuItem 修过此 bug，注意别再犯）。

### 2.4 已翻译的模块（全部：en+zh 双语已进字典）

| 模块            | 文件                                                                                                                                                                                                                                                                                                                                                    | 状态 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| Settings 全部   | settings-sections/view/appearance/general/notifications/shortcuts/providers/models/mcp/custom-endpoints/utils/controls, model-onboarding(.ts/.tsx), secondary-surfaces/surface                                                                                                                                                                          | ✅   |
| App 层          | App.tsx, topbar.tsx, desktop-recovery.tsx, main.tsx(import)                                                                                                                                                                                                                                                                                             | ✅   |
| Threads         | sidebar.tsx(1733行), thread-actions, thread-switcher, new-thread-view, use-workspace-menu(2处window.confirm)                                                                                                                                                                                                                                            | ✅   |
| Conversation    | composer-panel/surface/commands, model-selector, context-meter, conversation-timeline, timeline-item, turn-changes-card, tree-modal, fork-modal, queued-composer-messages, thread-search, extension-card, image-attachment-thumb, annotations(annotation-selection/chip), use-running-label, use-mention-menu(pluralize→composer.mentionCommands/Tools) | ✅   |
| Workbench       | workbench.tsx, builtin-tools.tsx(重写), workbench-state(2错误文案), workbench-resize-handle, diff-panel, review-file-tree, file-explorer, file-editor-pane, terminal-panel                                                                                                                                                                              | ✅   |
| Command palette | palette-actions, command-palette, command-palette-surface, palette-sections                                                                                                                                                                                                                                                                             | ✅   |
| Scheduled tasks | view/editor/chip + 新建 schedule-format.ts                                                                                                                                                                                                                                                                                                              | ✅   |
| Extensions      | customize-page, skills-view, extensions-view, extension-display(改了导出), resource-detail/list, extension-notices, extension-session-ui, extension-view-panel, pinned-cards                                                                                                                                                                            | ✅   |
| lib             | string-utils.formatRelativeTime（zh: 刚刚/{n}分钟/{n}小时/{n}天/{n}周/{n}个月/{n}年）                                                                                                                                                                                                                                                                   | ✅   |

## 3. 修改文件清单（git status 72 项）

- 新增：`apps/desktop/src/i18n/{index.ts,en-us.ts,zh-cn.ts}`、`apps/desktop/src/features/scheduled-tasks/schedule-format.ts`、`.i18n-baseline.txt`、本文件
- 修改：见上方表格（`git status --short` 完整列表，约 68 个 M 文件，全部在 `apps/desktop/src/` 下，**未触碰 electron/、contracts/、packages/、tests/**）

## 4. 尚未翻译/未验证的残留（接手后逐项检查）

用这个命令扫描残留英文（会有噪音，人工甄别哪些是面向用户的）：

```bash
cd apps/desktop && grep -rnE '"[A-Z][a-z]+ [a-z][^"]{8,}"' src --include="*.tsx" --include="*.ts" | grep -viE 'className|import |from "|console|testid|//|aria|key=|data-|role='
```

已知残留点（按优先级）：

1. **`src/features/conversation/workspace-file-line.tsx` / `message-markdown.tsx`** — 只扫过没细看，可能无文案或有少量。
2. **`use-session-composer.tsx` / `use-slash-menu.tsx` / `use-tree-fork-modals.tsx` / `use-thread-search.ts` / `use-new-thread-controller.tsx`** — hook 内可能有错误消息字符串（如 use-composer-draft-sync 里的 `throw new Error("The desktop connection is unavailable.")` 等属于内部错误，不强求翻译）。
3. **`src/app/secondary-surfaces.tsx`** — 已处理大部分，但里面可能还有零散文案（如登录/登出错误提示），grep 确认。
4. **`src/features/threads/extension-flags-selector.tsx`** — 未检查！
5. **`src/features/workbench/file-workbench.tsx` / `review-menu.tsx`** — review-menu 的 label prop 由调用方传入已翻译值，本身可能无文案；file-workbench 未细查。
6. **`use-extension-card-actions.ts` / `use-extension-host-actions.ts` / `focus-composer.ts` / `pinned-cards-model.ts`** — 未细查。
7. **`src/ui/`（icons.tsx aria-label、modifier-hints、pane-resize-handle、dialog-focus）** — pane-resize-handle 的 label 由调用方传入；icons 的 title 属性可能有英文（如 icon title="Copy"），检查 `grep -n 'title="' src/ui/icons.tsx`。
8. **timeline activity/summary 的 label**（`item.label`）来自 pi 运行时 transcript（session-driver 生成），属于 pi 输出而非 app UI，**决定不翻译**（与"不改模型输出"边界一致）——保持此决定。
9. **`contracts/ipc.ts` 的 `getSidePanelToggleShortcutLabel` 等** — 快捷键标签，无需翻译。

## 5. 待办（按顺序执行）

1. **完成依赖安装**（见 §1 网络注意；确认 `node_modules/electron/dist` 存在，`node -e "require('electron')" ` 应打印版本路径）。
2. **首次 typecheck**：`cd apps/desktop && pnpm typecheck`（即 `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.electron.json --noEmit`）。**预计会有一批错误**——72 个文件是手工/脚本批量编辑的，重点检查：
   - 各文件 `import { t } / { useI18n }` 是否正确、未用错（eslint no-unused-vars 会报）
   - `sidebar.tsx` 里的替换（`Cancel/Save` 按钮缩进变体是否都匹配到了）
   - `settings-sections.tsx` 新接口的所有消费方（secondary-surfaces 已改用 `settingsNavItemDefinition`；`palette-actions.tsx` 用 `sectionTitle()`——已确认存在）
   - `extension-display.ts` 我新增了 `PI_GUI_TOOLS_LABEL_KEY/PI_ADDONS_LABEL_KEY` 常量 + `extensionGroupKey/extensionGroupLabelFromKey/ExtensionGroupKey`；同时保留了旧常量（`extensionScopeLabel` 还引用旧英文常量，**旧 `PI_GUI_TOOLS_LABEL/PI_ADDONS_LABEL` 常量被 `extensionScopeLabel` 和 mention 搜索文本用——这里是残留英文，可考虑后续统一**，不强求）
3. **typecheck 通过后**跑 guards：仓库根 `pnpm build:shared` 然后 `pnpm check:architecture`（renderer boundary/contract authority/host boundary/timeline owner）+ `pnpm test:guards` + `pnpm format:check`（**prettier 未跑过，大概率有格式问题**，跑 `pnpm format` 修）+ `pnpm lint`（max-warnings 0，注意 App.tsx 行数上限 1447）。
4. **补单测**：在 `apps/desktop/tests/unit/` 仿照现有 `*.spec.ts`（playwright test，Node 环境 import renderer 源码）新建 `i18n.spec.ts`，覆盖：默认 auto、setLanguageSetting 持久化（localStorage 不可用时降级）、zh 全量 key（遍历 enUs keys 断言 zhCn 都有——其实类型已保证，但运行时断言 fallback 逻辑）、插值 `{param}`、未知 param 保留原样。注意：Node 环境 localStorage 是 undefined，已有 try/catch；测试语言切换用 `setLanguageSetting` + `getLanguage()` 即可。
5. **Electron dev 真机验证**（AGENTS.md 要求"Desktop work is not done until verified on the real Electron surface"）：
   - `PI_APP_USER_DATA_DIR=$(mktemp -d)/pi-gui-cn-dev pnpm --filter @pi-gui/desktop dev`（**必须用隔离 userData，避免污染官方 pi-gui 的 catalog**；打开一个本地测试文件夹如 /tmp/test-repo，不要开正在使用的真实项目）
   - 验证：Settings→Appearance→Language 切换立即生效（sidebar/设置页/composer 全变中文）、重启 dev 保持、系统语言跟随、无乱码、布局不溢出（中文长文案如 notifications 描述）
   - 冒烟：新建会话流程 UI、命令面板 ⌘K、Review 面板、终端标签
   - 可选跑一条 e2e lane：`pnpm --filter @pi-gui/desktop run test:e2e:core:navigation`（注意会重新 build；PI_APP_TEST_MODE=background）
6. **主进程通知文案（可选增强，非必须）**：`electron/platform/notification-manager.ts`（"Agent finished responding"、hostUiBody 的 "Error:"/"Warning:"/"Needs your input"）与 `electron/platform/update-checker.ts`（"pi-gui Release Available"）仍是英文。若要翻译：加一个窄 IPC（contracts/ipc.ts 加 channel + preload 暴露 + register-desktop-ipc.ts 注册 handler + 内存态 LanguageStore in main），renderer 启动/切换时上报。**不做也不算未完成需求**（任务书核心是 UI 汉化），可作为可选。
7. **构建 CN 版 .app**：
   - 新建 `apps/desktop/electron-builder.cn.yml`（**别改官方 electron-builder.yml**）：`productName: Pi GUI CN`、`appId: com.pi-gui.desktop.cn`、`notarize: false`（无 Apple 凭证；`publish: null`）、其余从主配置复制需要的字段（mac target: dir + dmg, arm64；extraFiles 里的 notification helper 需要先 `pnpm --filter @pi-gui/desktop run build:notification-helper`）
   - 新脚本 `package:mac:cn`：`pnpm run build && electron-builder --mac --config electron-builder.cn.yml --publish never`（参考现有 `package`/`package:dir`）
   - 产物在 `apps/desktop/release/`；确认 `.app` 的 Info.plist CFBundleName/appId 与官方不同；userData 会落在 `~/Library/Application Support/Pi GUI CN`（与官方 `pi-gui` 目录隔离）
   - 跑打包前 `pnpm verify:packaged-runtime-deps`（linux/win 变体不用跑）
8. **交付文档**（写进 docs/ 或根目录新 md）：
   - 修改文件清单（git diff --stat 相对 baseline）
   - 测试报告（typecheck/guards/lint/unit/e2e/dev 冒烟的实际命令与结果）
   - 使用说明（如何切换语言、如何构建 CN 版）
   - **上游同步维护说明**：语言资源集中在 `src/i18n/`，同步上游后跑 typecheck 会立刻暴露新增/缺失 key（zh 字典类型强制）；组件里 t("key") 的 key 是字面量，上游 merge 冲突集中在字典文件；给上游提 PR 时可只保留 en-us.ts 的新增 key 并补 zh。
   - 最后 `git add -A && git commit` 分小步提交（AGENTS.md 要求 small focused checkpoints；**不要 push**）。

## 6. 安全红线（再次强调）

- 不覆盖 `/Applications/pi-gui.app`；CN 版必须独立 productName+appId。
- dev/测试一律 `PI_APP_USER_DATA_DIR` 隔离，不碰官方 userData（`~/Library/Application Support/pi-gui`）与 `~/.pi/`（真实 CLI 会话）。
- 不输出任何 API Key/OAuth Token；不读用户真实会话内容做测试。
- 不改模型 system prompt、工具 schema、pi-sdk-driver、provider 协议——目前所有改动都在 renderer 层，符合此约束。
- 不自动 push GitHub；不修改 Gatekeeper。

## 7. 快速上下文（供新 agent 10 分钟上手）

```bash
cd /Users/jack/项目/开源/agent
cat .i18n-baseline.txt                      # 基线 commit
cat apps/desktop/src/i18n/index.ts          # i18n 核心（3 分钟读懂）
head -50 apps/desktop/src/i18n/en-us.ts     # 字典结构
grep -n "useI18n" apps/desktop/src/app/App.tsx   # 全局订阅点
# 残留英文扫描（见 §4 命令）
```

翻译风格基线（已用于全部 zh 词条，请保持一致）：

- 专有名词保留英文：Pi、pi-gui、Agent、Token、Provider、API Key、OAuth、Git、Worktree、Commit、Diff、MCP、Review（作面板名时保留）、Code mode、Skill、Extension、Slash command（斜杠命令）
- "thread" 译为"会话"；"workspace" 译为"工作区"；"side panel" 译为"侧面板"；"sidebar" 译为"侧边栏"
- 中英文间距：中文文案中夹英文/数字两侧通常不加空格（遵循已有词条），标点用全角
- 复数用 `{count}` 参数 + 中文量词（"3 个文件"）；en 用 two keys（`xxxOne`/`xxxMany`）
