import { build } from 'esbuild';
import { mkdir, readFile, writeFile, readdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
const serverBuild = await build({ metafile: true, absWorkingDir: root, entryPoints: { index: 'src/index.ts', compaction: 'src/compaction.ts', search: 'src/search.ts', quota: 'src/quota.mjs', cli: 'src/cli.ts', 'mcp/stdio-forwarder': 'src/mcp/stdio-forwarder.ts' }, outdir: 'dist', bundle: true, platform: 'node', format: 'esm', target: 'node22', external: ['@deepseek-ai/*'], legalComments: 'linked', banner: { js: "import {createRequire as __agyCreateRequire} from 'node:module'; const require=__agyCreateRequire(import.meta.url);" } });
const client = await build({ absWorkingDir: root, entryPoints: ['src/quota-client.jsx'], bundle: true, platform: 'browser', format: 'cjs', target: 'es2022', jsx: 'automatic', external: ['react', 'react-dom', 'react/jsx-runtime'], write: false });
const { name } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
await writeFile(new URL('../dist/client.js', import.meta.url), `window.__ModuleLoader__.load({id:${JSON.stringify(name)},factory:(require)=>{const module={exports:{}};const exports=module.exports;\n${client.outputFiles[0].text}\nreturn module.exports;}});\n`);

const packages = new Set();
for (const file of Object.keys(serverBuild.metafile.inputs)) {
 const pieces = file.replaceAll('\\', '/').split('node_modules/');
 if (pieces.length < 2) continue;
 const tail = pieces.at(-1).split('/');
 packages.add(tail[0].startsWith('@') ? tail.slice(0, 2).join('/') : tail[0]);
}
const notices = [];
const licenseDirectory = new URL('../dist/licenses/', import.meta.url);
await mkdir(licenseDirectory, { recursive: true });
for (const packageName of [...packages].sort()) {
 const directory = join(root, 'node_modules', packageName);
 const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
 const licenses = (await readdir(directory)).filter(name => /^(?:license|copying|notice)(?:\.|$)/i.test(name));
 const saved = [];
 for (const filename of licenses) {
  const target = packageName.replaceAll('/', '_') + '-' + manifest.version + '-' + filename;
  await copyFile(join(directory, filename), new URL(target, licenseDirectory));
  saved.push('licenses/' + target);
 }
 notices.push({ name: packageName, version: manifest.version, license: manifest.license, files: saved });
}
await writeFile(new URL('../dist/third-party.json', import.meta.url), JSON.stringify(notices, null, 2) + '\n');
