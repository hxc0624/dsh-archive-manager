## 中文说明

- 更名为 HXC DSH Toolkit（DSH 增强工具箱），统一插件列表、设置入口、更新界面与文档中的名称。归档管理继续作为现有会话功能提供。
- 采用独立的 `主版本.次版本.修订版本` 规则，上游基础版本 1.0.16 单独记录在 FORK.md，后续按 Toolkit 的修复、功能和兼容性变化递增。
- 更新器识别新的稳定版本和历史 `-hxc.N` 版本；发布流程使用 `vX.Y.Z` 标签，保留现有包标识、仓库地址、下载文件名与旧发布记录。
- 修复删除后当前对话正文滞留的问题：成功后立即释放聊天视图；删除失败或等待期间切换到其他对话时保留当前页面，批量删除按实际结果清理。
- 旧 `1.0.16-hxc.1` 更新器无法识别独立版本，首次通过 Desktop 自带安装器或 Web CLI 升级到 1.1.0，重启后可继续使用自动更新。

---

## English

- Rename the plugin to HXC DSH Toolkit, with matching plugin metadata, settings entry, update UI, and documentation. Existing archive management remains available as session functionality.
- Adopt independent major.minor.patch versions for Toolkit fixes, compatible features, and breaking changes. Track the upstream Archive Manager 1.0.16 base separately in FORK.md.
- Accept stable versions and historical `-hxc.N` releases in the updater. Publish new `vX.Y.Z` tags while retaining the installed package identity, repository URL, asset filename, and published history.
- Clear the current conversation immediately after successful deletion. Preserve the view after a failed request or a switch to another conversation, and reconcile batch deletion using its actual results.
- Existing 1.0.16-hxc.1 updaters cannot recognize independent versions. Install 1.1.0 once through Desktop's bundled installer or the Web CLI, then restart to use the new automatic update rules.
