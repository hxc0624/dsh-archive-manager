# hxc0624 个人定制版

本仓库基于 [MichengAI/dsh-archive-manager](https://github.com/MichengAI/dsh-archive-manager)，原作者与第三方版权声明保留，继续使用 [Apache-2.0](LICENSE)。个人改动从 `1.0.16-hxc.1` 开始，详见双语更新日志。

## 你控制的三件事

1. **何时合并上游**：上游发版不会自动同步到此仓库。
2. **何时发布**：推送个人版本标签才运行发布流程。只推送 `main` 会执行验证。
3. **何时安装**：插件可以检查版本，但只有点击更新或执行安装命令才安装。

内置更新与手工命令只使用 [本仓库 Releases](https://github.com/hxc0624/dsh-archive-manager/releases)。GitHub 查询失败会显示失败，不会安装官方 npm 版本。

## 保留的定制

- 侧栏单条会话删除确认框宽 360px，水平、垂直居中；窄窗口保留两侧 16px 边距。
- 显示“删除此会话？”和会话名，不显示永久删除说明。
- 12px 圆角、柔和阴影、宿主亮暗主题、32px 按钮与红色删除按钮。
- 默认聚焦取消；Esc／遮罩可取消；提交中禁止重复请求；失败可重试。

相关源码：`src/delete-session-dialog.ts`、`src/client.ts`。删除仍调用上游既有接口，取消操作不会删除数据。

## 安装和升级

插件包仍使用 `@michengai/dsh-archive-manager` 作为运行标识，以兼容既有配置；安装来源是你自己的 GitHub 资源 URL。`package.json` 的 `private: true` 用于阻止误发布到原作者的 npm 名下，GitHub 仓库和 Release 均为公开。

Web 示例，按实际环境替换 profile：

```powershell
dsh plugin --profile web add https://github.com/hxc0624/dsh-archive-manager/releases/latest/download/dsh-archive-manager.tgz --registry=https://registry.npmjs.org/
```

Desktop 使用其自带的插件安装器，安装同一 URL；不要使用普通 Web CLI 操作 Desktop profile。首次安装后，在“设置 → 归档会话 → 检查更新”中确认更新来源为 `hxc0624/dsh-archive-manager`。安装后完全退出并重新打开 Desktop。

末尾的 npm registry 参数只用于依赖解析，插件本体从 GitHub 下载。正常安装会把当前 profile 的依赖保存为 GitHub URL。主动改回官方 `@latest`、从官方市场重新安装，或覆盖该依赖来源，仍会装回原版。

## 合并上游并发布

本地 Git remote：`origin` 指向个人 Fork，`upstream` 指向 MichengAI 原仓库。保持本地工作区已提交，再执行：

```powershell
git fetch upstream
git switch main
git merge --no-commit --no-ff upstream/main
```

检查并解决冲突，保留弹窗组件、`src/release-channel.ts`、更新器对它的引用、个人发布工作流，以及 `package.json` 的个人版本号和 `private: true`。合并没有冲突也需要查看 diff。

版本规则为“上游版本 + 个人修订号”。例如上游仍为 `1.0.16` 时，下次用 `1.0.16-hxc.2`；合并上游 `1.0.17` 后用 `1.0.17-hxc.1`。同时更新两份 CHANGELOG。

```powershell
pnpm install --frozen-lockfile
pnpm verify
git diff --check
```

从源码构建的 `lib` 也需要提交；本地安装包、浏览器验证产物与缓存已忽略。确认弹窗及更新渠道后提交并推送，再以实际版本创建标签，例如：

```powershell
git add src lib scripts test package.json pnpm-lock.yaml .github .gitignore README.md README.zh-CN.md FORK.md CHANGELOG.md CHANGELOG.zh-CN.md
git commit -m "Merge upstream and retain personal customizations"
git push origin main
git tag v1.0.17-hxc.1
git push origin v1.0.17-hxc.1
```

`Personal GitHub release` 工作流验证标签、构建、运行测试和兼容矩阵，然后发布 `dsh-archive-manager.tgz` 与 `SHA256SUMS.txt`。无须 npm 账号或 token。两个资源上传完成后才公开 Release。

GitHub 的 Release 设为正式发布，让 `/releases/latest` 能查询到它；版本中的 `-hxc.N` 仅表示个人修订。草稿、GitHub 预发布、上游原版标签、缺失安装包或来自其他仓库的下载地址不会被更新器接受。

若首次 Fork 的 Actions 被禁用，在仓库 Actions 页启用。上传失败会保留草稿，可手动运行工作流并填写原标签重试；已公开版本不覆盖，修复需增加个人修订号。发布旧版本不会抢占更高版本的 Latest 标记。

## English

This personal fork retains the upstream Apache-2.0 license and runtime package identity. It maintains a compact centered sidebar delete dialog and checks only `hxc0624/dsh-archive-manager` GitHub Releases. The owner chooses when to merge upstream, publish `vX.Y.Z-hxc.N` tags, and install updates. No npm publication is used. See [CHANGELOG.md](CHANGELOG.md) for each personal revision.
