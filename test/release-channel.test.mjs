import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { createLatestReleaseReader, isForkVersion, releaseAssetUrl, releaseVersion, RELEASE_API, RELEASE_ASSET, RELEASE_REPOSITORY, RELEASES_URL } from "../src/release-channel.ts";
import { manualPluginUpdateCommand } from "../src/plugin-update-model.ts";
import { isNewerVersion, PLUGIN_UPDATE_HEADER, registerPluginUpdater } from "../src/plugin-updater.ts";

const release = (version = "1.0.16-hxc.2") => ({
  tag_name: `v${version}`, draft: false, prerelease: false, html_url: `${RELEASES_URL}/tag/v${version}`,
  assets: [{ name: RELEASE_ASSET, state: "uploaded", size: 1024, browser_download_url: releaseAssetUrl(version) }],
});

test("only complete personal releases are accepted, including numeric revision ordering", () => {
  const good = release();
  assert.equal(releaseVersion(good), "1.0.16-hxc.2");
  assert.equal(isNewerVersion("1.0.16-hxc.2", "1.0.16-hxc.10"), true);
  assert.equal(isNewerVersion("1.0.16-hxc.10", "1.0.17-hxc.1"), true);
  for (const version of ["1.0.16", "1.0.16-rc.1", "1.0.16-hxc.01", "1.0.16-hxc.0", "../../latest"]) {
    assert.equal(isForkVersion(version), false);
    assert.throws(() => releaseAssetUrl(version));
  }
  for (const patch of [
    { draft: true }, { prerelease: true }, { tag_name: "v1.0.16" }, { tag_name: "x1.0.16-hxc.2" },
    { html_url: "https://github.com/MichengAI/dsh-archive-manager/releases/tag/v1.0.16" },
    { assets: [] }, { assets: [good.assets[0], good.assets[0]] }, { assets: [{ ...good.assets[0], state: "new" }] },
    { assets: [{ ...good.assets[0], size: 0 }] }, { assets: [{ ...good.assets[0], browser_download_url: "https://example.invalid/package.tgz" }] },
  ]) assert.equal(releaseVersion({ ...good, ...patch }), undefined);
});

test("GitHub lookup caches success, expires, and never falls back to npm", async () => {
  let time = 0, requests = 0, fail = false;
  const latest = createLatestReleaseReader(async (url) => {
    requests++;
    assert.equal(url, RELEASE_API);
    return new Response(JSON.stringify(release()), { status: fail ? 429 : 200 });
  }, () => time);
  assert.equal(await latest(), "1.0.16-hxc.2");
  assert.equal(await latest(), "1.0.16-hxc.2");
  assert.equal(requests, 1);
  time = 300_001;
  fail = true;
  assert.equal(await latest(), undefined);
  assert.equal(requests, 2);
  for (const fetcher of [async () => { throw new Error("offline"); }, async () => new Response("not JSON"), async () => new Response(JSON.stringify({ version: "99.0.0" }))]) {
    assert.equal(await createLatestReleaseReader(fetcher)(), undefined);
  }
});

test("manual commands stay on the personal channel even when checking failed", () => {
  assert.equal(manualPluginUpdateCommand("desktop", "latest"), `dsh plugin --profile desktop add ${RELEASES_URL}/latest/download/${RELEASE_ASSET} --registry=https://registry.npmjs.org/`);
  assert.match(manualPluginUpdateCommand("web", "1.0.16-hxc.2"), /\/download\/v1\.0\.16-hxc\.2\//);
  assert.throws(() => manualPluginUpdateCommand("desktop; echo injected", "latest"));
  assert.throws(() => manualPluginUpdateCommand("web", "1.0.17"));
});

function updater(t, fetcher, install = () => ({ done: Promise.resolve({ exitCode: 0 }) })) {
  t.mock.method(globalThis, "fetch", fetcher);
  let handler;
  const ctx = {
    logger: { warn() {} }, webServer: { register(route) { handler = route.handler; return () => {}; } },
    get(name) {
      if (name === "desktopProfiles") return { current: { name: "desktop", dir: resolve("test-profile") } };
      if (name === "desktopPnpm") return { runPlugin: install };
    },
  };
  t.after(registerPluginUpdater(ctx, { packageName: "@michengai/dsh-archive-manager", endpoint: "/update", manifestUrl: new URL("./fixtures/update-manifest.json", import.meta.url) }));
  return async (method = "POST", trusted = true) => {
    let code, payload;
    await handler({ method, headers: trusted ? { [PLUGIN_UPDATE_HEADER]: "1", host: "127.0.0.1:3000" } : {}, socket: { remoteAddress: "127.0.0.1" } }, {
      writeHead(value) { code = value; }, end(value) { payload = value ? JSON.parse(value) : undefined; },
    });
    return { code, payload };
  };
}

test("simultaneous updates install a versioned fork asset exactly once", async (t) => {
  const started = Promise.withResolvers(), lookup = Promise.withResolvers(), calls = [];
  const request = updater(t, async (url) => {
    assert.equal(url, RELEASE_API);
    started.resolve();
    await lookup.promise;
    return new Response(JSON.stringify(release()));
  }, (args, directory) => { calls.push({ args, directory }); return { done: Promise.resolve({ exitCode: 0 }) }; });
  const first = request();
  await started.promise;
  assert.equal((await request()).code, 409);
  lookup.resolve();
  const result = await first;
  assert.equal(result.code, 200);
  assert.equal(result.payload.releaseRepository, RELEASE_REPOSITORY);
  assert.equal(result.payload.updatedVersion, "1.0.16-hxc.2");
  assert.equal(calls.length, 1);
  assert.ok(calls[0].args.includes(releaseAssetUrl("1.0.16-hxc.2")));
  assert.ok(!calls[0].args.some((arg) => arg.startsWith("@michengai/")));
  assert.equal(calls[0].directory, resolve("test-profile"));
});

test("lookup failure releases the lock and never installs", async (t) => {
  let installs = 0;
  const request = updater(t, async () => new Response("unavailable", { status: 503 }), () => { installs++; throw new Error("must not install"); });
  const status = await request("GET");
  assert.equal(status.payload.latestCheckFailed, true);
  assert.equal(status.payload.updateAvailable, false);
  assert.equal((await request()).code, 503);
  assert.equal((await request()).code, 503);
  assert.equal(installs, 0);
});

test("untrusted requests are rejected before looking up releases", async (t) => {
  let requests = 0;
  const request = updater(t, async () => { requests++; throw new Error("must not fetch"); });
  assert.equal((await request("POST", false)).code, 403);
  assert.equal(requests, 0);
});

test("failed installation can be retried without switching channels", async (t) => {
  let attempts = 0;
  const request = updater(t, async () => new Response(JSON.stringify(release())), () => ({ done: Promise.resolve({ exitCode: ++attempts === 1 ? 1 : 0 }) }));
  assert.equal((await request()).code, 503);
  assert.equal((await request()).code, 200);
  assert.equal(attempts, 2);
});
