import { promises as fs } from 'fs';
import * as path from 'path';
import { SANDBOX_WORKDIR } from './linuxSandbox';
import { randomBytes } from 'crypto';

type SandboxedFile = { sandboxPath: string; contextFsPath: string };

export function getSandboxBinds(files: SandboxedFile[]): string[] {
    const binds: string[] = [];
    for (const file of files) {
        binds.push('--ro-bind', file.sandboxPath, path.join(SANDBOX_WORKDIR, path.basename(file.contextFsPath)));
    }
    return binds;
}

export async function writeFileToSandbox(
    content: string,
    tmpDir: string,
    filePath: string
): Promise<SandboxedFile> {
    if (typeof process.getuid === 'function' && process.getuid() === 0) {
        throw new Error('Refusing to materialize files while running as root. Run as an unprivileged user.');
    }

    const file = path.basename(filePath);
    const rand = randomBytes(6).toString('hex');
    const fileName = `${rand}-${file}`;
    const tmpFilePath = path.join(tmpDir, fileName);

    await fs.writeFile(tmpFilePath, content, { mode: 0o600 });
    return { sandboxPath: tmpFilePath, contextFsPath: filePath };
}
