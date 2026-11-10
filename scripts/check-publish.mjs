// Packs every workspace package the way a release does and checks each tarball with publint and
// arethetypeswrong (attw). Per-package attw settings live in packages/<name>/.attw.json.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const packagesDir = 'packages';
const out = mkdtempSync(join(tmpdir(), 'ilc-packages-'));
let failed = false;

function check(tool, args) {
    const result = spawnSync('pnpm', ['exec', tool, ...args], { stdio: 'inherit' });
    if (result.status !== 0) {
        failed = true;
    }
}

try {
    for (const name of readdirSync(packagesDir)) {
        const dir = join(packagesDir, name);
        if (!existsSync(join(dir, 'package.json'))) {
            continue;
        }
        execFileSync('pnpm', ['pack', '--pack-destination', out], { cwd: dir, stdio: ['ignore', 'ignore', 'inherit'] });
        const tarball = join(
            out,
            readdirSync(out).find((file) => file.endsWith('.tgz')),
        );
        console.log(`\n=== ${name} (${tarball})\n`);
        check('publint', ['run', tarball]);
        const attwArgs = [tarball];
        if (existsSync(join(dir, '.attw.json'))) {
            attwArgs.push('--config-path', join(dir, '.attw.json'));
        }
        check('attw', attwArgs);
        rmSync(tarball);
    }
} finally {
    rmSync(out, { recursive: true, force: true });
}

process.exitCode = failed ? 1 : 0;
