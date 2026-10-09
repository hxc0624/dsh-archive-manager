import assert from "node:assert/strict";
import test from "node:test";
import { validateRelease, newerForkVersion, publishRelease } from "../scripts/fork-release.mjs";
import { releaseAssetUrl, RELEASE_ASSET, RELEASES_URL } from "../src/release-channel.ts";

const manifest = { name: "@michengai/dsh-archive-manager", version: "1.0.16-hxc.1", private: true };
test("personal publishing requires a matching tag, commit and npm publication guard", () => {
  validateRelease("v1.0.16-hxc.1", manifest, "commit\n", "commit\n");
  assert.throws(() => validateRelease("v1.0.16", manifest, "a", "a"));
  assert.throws(() => validateRelease("v1.0.16-hxc.1", manifest, "a", "b"));
  assert.throws(() => validateRelease("v1.0.16-hxc.1", { ...manifest, private: false }, "a", "a"));
  assert.equal(newerForkVersion("1.0.16-hxc.10", "1.0.16-hxc.2"), true);
  assert.equal(newerForkVersion("1.0.17-hxc.1", "1.0.16-hxc.10"), true);
});

test("release lookup errors and published tags cannot cause writes", async () => {
  const calls = [];
  await assert.rejects(publishRelease("v1.0.16-hxc.1", "out", "notes.md", async (args) => {
    calls.push(args); throw new Error("API unavailable");
  }), /API unavailable/);
  assert.equal(calls.length, 1);
  calls.length = 0;
  await assert.rejects(publishRelease("v1.0.16-hxc.1", "out", "notes.md", async (args) => {
    calls.push(args); return JSON.stringify([[{ tag_name: "v1.0.16-hxc.1", draft: false }]]);
  }), /already published/);
  assert.equal(calls.length, 1);
});

test("assets upload before publication; older versions preserve Latest", async () => {
  const calls = [], newer = "1.0.17-hxc.1";
  await publishRelease("v1.0.16-hxc.1", "out", "notes.md", async (args) => {
    calls.push(args);
    return JSON.stringify([[{ tag_name: `v${newer}`, draft: false, prerelease: false,
      html_url: `${RELEASES_URL}/tag/v${newer}`,
      assets: [{ name: RELEASE_ASSET, size: 1024, state: "uploaded", browser_download_url: releaseAssetUrl(newer) }],
    }]]);
  });
  assert.equal(calls[1][1], "create");
  assert.ok(calls[1].includes("--draft"));
  assert.equal(calls[2][1], "upload");
  assert.equal(calls[3][1], "edit");
  assert.ok(calls[3].includes("--draft=false"));
  assert.ok(calls[3].includes("--latest=false"));
});

test("failed uploads leave a draft instead of publishing a partial release", async () => {
  const calls = [];
  await assert.rejects(publishRelease("v1.0.16-hxc.1", "out", "notes.md", async (args) => {
    calls.push(args);
    if (args[1] === "upload") throw new Error("upload failed");
    return "[[]]";
  }), /upload failed/);
  assert.ok(!calls.some((args) => args.includes("--draft=false")));
});
