#!/usr/bin/env node
// Copies the contents of dist/ and space/README.md to the root of a clone of the
// Hugging Face Space repo, then commits and pushes. Hugging Face's build step is not used.
//
// Usage: npm run deploy:space -- [--space Tegh25/satellite-anomaly-reporter] [--dir ../hf-space] [--no-push] [--skip-build]
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const space = opt('space', 'Tegh25/satellite-anomaly-reporter');
const cloneDir = resolve(appDir, opt('dir', join('..', '..', 'hf-space')));
const distDir = join(appDir, 'dist');

const run = (cmd, cmdArgs, cwd = appDir) => {
  console.log(`$ ${cmd} ${cmdArgs.join(' ')}`);
  execFileSync(cmd, cmdArgs, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
};

if (!flag('skip-build')) run('npm', ['run', 'build']);
if (!existsSync(join(distDir, 'index.html'))) {
  console.error('dist/index.html not found. Run `npm run build` first.');
  process.exit(1);
}

if (!existsSync(join(cloneDir, '.git'))) {
  run('git', ['clone', `https://huggingface.co/spaces/${space}`, cloneDir], dirname(cloneDir));
}

// Replace everything except git metadata, so files removed from the build disappear from the Space.
for (const f of readdirSync(cloneDir)) {
  if (f === '.git' || f === '.gitattributes') continue;
  rmSync(join(cloneDir, f), { recursive: true, force: true });
}
cpSync(distDir, cloneDir, { recursive: true });
cpSync(join(appDir, 'space', 'README.md'), join(cloneDir, 'README.md'));

run('git', ['add', '-A'], cloneDir);
const status = execFileSync('git', ['status', '--porcelain'], { cwd: cloneDir }).toString().trim();
if (!status) {
  console.log('Nothing changed; the Space is already up to date.');
  process.exit(0);
}
const sha = (() => {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: appDir }).toString().trim();
  } catch {
    return 'unknown';
  }
})();
run('git', ['commit', '-m', `Deploy static build from ${sha}`], cloneDir);
if (flag('no-push')) {
  console.log(`Committed in ${cloneDir}. Skipping push (--no-push).`);
} else {
  run('git', ['push'], cloneDir);
  const [owner, name] = space.split('/');
  console.log(`\nDeployed. Space page: https://huggingface.co/spaces/${space}`);
  console.log(`Direct URL (verify in "Embed this Space"): https://${owner.toLowerCase()}-${name.toLowerCase()}.static.hf.space`);
}
