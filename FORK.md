# HXC DSH Toolkit

HXC DSH Toolkit（DSH 增强工具箱）面向 DeepSeek Harness 的会话管理与交互增强。从 `1.1.0` 起使用独立版本号，功能按本项目的节奏扩展。

本仓库基于 [MichengAI/dsh-archive-manager](https://github.com/MichengAI/dsh-archive-manager)，当前上游基础版本为 **1.0.16**。最初的个人版本为 `1.0.16-hxc.1`，该标签和发布包保留。继续使用 [Apache-2.0](LICENSE)，保留原作者及第三方版权声明。

## 独立版本规则

| 变更 | 版本示例 |
| --- | --- |
| 修复问题、兼容性调整 | `1.1.0` → `1.1.1` |
| 增加兼容现有行为的功能 | `1.1.0` → `1.2.0` |
| 不兼容的接口或配置变更 | `1.x` → `2.0.0` |

新发布使用 `vX.Y.Z` 标签，不再添加 `-hxc.N`。上游基础版本单独记录在本文；合并上游后根据实际变更增加 Toolkit 版本，同时更新上游基础版本和双语更新日志。当前发布流程只接受稳定版本，预发布渠道可在需要时单独设计。

## 你控制的三件事

1. **何时合并上游**：上游发版不会自动同步到此仓库。
2. **何时发布**：推送稳定版本标签才运行发布流程。只推送 `main` 会执行验证。
3. **何时安装**：插件可以检查版本，但只有点击更新或执行安装命令才安装。

内置更新与手工命令只使用 [本仓库 Releases](https://github.com/hxc0624/dsh-archive-manager/releases)。GitHub 查询失败会显示失败，不会安装官方 npm 版本。

## 保留的定制

- 侧栏单条会话删除确认框宽 360px，水平、垂直居中；窄窗口保留两侧 16px 边距。
- 显示“删除此会话？”和会话名，不显示永久删除说明。
- 12px 圆角、柔和阴影、宿主亮暗主题、32px 按钮与红色删除按钮。
- 默认聚焦取消；Esc／遮罩可取消；提交中禁止重复请求；失败可重试。
- 删除成功后立即释放当前聊天视图；等待删除期间切换到其他会话时保留新页面。批量删除只清理成功删除或确认已不存在的当前会话。

相关源码：`src/delete-session-dialog.ts`、`src/client.ts`。删除仍调用上游既有接口，取消操作不会删除数据。

<a id="install-and-upgrade"></a>

## 安装和升级

插件包仍使用 `@michengai/dsh-archive-manager` 作为运行标识，以兼容既有配置；安装来源是你自己的 GitHub 资源 URL。`package.json` 的 `private: true` 用于阻止误发布到原作者的 npm 名下，GitHub 仓库和 Release 均为公开。

Web 示例，按实际环境替换 profile：

```powershell
dsh plugin --profile web add https://github.com/hxc0624/dsh-archive-manager/releases/latest/download/dsh-archive-manager.tgz --registry=https://registry.npmjs.org/
```

Desktop 使用其自带的插件安装器，安装同一 URL；不要使用普通 Web CLI 操作 Desktop profile。安装后完全退出并重新打开 Desktop，在“设置 → DSH 增强工具箱 → 检查更新”中确认运行版本和更新来源 `hxc0624/dsh-archive-manager`。

### 从 1.0.16-hxc.1 首次迁移

旧版更新器只接受 `X.Y.Z-hxc.N`，无法自动识别 `1.1.0`。先备份插件与 profile 配置，再用 Desktop 自带安装器安装以下固定版本地址：

```text
https://github.com/hxc0624/dsh-archive-manager/releases/download/v1.1.0/dsh-archive-manager.tgz
```

Web 用户可将上面命令中的 `latest/download` 地址替换为该固定地址。升级保留原包标识、服务接口和现有配置，已有归档与收藏继续使用。新版更新器识别独立版本以及历史个人版本，后续直接使用“检查更新”。

末尾的 npm registry 参数只用于依赖解析，插件本体从 GitHub 下载。正常安装会把当前 profile 的依赖保存为 GitHub URL。主动改回官方 `@latest`、从官方市场重新安装，或覆盖该依赖来源，仍会装回原版。

## 合并上游并发布

本地 Git remote：`origin` 指向个人 Fork，`upstream` 指向 MichengAI 原仓库。保持本地工作区已提交，再执行：

```powershell
git fetch upstream
git switch main
git merge --no-commit --no-ff upstream/main
```

检查并解决冲突，保留弹窗及删除视图修复、Toolkit 名称、`src/release-channel.ts`、更新器对它的引用、发布工作流，以及 `package.json` 的独立版本号和 `private: true`。合并没有冲突也需要查看 diff。

按本文的独立版本规则发版。例如合并上游 `1.0.17` 只带来问题修复时，Toolkit 可从 `1.1.0` 更新到 `1.1.1`；同时将本文的上游基础版本更新为 `1.0.17`。

```powershell
pnpm install --frozen-lockfile
pnpm verify
git diff --check
```

从源码构建的 `lib` 也需要提交；本地安装包、浏览器验证产物与缓存已忽略。确认弹窗及更新渠道后提交并推送，再以实际版本创建标签，例如：

```powershell
git add src lib scripts test package.json pnpm-lock.yaml .github .gitignore README.md README.zh-CN.md FORK.md CHANGELOG.md CHANGELOG.zh-CN.md
git commit -m "Release HXC DSH Toolkit 1.1.1"
git push origin main
git tag v1.1.1
git push origin v1.1.1
```

`HXC DSH Toolkit release` 工作流验证标签、构建、运行测试和兼容矩阵，然后发布 `dsh-archive-manager.tgz` 与 `SHA256SUMS.txt`。Release 标题为 `HXC DSH Toolkit vX.Y.Z`。无须 npm 账号或 token。两个资源上传完成后才公开 Release。

GitHub 的 Release 设为正式发布，让 `/releases/latest` 能查询到它。更新器同时识别本仓库的稳定版本和历史 `-hxc.N` 版本，按语义化版本顺序比较。草稿、GitHub 预发布、缺失安装包或来自其他仓库的下载地址不会被接受。

若首次 Fork 的 Actions 被禁用，在仓库 Actions 页启用。上传失败会保留草稿，可手动运行工作流并填写原标签重试；已公开版本不覆盖，修复需发布新版本。发布旧版本不会抢占更高版本的 Latest 标记。

## English

HXC DSH Toolkit uses independent stable `vX.Y.Z` releases starting at 1.1.0. Its current upstream base is MichengAI Archive Manager 1.0.16. The upstream Apache-2.0 license, runtime package identity, repository URL, and asset filename remain compatible with existing installations. Patch, minor, and major increments represent fixes, compatible features, and breaking changes respectively; upstream versions are tracked separately here.

Existing 1.0.16-hxc.1 users must install 1.1.0 once through Desktop's bundled plugin installer or the Web CLI because their old updater only recognizes `-hxc.N` tags. The new updater accepts both independent stable releases and historical fork releases from `hxc0624/dsh-archive-manager`. Published tags are preserved. No npm publication is used. See [CHANGELOG.md](CHANGELOG.md) for release history.
