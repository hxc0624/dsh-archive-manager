# 会话管理 · Session Manager 1.2.0

DeepSeek Harness（DSH）的社区插件，提供会话检索、归档整理和交互增强。本地源码作为维护主体，GitHub 按需发布稳定版本。

[English](README.md) · [更新日志](CHANGELOG.zh-CN.md) · [稳定版本](https://github.com/hxc0624/dsh-archive-manager/releases) · [反馈](https://github.com/hxc0624/dsh-archive-manager/issues)

## 当前功能

- 已归档与未归档会话采用轻量项目分组列表，支持收藏、折叠分组及跨项目选择。
- 搜索标题或用户与助手的正文，组合项目、收藏和更新时间范围筛选；排序仅提供更新时间和创建时间。
- 单条或批量归档、恢复及永久删除，显示处理进度、失败详情并支持重试剩余项。
- 预览闲置会话后再归档，默认保护收藏、已打开、运行中和等待交互的会话；可以撤回本次成功归档。
- 归档内容快速预览、轮次统计、复制会话 ID／路径；读取异常时提供诊断与支持的旧日志修复。
- 使用宿主主题、原生会话导航和侧栏菜单，适配窄窗口。

打开「设置 → 会话管理」。筛选默认收起，已启用条件显示为可移除标签，勾选会话后显示批量操作。切换页签清空选择，切换筛选保留选择；操作前留意当前未显示的已选数量。项目菜单作用于该项目全部会话，不受筛选影响。

正文检索只包含持久化用户与助手文本，不包含工具输出、附件、推理或系统消息。每批最多读取 20 条会话，未建立持久化全文索引；大量长会话建议先缩小筛选范围。永久删除会要求确认且无法撤回，归档可以恢复。闲置整理由用户手动触发，没有后台自动归档。

## 环境与安装

支持 DSH `0.1.2-rc.1`、`0.1.5-rc.1`～`0.1.5-rc.3`、`0.1.7-rc.1`～`0.1.7-rc.2`、`0.2.0-rc.1`～`0.2.0-rc.2`。Node.js 需满足 `^22.19.0 || >=24.0.0`，源码构建使用 package.json 指定的 pnpm 版本。其他宿主版本尚未纳入支持范围。

首次安装稳定版（将 `web` 换成实际 profile）：

```powershell
dsh plugin --profile web add https://github.com/hxc0624/dsh-archive-manager/releases/latest/download/dsh-archive-manager.tgz --registry=https://registry.npmjs.org/
```

安装后重启 DSH；浏览器版按 `Ctrl+Shift+R` 刷新。配置应包含 `ui-workspace-archive-manager`。如旧配置禁用了官方 `workspace`、`session-projection-cache` 或 `ui-workspace`，移除这些覆盖；DSH 0.1.6+ 应禁用官方 `ui-settings-unarchive-sessions`，避免重复入口。

## 本地维护

业务源码在 `src`，`lib` 为生成的运行文件，二者一起提交。仓库只保留当前源码、运行文件、必要资源、构建与发布脚本及文档，测试夹具和验证产物不随仓库保留。

```powershell
git clone https://github.com/hxc0624/dsh-archive-manager.git
Set-Location .\dsh-archive-manager
pnpm install --frozen-lockfile
pnpm verify
```

已有本地修改时直接使用现有工作副本。`pnpm typecheck` 检查源码类型，`pnpm build` 生成并检查运行文件，`pnpm verify` 同时检查打包和生成文件策略。当前功能回归使用仓库外的临时验证环境。

同步到已安装的 Desktop 插件：

```powershell
pnpm install:local --target "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\@michengai\dsh-archive-manager"
```

命令先构建，再备份被覆盖的文件并逐个校验。备份和安装记录位于 `.browser-verification/local-installs`，验证成功后可清理。它只同步现有安装；运行依赖发生变化时需先通过 DSH 安装器安装。完成后完全退出并重新打开 DSH。

## GitHub 稳定版本

日常修改无需发布。页面打开时不访问 GitHub；需要时选择「更多 → 检查 GitHub 稳定版」。版本比较只反映基础版本号，无法判断未发布的本地源码是否与 GitHub 一致。安装稳定版会替换本地构建，界面要求先确认已保存需要的源码。

发布前修改 package.json 版本并更新中英文日志，运行 `pnpm release:preflight`，提交源码和生成的 `lib`，再推送对应 `vX.Y.Z` 标签。GitHub Actions 检查类型、构建和包结构，发布 `dsh-archive-manager.tgz` 与 `SHA256SUMS.txt`。已发布版本不覆盖，插件不发布到 npm。

## 兼容与许可

插件保留安装标识 `@michengai/dsh-archive-manager`。基于 [MichengAI/dsh-archive-manager](https://github.com/MichengAI/dsh-archive-manager) 1.0.16 定制，沿用 [Apache-2.0](LICENSE)，并保留生成文件中的第三方许可声明。

集成检索使用 `workspaceRegistry.searchSessionContent({ sessionIds, query })`；旧入口 `searchArchivedContent` 保持归档范围语义。诊断修复要求会话已归档且未在任何 DSH 进程打开；未知损坏、权限或文件缺失只提供处理建议。遇到问题请附 DSH 与插件版本、复现步骤和错误信息提交反馈。
