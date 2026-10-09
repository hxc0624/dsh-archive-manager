const RELEASE_REPOSITORY = "hxc0624/dsh-archive-manager";
const RELEASE_ASSET = "dsh-archive-manager.tgz";
const RELEASES_URL = `https://github.com/${RELEASE_REPOSITORY}/releases`;
const RELEASE_API = `https://api.github.com/repos/${RELEASE_REPOSITORY}/releases/latest`;
function isForkVersion(value) {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)-hxc\.([1-9]\d*)$/.test(value);
}
function releaseAssetUrl(version) {
  if (version === "latest") return `${RELEASES_URL}/latest/download/${RELEASE_ASSET}`;
  if (!isForkVersion(version)) throw new Error("Invalid personal release version");
  return `${RELEASES_URL}/download/v${version}/${RELEASE_ASSET}`;
}
function releaseVersion(value) {
  if (value === null || typeof value !== "object") return;
  const item = value;
  if (item.draft !== false || item.prerelease !== false || typeof item.tag_name !== "string") return;
  const version = item.tag_name.slice(1);
  if (item.tag_name !== `v${version}` || !isForkVersion(version)) return;
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
  RELEASES_URL,
  RELEASE_API,
  RELEASE_ASSET,
  RELEASE_REPOSITORY,
  createLatestReleaseReader,
  isForkVersion,
  releaseAssetUrl,
  releaseVersion
};
