// Session Manager GitHub releases. No npm publishing or npm credentials.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { isNewerVersion, isReleaseVersion, isStableVersion, PRODUCT_NAME, RELEASE_ASSET, RELEASE_REPOSITORY, releaseVersion } from "../lib/release-channel.js";

const exec = promisify(execFile);
const checksumName = "SHA256SUMS.txt";
const gh = async (args) => (await exec("gh", args, { windowsHide: true })).stdout;

export function validateRelease(tag, manifest, head, taggedHead) {
  assert.equal(manifest.name, "@hxc0624/dsh-session-manager", "Release the independent hxc0624 plugin identity");
  assert.equal(manifest.private, true, "Session Manager releases must not publish to npm");
  assert.ok(isStableVersion(manifest.version), "Use independent X.Y.Z stable versions for new Session Manager releases");
  assert.equal(tag, `v${manifest.version}`, "Release tag must match package.json");
  assert.equal(head.trim(), taggedHead.trim(), "Check out the exact tagged commit");
}

async function validateTag(tag) {
  const manifest = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(tag, `v${manifest.version}`, "Release tag must match package.json");
  assert.ok(isStableVersion(manifest.version), "Invalid Session Manager stable version");
  const [head, tagged] = await Promise.all([
    exec("git", ["rev-parse", "HEAD"], { windowsHide: true }),
    exec("git", ["rev-parse", `refs/tags/${tag}^{commit}`], { windowsHide: true }),
  ]);
  validateRelease(tag, manifest, head.stdout, tagged.stdout);
}

export function newerReleaseVersion(left, right) {
  if (!isReleaseVersion(left) || !isReleaseVersion(right)) return false;
  return isNewerVersion(right, left);
}

export async function writeChecksum(directory) {
  const bytes = await readFile(resolve(directory, RELEASE_ASSET));
  assert.ok(bytes.length > 0, "Release package is empty");
  const checksum = `${createHash("sha256").update(bytes).digest("hex")}  ${RELEASE_ASSET}\n`;
  await writeFile(resolve(directory, checksumName), checksum);
  return checksum;
}

export async function publishRelease(tag, directory, notes, run = gh) {
  assert.ok(tag.startsWith("v") && isStableVersion(tag.slice(1)), "Invalid Session Manager stable release tag");
  // A failed read must never be interpreted as permission to publish.
  const pages = JSON.parse(await run(["api", `repos/${RELEASE_REPOSITORY}/releases?per_page=100`, "--paginate", "--slurp"]));
  assert.ok(Array.isArray(pages) && pages.every(Array.isArray), "Unexpected release response");
  const releases = pages.flat();
  const existing = releases.find((release) => release.tag_name === tag);
  assert.ok(existing === undefined || existing.draft === true, "This version is already published; create a new version instead of replacing it");
  if (existing === undefined) {
    await run(["release", "create", tag, "--repo", RELEASE_REPOSITORY, "--verify-tag", "--draft", "--title", `${PRODUCT_NAME} ${tag}`, "--notes-file", notes]);
  }
  await run(["release", "upload", tag, resolve(directory, RELEASE_ASSET), resolve(directory, checksumName), "--repo", RELEASE_REPOSITORY, "--clobber"]);
  const newerPublished = releases.some((release) => {
    const version = releaseVersion(release);
    return version !== undefined && newerReleaseVersion(version, tag.slice(1));
  });
  // Both assets must finish uploading before the updater can discover this release.
  await run(["release", "edit", tag, "--repo", RELEASE_REPOSITORY, "--notes-file", notes,
    "--draft=false", "--prerelease=false", `--latest=${!newerPublished}`]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, tag, directory = ".fork-release"] = process.argv.slice(2);
  await validateTag(tag);
  if (action === "validate") console.log(`Validated ${tag} for ${RELEASE_REPOSITORY}`);
  else if (action === "assets") console.log(await writeChecksum(directory));
  else if (action === "publish") {
    const expected = await readFile(resolve(directory, checksumName), "utf8");
    const bytes = await readFile(resolve(directory, RELEASE_ASSET));
    assert.equal(expected, `${createHash("sha256").update(bytes).digest("hex")}  ${RELEASE_ASSET}\n`, "Package changed after checksumming");
    const notes = resolve(directory, "release-notes.md");
    await readFile(notes, "utf8");
    await publishRelease(tag, directory, notes);
    console.log(`Published https://github.com/${RELEASE_REPOSITORY}/releases/tag/${tag}`);
  } else throw new Error("Usage: node scripts/fork-release.mjs validate|assets|publish <tag> [directory]");
}
