import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { validateRelease, newerReleaseVersion, publishRelease } from "../scripts/fork-release.mjs";
import { releaseAssetUrl, RELEASE_ASSET, RELEASES_URL } from "../src/release-channel.ts";

const manifest = { name: "@michengai/dsh-archive-manager", version: "1.1.0", private: true };
test("release validation loads in a clean checkout before installing dependencies", async t => {
  const directory = await mkdtemp(join(tmpdir(), "dsh-toolkit-release-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, "scripts"));
  await mkdir(join(directory, "lib"));
  await writeFile(join(directory, "package.json"), JSON.stringify({ type: "module" }));
  await cp(new URL("../scripts/fork-release.mjs", import.meta.url), join(directory, "scripts/fork-release.mjs"));
  await cp(new URL("../lib/release-channel.js", import.meta.url), join(directory, "lib/release-channel.js"));
  await promisify(execFile)(process.execPath, ["--input-type=module", "--eval", `
    import { validateRelease, newerReleaseVersion } from './scripts/fork-release.mjs';
    validateRelease('v1.1.0', ${JSON.stringify(manifest)}, 'commit', 'commit');
    if (!newerReleaseVersion('1.1.0', '1.0.16-hxc.1')) throw new Error('Migration ordering failed');
  `], { cwd: directory, windowsHide: true });
});

test("Toolkit publishing requires a stable version, matching tag and commit, and npm publication guard", () => {
  validateRelease("v1.1.0", manifest, "commit\n", "commit\n");
  assert.throws(() => validateRelease("v1.0.16", manifest, "a", "a"));
  assert.throws(() => validateRelease("v1.1.0", manifest, "a", "b"));
  assert.throws(() => validateRelease("v1.1.0", { ...manifest, private: false }, "a", "a"));
  for (const version of ["1.0.16-hxc.2", "1.1.0-rc.1", "1.1.0+build.1"]) {
    assert.throws(() => validateRelease(`v${version}`, { ...manifest, version }, "a", "a"));
  }
  assert.equal(newerReleaseVersion("1.0.16-hxc.10", "1.0.16-hxc.2"), true);
  assert.equal(newerReleaseVersion("1.0.17-hxc.1", "1.0.16-hxc.10"), true);
  assert.equal(newerReleaseVersion("1.1.0", "1.0.16-hxc.1"), true);
  assert.equal(newerReleaseVersion("1.0.16", "1.0.16-hxc.1"), true);
  assert.equal(newerReleaseVersion("1.0.16-hxc.1", "1.0.16"), false);
  assert.equal(newerReleaseVersion("1.1.0", "1.1.0"), false);
  assert.equal(newerReleaseVersion("1.10.0", "1.2.0"), true);
  assert.equal(newerReleaseVersion("2.0.0-beta.1", "1.1.0"), false);
});

test("release lookup errors and published tags cannot cause writes", async () => {
  const calls = [];
  await assert.rejects(publishRelease("v1.1.0", "out", "notes.md", async (args) => {
    calls.push(args); throw new Error("API unavailable");
  }), /API unavailable/);
  assert.equal(calls.length, 1);
  calls.length = 0;
  await assert.rejects(publishRelease("v1.1.0", "out", "notes.md", async (args) => {
    calls.push(args); return JSON.stringify([[{ tag_name: "v1.1.0", draft: false }]]);
  }), /already published/);
  assert.equal(calls.length, 1);
});

test("assets upload before publication; older versions preserve Latest", async () => {
  const calls = [], newer = "1.2.0";
  await publishRelease("v1.1.0", "out", "notes.md", async (args) => {
    calls.push(args);
    return JSON.stringify([[{ tag_name: `v${newer}`, draft: false, prerelease: false,
      html_url: `${RELEASES_URL}/tag/v${newer}`,
      assets: [{ name: RELEASE_ASSET, size: 1024, state: "uploaded", browser_download_url: releaseAssetUrl(newer) }],
    }]]);
  });
  assert.equal(calls[1][1], "create");
  assert.ok(calls[1].includes("--draft"));
  assert.ok(calls[1].includes("HXC DSH Toolkit v1.1.0"));
  assert.equal(calls[2][1], "upload");
  assert.equal(calls[3][1], "edit");
  assert.ok(calls[3].includes("--draft=false"));
  assert.ok(calls[3].includes("--latest=false"));
});

test("failed uploads leave a draft instead of publishing a partial release", async () => {
  const calls = [];
  await assert.rejects(publishRelease("v1.1.0", "out", "notes.md", async (args) => {
    calls.push(args);
    if (args[1] === "upload") throw new Error("upload failed");
    return "[[]]";
  }), /upload failed/);
  assert.ok(!calls.some((args) => args.includes("--draft=false")));
});

test("the first independent release becomes Latest over historical fork versions", async () => {
  const calls = [], previous = "1.0.16-hxc.1";
  await publishRelease("v1.1.0", "out", "notes.md", async args => {
    calls.push(args);
    return JSON.stringify([[{ tag_name: `v${previous}`, draft: false, prerelease: false,
      html_url: `${RELEASES_URL}/tag/v${previous}`,
      assets: [{ name: RELEASE_ASSET, size: 1024, state: "uploaded", browser_download_url: releaseAssetUrl(previous) }]
    }]]);
  });
  assert.ok(calls.at(-1).includes("--latest=true"));
});
