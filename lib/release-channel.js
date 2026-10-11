const PRODUCT_NAME = "Session Manager";
const RELEASE_REPOSITORY = "hxc0624/dsh-archive-manager";
const RELEASE_ASSET = "dsh-archive-manager.tgz";
const RELEASES_URL = `https://github.com/${RELEASE_REPOSITORY}/releases`;
const RELEASE_API = `https://api.github.com/repos/${RELEASE_REPOSITORY}/releases/latest`;
function isStableVersion(value) {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value);
}
function isLegacyForkVersion(value) {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)-hxc\.([1-9]\d*)$/.test(value);
}
function isReleaseVersion(value) {
  return isStableVersion(value) || isLegacyForkVersion(value);
}
function parseSemver(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value);
  if (match === null) return void 0;
  return { core: [Number(match[1]), Number(match[2]), Number(match[3])], prerelease: match[4]?.split(".") ?? [] };
}
function isNewerVersion(currentValue, candidateValue) {
  const current = parseSemver(currentValue);
  const candidate = parseSemver(candidateValue);
  if (current === void 0 || candidate === void 0) return false;
  for (let index = 0; index < 3; index += 1) {
    if (candidate.core[index] !== current.core[index]) return candidate.core[index] > current.core[index];
  }
  return comparePrerelease(candidate.prerelease, current.prerelease) > 0;
}
function comparePrerelease(left, right) {
  if (left.length === 0 || right.length === 0) return left.length === right.length ? 0 : left.length === 0 ? 1 : -1;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (a === void 0 || b === void 0) return a === b ? 0 : a === void 0 ? -1 : 1;
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
function releaseAssetUrl(version) {
  if (version === "latest") return `${RELEASES_URL}/latest/download/${RELEASE_ASSET}`;
  if (!isReleaseVersion(version)) throw new Error("Invalid Session Manager release version");
  return `${RELEASES_URL}/download/v${version}/${RELEASE_ASSET}`;
}
function releaseVersion(value) {
  if (value === null || typeof value !== "object") return;
  const item = value;
  if (item.draft !== false || item.prerelease !== false || typeof item.tag_name !== "string") return;
  const version = item.tag_name.slice(1);
  if (item.tag_name !== `v${version}` || !isReleaseVersion(version)) return;
  if (item.html_url !== `${RELEASES_URL}/tag/v${version}` || !Array.isArray(item.assets)) return;
  const matches = item.assets.filter((asset) => {
    if (asset === null || typeof asset !== "object") return false;
    const data = asset;
    return data.name === RELEASE_ASSET && data.state === "uploaded" && typeof data.size === "number" && data.size > 0 && data.browser_download_url === releaseAssetUrl(version);
  });
  return matches.length === 1 ? version : void 0;
}
function createLatestReleaseReader(fetcher = fetch, now = Date.now) {
  let cached;
  return async () => {
    if (cached !== void 0 && now() < cached.expiresAt) return cached.version;
    try {
      const response = await fetcher(RELEASE_API, {
        headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
        signal: AbortSignal.timeout(8e3)
      });
      if (!response.ok) return;
      const version = releaseVersion(await response.json());
      if (version !== void 0) cached = { version, expiresAt: now() + 5 * 6e4 };
      return version;
    } catch {
      return;
    }
  };
}
export {
  PRODUCT_NAME,
  RELEASES_URL,
  RELEASE_API,
  RELEASE_ASSET,
  RELEASE_REPOSITORY,
  createLatestReleaseReader,
  isLegacyForkVersion,
  isNewerVersion,
  isReleaseVersion,
  isStableVersion,
  releaseAssetUrl,
  releaseVersion
};
