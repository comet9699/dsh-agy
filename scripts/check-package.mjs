import { readFile, readdir, stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
assert.equal(pkg.name, 'dsh-agy');
assert.equal(pkg.engines.dsh, '0.2.2-rc.1');
assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml');
assert.equal(pkg.repository.url, 'git+https://github.com/comet9699/dsh-agy.git');
const patch = await readFile(new URL('cordis.patch.yml', root), 'utf8');
assert(!patch.includes('name: dsh-agy-local-acp'));
assert(patch.includes('name: dsh-agy/compaction'));
for (const file of ['index', 'cli', 'compaction', 'search', 'quota', 'client', 'mcp/stdio-forwarder']) assert((await stat(new URL(`dist/${file}.js`, root))).size > 0);
assert((await readFile(new URL('dist/client.js', root), 'utf8')).includes('id:"dsh-agy"'));
for (const dir of ['src/', 'dist/']) {
 async function inspect(url) {
  for (const entry of await readdir(url, { withFileTypes: true })) {
   const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), url);
   if (entry.isDirectory()) await inspect(child);
   else if (/\.(?:js|ts|jsx|mjs|json)$/.test(entry.name)) {
    const text = await readFile(child, 'utf8');
    assert(!/[A-Z]:[/\\](?:Users[/\\][^/\\\s'\"]+|Agy-Studio(?:-Next)?[/\\])/i.test(text), `Machine-specific data: ${child}`);
    assert(!/gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/.test(text), `Credential pattern: ${child}`);
   }
  }
 }
 await inspect(new URL(dir, root));
}
console.log('dsh-agy manifest, compiled entries, module ID and private-path checks passed.');
