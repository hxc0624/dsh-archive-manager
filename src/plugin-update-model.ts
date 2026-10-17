import { releaseAssetUrl } from "./release-channel.js";

export interface UpdatePayload { packageName: string; releaseRepository?: string; currentVersion: string; updateAvailable: boolean; profileName: string; canAutoUpdate: boolean; latestCheckFailed: boolean; latestVersion?: string; autoReload?: boolean; restartDesktop?: boolean }
type UpdatePhase = "idle" | "checking" | "updating";
type UpdateNotice = { type: "status" } | { type: "restart" } | { type: "restarting" } | { type: "error"; message: string };

export const ZH = {
	check: "检查 GitHub 稳定版", update: "稳定版本", recheck: "重新检查", auto: "安装稳定版", updating: "正在安装…", copy: "复制命令", copied: "已复制", copyFailed: "复制失败",
	source: "更新来源", forkIntro: "由 hxc0624 独立维护，从 GitHub Releases 获取稳定版本。",
	checking: "正在检查稳定版…", latest: "已是最新稳定版", found: "发现新版本", failed: "暂时无法检查更新，请稍后重试。", current: "当前版本", latestLabel: "最新稳定版", profile: "安装目标", unknown: "未知",
	overwrite: "我了解安装稳定版会替换当前插件的本地构建，已保留需要的源码和改动。",
	manual: "终端安装稳定版", manualHint: "如需通过终端安装，在当前 DSH 终端执行此命令，完成后重启 DSH Web。", manualHintDesktop: "如需通过终端安装，请先完全退出 DSH Desktop，再用 Desktop 自带的 dsh 执行此命令。普通 dsh 会拒绝 desktop profile。", intro: "源码中的未发布改动不参与版本号比较。", restart: "安装完成，请重启 DSH Web。", restartDesktop: "安装完成，请完全退出并重新打开 DSH Desktop。", restarting: "安装完成，正在重启 DSH Desktop…", unavailable: "当前环境不支持界面安装，可使用终端安装命令。",
};
export const EN = {
	check: "Check GitHub stable release", update: "Stable releases", recheck: "Check again", auto: "Install stable release", updating: "Installing…", copy: "Copy command", copied: "Copied", copyFailed: "Copy failed",
	source: "Update source", forkIntro: "Independently maintained by hxc0624. Stable updates come from GitHub Releases.",
	checking: "Checking stable release…", latest: "Up to date", found: "New version available", failed: "Unable to check for updates. Try again later.", current: "Current version", latestLabel: "Latest stable version", profile: "Install target", unknown: "Unknown",
	overwrite: "I understand that installing a stable release replaces this plugin's local build, and have retained my source and changes.",
	manual: "Install stable release in terminal", manualHint: "To install from the terminal, run this command in the current DSH terminal, then restart DSH Web.", manualHintDesktop: "To install from the terminal, fully quit DSH Desktop, then run this command with Desktop's own dsh. A regular dsh rejects the desktop profile.", intro: "Unpublished source changes are not compared by version number.", restart: "Installation complete. Restart DSH Web.", restartDesktop: "Installation complete. Fully quit and reopen DSH Desktop.", restarting: "Installation complete. Restarting DSH Desktop…", unavailable: "Installation from this interface is unavailable. Use the terminal command.",
};
type UpdateStrings = { [Key in keyof typeof ZH]: string };

/** 只看 html lang。设置页正文里的 Settings 不能把中文界面判成英文。 */
export function pluginUpdateCopy(lang: string): UpdateStrings {
	return lang.toLowerCase().startsWith("zh") ? ZH : EN;
}

export function describePluginUpdate(lang: string, payload: UpdatePayload | undefined, phase: UpdatePhase, notice: UpdateNotice) {
	const base = pluginUpdateCopy(lang);
	const desktop = payload?.restartDesktop === true || payload?.profileName === "desktop";
	const copy = desktop ? { ...base, manualHint: base.manualHintDesktop } : base;
	const busy = phase !== "idle";
	let message = copy.checking;
	let kind = "";
	if (phase === "checking") message = copy.checking;
	else if (phase === "updating") message = copy.updating;
	else if (notice.type === "error") { message = notice.message || copy.failed; kind = "error"; }
	else if (notice.type === "restart") { message = desktop ? copy.restartDesktop : copy.restart; kind = "success"; }
	else if (notice.type === "restarting") { message = copy.restarting; kind = "success"; }
	else if (payload === undefined) message = copy.checking;
	else if (payload.latestCheckFailed) { message = copy.failed; kind = "error"; }
	else if (!payload.canAutoUpdate && payload.updateAvailable) { message = copy.unavailable; kind = "update"; }
	else if (payload.updateAvailable) { message = `${copy.found}: v${payload.latestVersion ?? copy.unknown}`; kind = "update"; }
	else { message = copy.latest; kind = "success"; }
	return {
		copy, busy, message, kind, loading: phase === "updating",
		updateLabel: phase === "updating" ? copy.updating : copy.auto,
		disabled: busy || notice.type === "restart" || notice.type === "restarting" || payload?.canAutoUpdate !== true || payload.updateAvailable !== true,
		currentVersion: payload === undefined ? copy.unknown : `v${payload.currentVersion}`,
		latestVersion: payload?.latestVersion === undefined ? copy.unknown : `v${payload.latestVersion}`,
		profileName: payload?.profileName ?? copy.unknown,
		profileRaw: payload?.profileName ?? "",
		latestRaw: payload?.latestVersion ?? "latest",
	};
}

export function createUpdateFlow(request: (method: "GET" | "POST", acknowledgeOverwrite?: boolean) => Promise<UpdatePayload>, initial?: UpdatePayload, onPayload?: (value: UpdatePayload) => void) {
	let phase: UpdatePhase = "idle";
	let current = initial;
	let notice: UpdateNotice = { type: "status" };
	let posts = 0;
	const listeners = new Set<() => void>();
	const emit = () => { for (const listener of listeners) listener(); };
	const assign = (next: UpdatePayload) => { current = next; onPayload?.(next); };
	return {
		get posts() { return posts; },
		subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
		view(lang: string) { return describePluginUpdate(lang, current, phase, notice); },
		async check() {
			if (phase !== "idle") return;
			phase = "checking"; notice = { type: "status" }; emit();
			try { assign(await request("GET")); notice = { type: "status" }; }
			catch (error) { notice = { type: "error", message: error instanceof Error ? error.message : "" }; }
			finally { phase = "idle"; emit(); }
		},
		async update(acknowledgeOverwrite = false) {
			if (phase !== "idle" || notice.type === "restart" || notice.type === "restarting" || !acknowledgeOverwrite || current?.canAutoUpdate !== true || current.updateAvailable !== true) return;
			phase = "updating"; notice = { type: "status" }; posts += 1; emit();
			try {
				const next = await request("POST", true);
				assign(next);
				notice = { type: next.autoReload === true ? "restarting" : "restart" };
			} catch (error) { notice = { type: "error", message: error instanceof Error ? error.message : "" }; }
			finally { phase = "idle"; emit(); }
		},
	};
}

export function manualPluginUpdateCommand(profileName: string, version: string) {
	const selected = profileName.trim();
	if (selected !== "" && !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(selected)) throw new Error("Invalid profile name");
	const profile = selected === "" ? "" : ` --profile ${selected}`;
	return `dsh plugin${profile} add ${releaseAssetUrl(version)} --registry=https://registry.npmjs.org/`;
}

interface PluginUpdateEscapeEvent { readonly key: string; preventDefault(): void; stopPropagation(): void; stopImmediatePropagation(): void }
export function handlePluginUpdateEscape(event: PluginUpdateEscapeEvent, close: () => void) {
	if (event.key !== "Escape") return false;
	event.preventDefault();
	event.stopPropagation();
	event.stopImmediatePropagation();
	close();
	return true;
}
