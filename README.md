# Session Manager 1.2.0

A community plugin for DeepSeek Harness (DSH), providing session search, archive management, and interaction enhancements. Local source is the primary maintenance copy; GitHub stable releases are published when needed.

[简体中文](README.zh-CN.md) · [Changelog](CHANGELOG.md) · [Stable releases](https://github.com/hxc0624/dsh-archive-manager/releases) · [Issues](https://github.com/hxc0624/dsh-archive-manager/issues)

## Features

- Compact project lists for archived and unarchived sessions, with favorites, collapsible groups, and selection across projects.
- Search titles or user and assistant text; combine project, favorite, and updated-date filters. Sort by updated time or created time.
- Archive, restore, or permanently delete individual sessions or batches, with progress, failure details, and retry of remaining items.
- Preview idle sessions before archiving, protecting favorites and opened, running, or interactive sessions by default. Undo sessions successfully archived in the current operation.
- Quick archive previews, turn counts, session ID/path copying, and diagnostics with repair of supported legacy logs.
- Host themes, native session navigation, sidebar actions, and responsive narrow-window layouts.

Open **Settings → Session Manager**. Filters are collapsed by default and active conditions appear as removable chips. Batch actions appear after selection. Switching tabs clears selection; changing filters preserves it. Review hidden selections before operating. Project menu actions apply to the entire project, regardless of filters.

Content search reads persisted user and assistant text, excluding tool outputs, attachments, reasoning, and system messages. Reads are batched at up to 20 sessions; there is no persistent full-text index, so narrow filters for large histories. Permanent deletion requires confirmation and cannot be undone. Archiving is reversible. Idle organization is manually triggered.

## Requirements and installation

Supported DSH releases: `0.1.2-rc.1`, `0.1.5-rc.1`–`0.1.5-rc.3`, `0.1.7-rc.1`–`0.1.7-rc.2`, and `0.2.0-rc.1`–`0.2.0-rc.2`. Node.js must satisfy `^22.19.0 || >=24.0.0`; source builds use the pnpm version specified in package.json. Other host versions are outside the current support range.

Install a stable version, replacing `web` with your profile:

```powershell
dsh plugin --profile web add https://github.com/hxc0624/dsh-archive-manager/releases/latest/download/dsh-archive-manager.tgz --registry=https://registry.npmjs.org/
```

Restart DSH; refresh browser installations with `Ctrl+Shift+R`. The profile must include `ui-workspace-archive-manager`. Remove old overrides disabling the official `workspace`, `session-projection-cache`, or `ui-workspace`. On DSH 0.1.6+, disable `ui-settings-unarchive-sessions` to avoid duplicate settings entries.

## Local maintenance

Edit TypeScript in `src`; `lib` contains generated runtime files. Commit both. The repository keeps current source, runtime files, required resources, build/release scripts, and documentation. Test fixtures and verification artifacts are kept outside the repository.

```powershell
git clone https://github.com/hxc0624/dsh-archive-manager.git
Set-Location .\dsh-archive-manager
pnpm install --frozen-lockfile
pnpm verify
```

Use your existing checkout for unpublished local changes. `pnpm typecheck` checks source types, `pnpm build` generates and checks runtime files, and `pnpm verify` also checks packaging and generated-file policy. Functional regression runs use a temporary validation environment outside the repository.

Sync to an existing Desktop installation:

```powershell
pnpm install:local --target "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\@michengai\dsh-archive-manager"
```

This builds, backs up replaced files, and verifies each copied file. Backups and receipts are stored in `.browser-verification/local-installs` and can be removed after verification. The command only syncs existing installations; runtime dependency changes require installation through DSH first. Fully exit and reopen DSH afterward.

## GitHub stable releases

Daily changes do not require a release. Opening settings does not contact GitHub. Use **More → Check GitHub stable release** when needed. Version comparison reflects only the base version and cannot establish whether unpublished local source matches GitHub. Installing a stable release replaces the local build and requires acknowledging that needed source has been saved.

To publish, update package.json and both changelogs, run `pnpm release:preflight`, commit source and generated `lib`, then push the matching `vX.Y.Z` tag. GitHub Actions verifies types, build, and package structure, then publishes `dsh-archive-manager.tgz` and `SHA256SUMS.txt`. Published versions are not replaced, and the plugin is not published to npm.

## Compatibility and license

The installed package identity remains `@michengai/dsh-archive-manager`. This customization is based on [MichengAI/dsh-archive-manager](https://github.com/MichengAI/dsh-archive-manager) 1.0.16, under [Apache-2.0](LICENSE). Generated files retain third-party license notices.

Integrations should use `workspaceRegistry.searchSessionContent({ sessionIds, query })`; the legacy `searchArchivedContent` entry retains its archived-only semantics. Repair requires an archived session that is not open in any DSH process. Unknown corruption, missing files, and permission issues receive diagnostic guidance. Include host/plugin versions, reproduction steps, and error details when reporting issues.
