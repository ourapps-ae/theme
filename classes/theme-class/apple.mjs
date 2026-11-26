import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assert, load, manifest, source } from './runtime.mjs';

const descriptor = manifest.classes.find(item => item.reference.digest === process.env.CLOD_CLASS_DIGEST).descriptor;
const folder = descriptor.provides[0].modules.macos[0];
const prefix = `components/${manifest.identity.name.slice(manifest.identity.name.lastIndexOf('/') + 1)}/`;
const modules = JSON.parse(process.env.CLOD_MODULE_MAP);
const files = Object.keys(modules).filter(path => path.startsWith(prefix + folder + '/') && path.endsWith('.swift')).sort().map(path => source(path.slice(prefix.length)));
assert.ok(files.length > 0);
const { themes } = await load('server/index.ts');
const directory = mkdtempSync(join(tmpdir(), 'shared-theme-swift-'));
try {
  const expected = join(directory, 'themes.json');
  writeFileSync(expected, JSON.stringify(themes));
  const executable = join(directory, 'theme-check');
  const main = fileURLToPath(new URL('./main.swift', import.meta.url));
  const built = spawnSync('swiftc', [...files, main, '-module-cache-path', join(directory, 'module-cache'), '-o', executable], { encoding: 'utf8', timeout: 60000 });
  assert.equal(built.status, 0, built.stdout + built.stderr);
  const checked = spawnSync(executable, [expected], { encoding: 'utf8', timeout: 30000 });
  assert.equal(checked.status, 0, checked.stdout + checked.stderr);
  process.stdout.write(checked.stdout);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
