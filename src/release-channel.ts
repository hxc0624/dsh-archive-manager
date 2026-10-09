// This fork deliberately keeps the runtime package ID but owns its distribution channel.
export const RELEASE_REPOSITORY = "hxc0624/dsh-archive-manager";
export const RELEASE_ASSET = "dsh-archive-manager.tgz";
export const RELEASES_URL = `https://github.com/${RELEASE_REPOSITORY}/releases`;
export const RELEASE_API = `https://api.github.com/repos/${RELEASE_REPOSITORY}/releases/latest`;

export function isForkVersion(value: string): boolean {
	return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)-hxc\.([1-9]\d*)$/.test(value);
}

/** The latest alias is only for a manual command when checking is unavailable. */
export function releaseAssetUrl(version: string): string {
	if (version === "latest") return `${RELEASES_URL}/latest/download/${RELEASE_ASSET}`;
	if (!isForkVersion(version)) throw new Error("Invalid personal release version");
	return `${RELEASES_URL}/download/v${version}/${RELEASE_ASSET}`;
}

/** Reject upstream tags, drafts, previews, incomplete uploads and foreign assets. */
export function releaseVersion(value: unknown): string | undefined {
	if (value === null || typeof value !== "object") return;
	const item = value as Record<string, unknown>;
	if (item.draft !== false || item.prerelease !== false || typeof item.tag_name !== "string") return;
	const version = item.tag_name.slice(1);
	if (item.tag_name !== `v${version}` || !isForkVersion(version)) return;
	if (item.html_url !== `${RELEASES_URL}/tag/v${version}` || !Array.isArray(item.assets)) return;
	const matches = item.assets.filter((asset: unknown) => {
		if (asset === null || typeof asset !== "object") return false;
		const data = asset as Record<string, unknown>;
		return data.name === RELEASE_ASSET && data.state === "uploaded"
			&& typeof data.size === "number" && data.size > 0
			&& data.browser_download_url === releaseAssetUrl(version);
	});
	return matches.length === 1 ? version : undefined;
}

export function createLatestReleaseReader(fetcher: typeof fetch = fetch, now: () => number = Date.now) {
	let cached: { version: string; expiresAt: number } | undefined;
	return async (): Promise<string | undefined> => {
		if (cached !== undefined && now() < cached.expiresAt) return cached.version;
		try {
			const response = await fetcher(RELEASE_API, {
				headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
				signal: AbortSignal.timeout(8_000),
			});
			if (!response.ok) return;
			const version = releaseVersion(await response.json());
			if (version !== undefined) cached = { version, expiresAt: now() + 5 * 60_000 };
			return version;
		} catch {
			return;
		}
	};
}
