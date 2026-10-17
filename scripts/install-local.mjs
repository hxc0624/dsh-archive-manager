// Copy a verified local build into an existing installation, keeping a restorable backup.
import { createHash, randomUUID } from "node:crypto";
import { copyFile, lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_NAME = "@hxc0624/dsh-session-manager";
const hash = data => createHash("sha256").update(data).digest("hex");
const within = (root, path) => { const rel = relative(root, path); return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel); };

async function safePath(root, path) {
  if (!within(root, path)) throw new Error(`Path outside installation: ${path}`);
  let current = root;
  for (const part of relative(root, path).split(sep).filter(Boolean)) {
    current = join(current, part);
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error(`Linked installation path is unsupported: ${current}`); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}

async function collect(root, path) {
  await safePath(root, path);
  const info = await lstat(path);
  if (info.isFile()) return [relative(root, path)];
  if (!info.isDirectory()) throw new Error(`Unsupported package file: ${path}`);
  const files = [];
  for (const entry of await readdir(path)) files.push(...await collect(root, join(path, entry)));
  return files;
}

export async function installLocalBuild(sourceDirectory, targetDirectory) {
  const source = await realpath(sourceDirectory);
  const requestedTarget = resolve(targetDirectory);
  const target = await realpath(requestedTarget);
  if (target.toLowerCase() !== requestedTarget.toLowerCase()) throw new Error("Linked installation is unsupported; select a direct package directory.");
  if (within(source, target) || within(target, source)) throw new Error("Source and installation must be separate directories.");
  const manifest = JSON.parse(await readFile(join(source, "package.json"), "utf8"));
  const installed = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
  if (manifest.name !== PACKAGE_NAME || installed.name !== PACKAGE_NAME) throw new Error("Select an existing Session Manager installation.");
  if (JSON.stringify(manifest.dependencies ?? {}) !== JSON.stringify(installed.dependencies ?? {})) throw new Error("Runtime dependencies changed; install the package through DSH before syncing.");
  const files = new Set(["package.json"]);
  for (const entry of manifest.files) {
    if (typeof entry !== "string" || entry.includes("*") || !within(source, resolve(source, entry))) throw new Error("Unsupported package file declaration.");
    for (const file of await collect(source, resolve(source, entry))) files.add(file);
  }
  for (const file of files) await safePath(target, join(target, file));
  const backup = join(source, ".browser-verification", "local-installs", `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}`);
  await mkdir(backup, { recursive: true });
  const receipt = { source, target, version: manifest.version, installedAt: new Date().toISOString(), files: [] };
  // Complete every backup before changing any installed file.
  for (const file of files) {
    const content = await readFile(join(source, file));
    let existed = true;
    try {
      await mkdir(dirname(join(backup, file)), { recursive: true });
      await copyFile(join(target, file), join(backup, file));
    } catch (error) { if (error.code !== "ENOENT") throw error; existed = false; }
    receipt.files.push({ path: file, existed, sha256: hash(content) });
  }
  await writeFile(join(backup, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
  try {
    for (const file of receipt.files) {
      await safePath(target, join(target, file.path));
      await mkdir(dirname(join(target, file.path)), { recursive: true });
      await copyFile(join(source, file.path), join(target, file.path));
      if (hash(await readFile(join(target, file.path))) !== file.sha256) throw new Error(`Verification failed: ${file.path}`);
    }
  } catch (error) {
    for (const file of receipt.files) {
      await safePath(target, join(target, file.path));
      if (file.existed) await copyFile(join(backup, file.path), join(target, file.path));
      else await rm(join(target, file.path), { force: true });
    }
    throw error;
  }
  return { target, backup, version: manifest.version, files: receipt.files.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--target") throw new Error('Usage: pnpm install:local --target "<existing plugin directory>"');
  const source = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const result = await installLocalBuild(source, args[1]);
  console.log(`已同步本地构建 v${result.version}，校验 ${result.files} 个文件。\n安装目录：${result.target}\n备份目录：${result.backup}\n请完全退出并重新打开 DSH。`);
}
