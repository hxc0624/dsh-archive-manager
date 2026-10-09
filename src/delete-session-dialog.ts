// Personal fork: compact sidebar confirmation, kept in source across upstream merges.
import React from "react";
import { AntdProvider, Button, Modal } from "./antd-ui.js";
import type { Translate } from "./client-types.js";

interface DeleteDialogProps {
	target: { sessionId: string; title: string };
	t: Translate;
	onDelete(sessionId: string): Promise<unknown>;
	onClose(): void;
	formatError(reason: unknown, t: Translate): string;
}

const buttonStyle: React.CSSProperties = {
	height: 32, minWidth: 64, paddingInline: 14, borderRadius: 8,
	marginInlineStart: 0, fontSize: 14,
};

/** Mount with a session key so pending work cannot dismiss a different target. */
export function DeleteSessionDialog({ target, t, onDelete, onClose, formatError }: DeleteDialogProps) {
	const [pending, setPending] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const inFlight = React.useRef(false);
	const cancelButton = React.useRef<React.ComponentRef<typeof Button>>(null);
	const mounted = React.useRef(true);
	const titleId = React.useId();

	React.useEffect(() => {
		mounted.current = true;
		return () => { mounted.current = false; };
	}, []);
	React.useEffect(() => {
		if (error !== null && !pending) cancelButton.current?.focus();
	}, [error, pending]);

	function close() {
		if (!inFlight.current) onClose();
	}
	async function confirm() {
		if (inFlight.current) return;
		inFlight.current = true;
		setPending(true);
		setError(null);
		try {
			await onDelete(target.sessionId);
			if (mounted.current) onClose();
		} catch (cause) {
			if (mounted.current) setError(formatError(cause, t));
		} finally {
			inFlight.current = false;
			if (mounted.current) setPending(false);
		}
	}

	const sessionTitle = target.title.trim() || t("deleteSession.unnamed");
	return React.createElement(AntdProvider, null, React.createElement(Modal, {
		open: true, centered: true, width: 360,
		getContainer: () => document.body,
		className: "dsham_deleteSessionDialog",
		rootClassName: "dsham_deleteSessionDialogRoot",
		style: { maxWidth: "calc(100vw - 32px)", paddingBottom: 0 },
		styles: {
			container: {
				padding: "18px 20px", borderRadius: 12,
				border: "1px solid var(--dsw-alias-border-l2)",
				boxShadow: "0 12px 36px rgba(0, 0, 0, 0.14)",
			},
			header: { marginBottom: 8, background: "transparent" },
			body: { fontSize: 14, lineHeight: 1.5, maxHeight: "50vh", overflowY: "auto" },
			footer: { marginTop: 18 },
			mask: { backgroundColor: "rgba(0, 0, 0, 0.24)" },
		},
		title: React.createElement("span", {
			style: { fontSize: 16, fontWeight: 600, lineHeight: "24px" },
		}, t("deleteSession.confirmTitle")),
		onCancel: close, keyboard: !pending, mask: { closable: !pending },
		closable: { disabled: pending, "aria-label": t("close") },
		focusable: { trap: true, focusTriggerAfterClose: true },
		afterOpenChange: (open: boolean) => {
			if (open && !inFlight.current) cancelButton.current?.focus();
		},
		destroyOnHidden: true, "aria-describedby": titleId, "aria-busy": pending,
		footer: React.createElement("div", {
			style: { display: "flex", justifyContent: "flex-end", gap: 8 },
		},
		React.createElement(Button, {
			ref: cancelButton, disabled: pending, onClick: close, style: buttonStyle,
		}, t("cancel")),
		React.createElement(Button, {
			type: "primary", danger: true, loading: pending, disabled: pending,
			onClick: () => { void confirm(); }, style: buttonStyle,
		}, t(pending ? "deleteSession.pendingShort" : "deleteSession.confirm"))),
	},
	React.createElement("p", {
		id: titleId, title: sessionTitle,
		style: {
			margin: 0, color: "var(--dsw-alias-label-secondary)", overflowWrap: "anywhere",
			display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden",
		},
	}, sessionTitle),
	error !== null && React.createElement("div", {
		role: "alert",
		style: { marginTop: 12, color: "var(--dsw-alias-state-error-primary, #dc4446)", overflowWrap: "anywhere" },
	}, error)));
}
