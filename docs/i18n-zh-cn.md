# 简体中文界面（zh-CN i18n）交付说明

pi-gui 桌面端新增运行时中英文切换：Settings → Appearance → Language（跟随系统 / English / 简体中文），语言即时生效、跨窗口同步、随应用持久化。默认 `auto` 跟随操作系统语言（zh* → 简体中文，其余 → English）。

基线 commit：`d6f8c4641a880bd2f29ca400a6593a40aa24c49f`（记录在 `.i18n-baseline.txt`）。

## 使用

- **切换语言**：Settings（⌘,）→ Appearance → Language。选择立即生效，无需重启；`跟随系统` 会跟随操作系统的语言变化。
- **构建 CN 版应用**：`cd apps/desktop && pnpm run package:mac:cn`。产物在 `apps/desktop/release/`（`Pi GUI CN-<version>-arm64.dmg` 与 `release/mac-arm64/Pi GUI CN.app`）。CN 版的 `CFBundleName` 为 `Pi GUI CN`、appId 为 `com.pi-gui.desktop.cn`，与官方 `pi-gui.app` 可共存，用户数据互相隔离（`~/Library/Application Support/Pi GUI CN`）。
  - 无上游签名证书：`mac.identity: null`，electron-builder 对 arm64 保留 ad-hoc 签名（`codesign -dv` 显示 `Signature=adhoc`），本机可直接启动；分发给他人时首次打开需右键 → 打开。
  - 打包后校验：`pnpm verify:packaged-runtime-deps` 硬编码检查 `release/mac-arm64/pi-gui.app`，对 CN 产物可临时 `ln -sfn "Pi GUI CN.app" release/mac-arm64/pi-gui.app` 跑完再删。
  - 网络受限时 electron-builder 下载 dmgbuild-bundle 可能失败：把 `dmgbuild-bundle-arm64-<hash>.tar.gz` 手动放进 `~/Library/Caches/electron-builder/dmg-builder@<版本>/`，或走本地代理。
- 上游原版 `electron-builder.yml` 未改动；CN 配置在 `electron-builder.cn.yml`。

## 架构

- `apps/desktop/src/i18n/` 是语言的唯一归属：
  - `index.ts` — 模块级 store（仿 `src/ui/active-theme.ts` 的 `useSyncExternalStore` 模式，非 Context）。设置存 localStorage `pi-gui.language`；多窗口经 `storage` 事件同步；`languagechange` 跟随系统。`t(key, params?)` 是独立函数（非 hook），供非组件代码调用；`useI18n()` 供组件订阅。`navigator.webdriver` 为 true（Playwright 自动化）时 `auto` 固定解析为 en-US，使断言英文文案的测试与操作系统语言无关。
  - `en-us.ts` — 英文词典，key 集合的唯一真源（`TranslationKey`）。
  - `zh-cn.ts` — `Record<TranslationKey, string>`，类型层面强制全量，缺 key 直接 typecheck 失败。
- 设计约束（保持不变）：
  - 语言状态只存 renderer localStorage，不进 DesktopAppState / IPC / contracts；主进程通知文案（notification-manager / update-checker）仍为英文，属可选项。
  - 模块级常量中的文案改为运行时解析（`settingsSectionDefinition()`、`hostActionSlashCommands()`、`thinkingOptions()`、`builtinToolLabel()`、`scopeLabel()`、`commandFilters()`、schedule-format.ts 等），保证切换语言后立即更新。
  - contracts 不 import renderer i18n；scheduled tasks 的契约格式化函数保留英文（有单测），renderer 侧新建 `schedule-format.ts` 本地化。
  - memo 组件需在组件体内调用 `useI18n()` 才会随语言切换重渲染（如 `TimelineItem`）。
  - 回传给 extension iframe 的 host-action-result 错误文本保持英文（协议消息，非 UI）。
  - 时间线里 pi 运行时生成的 activity/summary label 不翻译（与"不改模型/运行时输出"的边界一致）。

## 改动清单（相对基线，`git diff --stat` 约 72 个文件，+1631/−1163）

- 新增：`src/i18n/{index.ts,en-us.ts,zh-cn.ts}`、`src/features/scheduled-tasks/schedule-format.ts`、`tests/unit/i18n.spec.ts`、`tests/core/i18n-language.spec.ts`、`electron-builder.cn.yml`、`.i18n-baseline.txt`
- 修改：全部在 `apps/desktop` 内 —— 渲染层 UI 文案接入 t()（app/、conversation/、threads/、workbench/、command-palette/、settings/、scheduled-tasks/、extensions/、lib/string-utils.ts、main.tsx）；`electron/main.ts` 未改；contracts/、packages/、website/ 未动。

## 测试报告（macOS Apple Silicon，node v22.19.0 / pnpm 10.25.0 / Electron 37.10.3）

| 检查                             | 命令                                                                                                 | 结果                                                                                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 类型检查                         | `cd apps/desktop && pnpm typecheck`（renderer + electron 两个 tsconfig）                             | ✅ 0 错误                                                                                                                               |
| 共享包构建                       | `pnpm build:shared`                                                                                  | ✅                                                                                                                                      |
| 架构守卫                         | `pnpm check:architecture`（renderer boundary / contract authority / host boundary / timeline owner） | ✅ 4 项全过                                                                                                                             |
| 守卫测试                         | `pnpm test:guards`                                                                                   | ✅ 114/114                                                                                                                              |
| 格式                             | `pnpm format:check`（prettier）                                                                      | ✅                                                                                                                                      |
| Lint                             | `pnpm lint`（eslint --max-warnings 0）                                                               | ✅ 0 警告                                                                                                                               |
| 单元测试                         | `pnpm test:desktop-unit`                                                                             | ✅ 346 通过（1 skip；`app-operations.spec.ts` 的 1 个失败为存量环境问题，stash 全部改动后在基线上同样失败：macOS `/var` realpath 差异） |
| E2E 语言切换（真 Electron 界面） | `playwright test tests/core/i18n-language.spec.ts`                                                   | ✅ 覆盖：切换即时生效、`<html lang>`、renderer 重载后保持、应用重启后保持、⌘K 命令面板、切回英文                                        |
| E2E core lane                    | `pnpm --filter @pi-gui/desktop run test:e2e:core`                                                    | ✅ 292/292 通过（11.1 分钟，中文系统的 Mac 上）                                                                                         |
| 真机冒烟                         | 隔离 userData 启动，截图核对中文设置页/主界面/命令面板，无乱码、无溢出                               | ✅（截图 `/tmp/i18n-verify/`）                                                                                                          |
| CN 打包                          | `pnpm run package:mac:cn` → `release/Pi GUI CN-1.0.1-arm64.dmg`（152MB）                             | ✅ Info.plist 为 `com.pi-gui.desktop.cn`/`Pi GUI CN`；ad-hoc 签名可启动；`verify:packaged-runtime-deps` 通过                            |

真机验证中实修的两个缺陷：

1. **设置显示陈旧语言**：`applySetting()` 原本只在解析语言变化时才刷新订阅者——系统语言已是中文时，显式选择“简体中文”后选择框仍显示“跟随系统”。现在 setting 变化也重建 api 并通知订阅者（`i18n/index.ts`）。
2. **命令面板 aria-label 带省略号**：翻译重构把对话框标题与命令条目标题混用（"Go to file…"）。拆出 `palette.goToFileLabel`/`palette.switchModelLabel` 与基线对齐。

已知问题（与本任务无关的存量问题）：

- `tests/unit/app-operations.spec.ts` 的 1 个用例在本机失败（macOS `/var` → `/private/var` realpath），基线上同样失败。

## 上游同步维护

- 语言资源集中在 `src/i18n/`。同步上游后跑 `pnpm typecheck` 会立刻暴露新增/缺失的 key（`zh-cn.ts` 类型强制全量）；组件里 `t("key")` 的 key 是字面量，merge 冲突大概率集中在两个词典文件。
- 给上游提 PR 时可只保留 `en-us.ts` 的新增 key，并按需补 `zh-cn.ts`；`navigator.webdriver` 的 en-US 固定逻辑在 `resolveSystemLanguage()`，测试类 PR 需带上。
- 新增 UI 文案的规范：面向用户的字符串一律走 `t()`；模块级常量里不得存文案（用函数延迟解析）；回传扩展/主进程的协议文本保持英文。
