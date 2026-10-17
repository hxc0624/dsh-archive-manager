import React from "react";
import { antdLocaleFromDocument } from "./antd-locale.js";
import { AntdProvider, Button, Checkbox, Modal, Progress } from "./antd-ui.js";
import { createUpdateFlow, handlePluginUpdateEscape, manualPluginUpdateCommand, pluginUpdateCopy, ZH, EN, type UpdatePayload } from "./plugin-update-model.js";
import { isReleaseVersion, RELEASE_REPOSITORY, RELEASES_URL } from "./release-channel.js";

interface UpdateUiOptions { endpoint: string; packageName: string; zhName: string; enName: string }

const STABLE_RELEASE_EVENT = "dsham:stable-releases";
export function openStableReleaseDialog() { document.dispatchEvent(new Event(STABLE_RELEASE_EVENT)); }

type UpdateRoot = { render(node: React.ReactNode): void; unmount(): void };
function mountRoot(container: Element): UpdateRoot {
	const client = Function("return globalThis.__dshArchiveReactDOMClient")() as { createRoot?: (container: Element) => UpdateRoot } | undefined;
	const create = client?.createRoot;
	if (create === undefined) throw new Error("createRoot unavailable");
	return create(container);
}

const UPDATE_HEADER = "x-hxc0624-session-manager-update";
const STYLE_ID = "hxc0624-session-manager-update-ui";
const CSS = `
.mpi-intro{margin:0 0 16px;color:var(--dsw-alias-label-secondary,#b9b9b9);font-size:13px;line-height:20px}.mpi-meta{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:8px 18px;margin:0 0 16px;font-size:12px;line-height:18px}.mpi-meta dt{color:var(--dsw-alias-label-secondary,#b9b9b9)}.mpi-meta dd{margin:0}.mpi-mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.mpi-latest{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px}.mpi-status{font-size:13px;font-weight:600;line-height:18px}.mpi-status[data-kind=error]{color:var(--dsw-alias-state-error-primary,#ef7272)}.mpi-status[data-kind=success]{color:var(--dsw-alias-state-success-primary,#51b976)}.mpi-status[data-kind=update]{color:#e8b15a !important}.mpi-manual{border-top:1px solid var(--dsw-alias-border-l2,#494949);padding-top:16px}.mpi-manual h3{margin:0 0 6px;font-size:14px;line-height:20px}.mpi-manual p{margin:0 0 10px;color:var(--dsw-alias-label-secondary,#b9b9b9);font-size:12px;line-height:18px}.mpi-command{display:flex;align-items:flex-start;gap:8px;border:1px solid var(--dsw-alias-border-l2,#494949);border-radius:7px;padding:10px;background:var(--dsw-alias-bg-layer-3,var(--dsw-specific-menu-item-hover,#353638))}.mpi-command code{min-width:0;flex:1;overflow:visible;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;line-height:18px;white-space:pre-wrap;overflow-wrap:anywhere}@media(max-width:560px){.mpi-meta{grid-template-columns:1fr;gap:2px}.mpi-meta dd{margin-bottom:6px}}
`;

function ensureStyle() {
	const existing = document.getElementById(STYLE_ID);
	if (existing !== null) {
		if (existing.textContent !== CSS) existing.textContent = CSS;
		return;
	}
	const style = document.createElement("style");
	style.id = STYLE_ID;
	style.textContent = CSS;
	(document.head ?? document.documentElement).append(style);
}

function validPayload(value: unknown): value is UpdatePayload {
	if (value === null || typeof value !== "object") return false;
	const item = value as Record<string, unknown>;
	return typeof item.packageName === "string" && item.releaseRepository === RELEASE_REPOSITORY && typeof item.currentVersion === "string" && typeof item.updateAvailable === "boolean" && typeof item.profileName === "string" && typeof item.canAutoUpdate === "boolean" && typeof item.latestCheckFailed === "boolean" && (item.latestVersion === undefined || typeof item.latestVersion === "string" && isReleaseVersion(item.latestVersion));
}

async function requestStatus(endpoint: string, method: "GET" | "POST", signal?: AbortSignal, acknowledgeOverwrite = false) {
	const signalOption = signal === undefined ? {} : { signal };
	const response = await fetch(endpoint, method === "GET" ? { cache: "no-store", ...signalOption } : {
		method: "POST", headers: { "content-type": "application/json", [UPDATE_HEADER]: "1", "x-dsham-replace-local": acknowledgeOverwrite ? "1" : "0" }, body: "{}", ...signalOption,
	});
	const value: unknown = await response.json();
	if (!response.ok || !validPayload(value)) throw new Error(value && typeof value === "object" && "error" in value && typeof value.error === "string" ? value.error : pluginUpdateCopy(document.documentElement.lang).failed);
	return value;
}

function UpdateDialog(props: { flow: ReturnType<typeof createUpdateFlow>; packageName: string; zhName: string; enName: string; onClose: () => void }) {
	const bodyRef = React.useRef<HTMLDivElement>(null);
	const [, setRev] = React.useState(0);
	const [replaceConfirmed, setReplaceConfirmed] = React.useState(false);
	const [copyState, setCopyState] = React.useState<"idle" | "copied" | "failed">("idle");
	React.useEffect(() => props.flow.subscribe(() => setRev((value) => value + 1)), [props.flow]);
	React.useEffect(() => {
		const element = document.documentElement;
		const observer = new MutationObserver(() => setRev((value) => value + 1));
		observer.observe(element, { attributes: true, attributeFilter: ["lang"] });
		return () => observer.disconnect();
	}, []);
	React.useEffect(() => { void props.flow.check(); }, [props.flow]);
	React.useEffect(() => {
		function onKey(event: KeyboardEvent) { handlePluginUpdateEscape(event, () => { if (!props.flow.view(document.documentElement.lang).busy) props.onClose(); }); }
		document.addEventListener("keydown", onKey, true);
		return () => document.removeEventListener("keydown", onKey, true);
	}, [props.onClose]);
	const lang = document.documentElement.lang;
	const view = props.flow.view(lang);
	React.useEffect(() => setReplaceConfirmed(false), [view.latestRaw]);
	const name = lang.toLowerCase().startsWith("zh") ? props.zhName : props.enName;
	const command = manualPluginUpdateCommand(view.profileRaw, view.latestRaw);
	const copyLabel = copyState === "copied" ? view.copy.copied : copyState === "failed" ? view.copy.copyFailed : view.copy.copy;
	return React.createElement(AntdProvider, { locale: antdLocaleFromDocument() }, React.createElement(Modal, {
		open: true, width: 680, zIndex: 1200, title: `${name} · ${view.copy.update}`, keyboard: false, closable: !view.busy, maskClosable: !view.busy, destroyOnHidden: true, onCancel: props.onClose,
		getContainer: () => document.querySelector<HTMLElement>(".dsham_settings") ?? document.body,
		afterOpenChange: (open: boolean) => { if (open && bodyRef.current) { bodyRef.current.tabIndex = -1; bodyRef.current.focus(); } },
		footer: [
			React.createElement(Button, { key: "check", disabled: view.busy, loading: view.busy && !view.loading, onClick: () => { void props.flow.check(); } }, view.copy.recheck),
			React.createElement(Button, { key: "update", type: "primary", disabled: view.disabled || !replaceConfirmed, loading: view.loading, onClick: () => { void props.flow.update(replaceConfirmed); } }, view.updateLabel),
		],
	}, React.createElement("div", { ref: bodyRef },
		React.createElement("p", { className: "mpi-intro" }, view.copy.forkIntro),
		React.createElement("p", { className: "mpi-intro" }, view.copy.intro),
		React.createElement("dl", { className: "mpi-meta" },
			React.createElement("dt", null, view.copy.source), React.createElement("dd", null, React.createElement("a", { href: RELEASES_URL, target: "_blank", rel: "noopener noreferrer" }, RELEASE_REPOSITORY)),
			React.createElement("dt", null, view.copy.current), React.createElement("dd", null, React.createElement("span", { className: "mpi-mono" }, view.currentVersion)),
			React.createElement("dt", null, view.copy.latestLabel), React.createElement("dd", { className: "mpi-latest" }, React.createElement("span", { className: "mpi-mono" }, view.latestVersion), React.createElement("span", { className: "mpi-status", role: "status", "data-kind": view.kind, ...(view.kind === "update" ? { style: { color: "#e8b15a" } } : {}) }, view.message)),
			React.createElement("dt", null, view.copy.profile), React.createElement("dd", null, React.createElement("span", { className: "mpi-mono" }, view.profileName))),
		view.busy ? React.createElement(Progress, { percent: 100, showInfo: false, status: "active" }) : null,
		view.latestRaw !== "latest" && React.createElement(Checkbox, { checked: replaceConfirmed, disabled: view.busy, onChange: event => setReplaceConfirmed(event.target.checked) }, view.copy.overwrite),
        replaceConfirmed && view.latestRaw !== "latest" && React.createElement("section", { className: "mpi-manual" },
			React.createElement("h3", null, view.copy.manual),
			React.createElement("p", null, view.copy.manualHint),
			React.createElement("div", { className: "mpi-command" },
				React.createElement("code", null, command),
				React.createElement(Button, { disabled: view.busy, onClick: () => {
					const write = navigator.clipboard?.writeText(command);
					if (write === undefined) { setCopyState("failed"); return; }
					void write.then(() => { setCopyState("copied"); window.setTimeout(() => setCopyState("idle"), 1400); }).catch(() => setCopyState("failed"));
				} }, copyLabel))))));
}

function observePluginUpdate(options: UpdateUiOptions) {
    if (typeof document === "undefined" || document.body === null) return () => {};
    ensureStyle();
    let controller: AbortController | undefined;
    let dialogHost: HTMLElement | undefined;
    let dialogRoot: UpdateRoot | undefined;
    function closeDialog() {
        controller?.abort(); controller = undefined;
        dialogRoot?.unmount(); dialogRoot = undefined; dialogHost?.remove(); dialogHost = undefined;
    }
    function openDialog() {
        closeDialog();
        const host = document.createElement("div");
        host.className = "mpi-dialog-root";
        (document.querySelector(".dsham_settings") ?? document.body).append(host);
        dialogHost = host;
        controller = new AbortController();
        const signal = controller.signal;
        dialogRoot = mountRoot(host);
        dialogRoot.render(React.createElement(UpdateDialog, {
            flow: createUpdateFlow((method, acknowledged) => requestStatus(options.endpoint, method, signal, acknowledged)),
            packageName: options.packageName, zhName: options.zhName, enName: options.enName, onClose: closeDialog,
        }));
    }
    // Only the explicit More-menu action opens the dialog and starts a release lookup.
    document.addEventListener(STABLE_RELEASE_EVENT, openDialog);
    return () => { document.removeEventListener(STABLE_RELEASE_EVENT, openDialog); closeDialog(); };
}

export { EN, handlePluginUpdateEscape, manualPluginUpdateCommand, observePluginUpdate, ZH };
