// Session Manager releases keep the existing package ID and distribution URLs for installed users.
export const PRODUCT_NAME = "Session Manager";
export const RELEASE_REPOSITORY = "hxc0624/dsh-archive-manager";
export const RELEASE_ASSET = "dsh-archive-manager.tgz";
export const RELEASES_URL = `https://github.com/${RELEASE_REPOSITORY}/releases`;
export const RELEASE_API = `https://api.github.com/repos/${RELEASE_REPOSITORY}/releases/latest`;

export function isStableVersion(value: string): boolean {
	return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value);
}

export function isLegacyForkVersion(value: string): boolean {
	return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)-hxc\.([1-9]\d*)$/.test(value);
}

/** Read historical personal releases as well as independent stable releases. */
export function isReleaseVersion(value: string): boolean {
	return isStableVersion(value) || isLegacyForkVersion(value);
}

// Shared ordering must also run in release validation before dependencies are installed.
function parseSemver(value: string) {
	const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value);
	if (match === null) return undefined;
	return { core: [Number(match[1]), Number(match[2]), Number(match[3])], prerelease: match[4]?.split(".") ?? [] };
}

export function isNewerVersion(currentValue: string, candidateValue: string): boolean {
	const current = parseSemver(currentValue);
	const candidate = parseSemver(candidateValue);
	if (current === undefined || candidate === undefined) return false;
	for (let index = 0; index < 3; index += 1) {
		if (candidate.core[index] !== current.core[index]) return candidate.core[index] > current.core[index];
	}
	return comparePrerelease(candidate.prerelease, current.prerelease) > 0;
}

function comparePrerelease(left: readonly string[], right: readonly string[]): number {
	if (left.length === 0 || right.length === 0) return left.length === right.length ? 0 : left.length === 0 ? 1 : -1;
	const length = Math.max(left.length, right.length);
	for (let index = 0; index < length; index += 1) {
		const a = left[index];
		const b = right[index];
		if (a === undefined || b === undefined) return a === b ? 0 : a === undefined ? -1 : 1;
		if (a === b) continue;
		const aNumeric = /^\d+$/.test(a);
		const bNumeric = /^\d+$/.test(b);
		if (aNumeric && bNumeric) {
			const aNumber = BigInt(a);
			const bNumber = BigInt(b);
			if (aNumber !== bNumber) return aNumber > bNumber ? 1 : -1;
			continue;
		}
		if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
		return a > b ? 1 : -1;
	}
	return 0;
}

/** The latest alias is only for a manual command when checking is unavailable. */
export function releaseAssetUrl(version: string): string {
	if (version === "latest") return `${RELEASES_URL}/latest/download/${RELEASE_ASSET}`;
	if (!isReleaseVersion(version)) throw new Error("Invalid Session Manager release version");
	return `${RELEASES_URL}/download/v${version}/${RELEASE_ASSET}`;
}

/** Trust only complete releases in this repository, including historical fork versions. */
export function releaseVersion(value: unknown): string | undefined {
	if (value === null || typeof value !== "object") return;
	const item = value as Record<string, unknown>;
	if (item.draft !== false || item.prerelease !== false || typeof item.tag_name !== "string") return;
	const version = item.tag_name.slice(1);
	if (item.tag_name !== `v${version}` || !isReleaseVersion(version)) return;
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
