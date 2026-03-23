import { mkdir, rm } from 'fs/promises';
import { CommandOutput } from '../types';
import { execFile } from 'child_process';

export async function createSandboxedTempDir(userId: string): Promise<{ path: string; cleanup: () => Promise<void> }> {
    const tmpDir = `/tmp/${userId}-sandbox` + '-' + crypto.randomUUID();
    await mkdir(tmpDir);

    return { path: tmpDir, cleanup: async () => { await rm(tmpDir, { recursive: true }); } };
}

export const SANDBOX_WORKDIR = '/work';

export async function runInSandbox(
    userTempDir: string,
    toolPath: string,
    args: string[],
    options?: { timeoutMs?: number; workdir?: string; allowNetwork?: boolean; env?: Record<string, string>; additionalFlags?: string[] }
): Promise<CommandOutput> {
    const timeoutMs = options?.timeoutMs ?? 1000 * 10;
    const tmp = userTempDir;

    try {
        const bwrapArgs = [
            '--unshare-all',
            '--die-with-parent',
            '--new-session',
            '--ro-bind', '/usr', '/usr',
            '--proc', '/proc',
            '--dev', '/dev',
            '--ro-bind', '/etc/resolv.conf', '/etc/resolv.conf',
            '--ro-bind', '/etc/hosts', '/etc/hosts',
            '--bind', toolPath, '/bin/tool',
            '--bind', tmp, SANDBOX_WORKDIR,
            '--chdir', SANDBOX_WORKDIR,
        ];

        if (options?.allowNetwork) {
            bwrapArgs.push('--share-net');
        } else {
            bwrapArgs.push('--unshare-net');
        }

        if (options?.additionalFlags) {
            options.additionalFlags.forEach(f => bwrapArgs.push(f));
        }

        const childArgs = ['/bin/tool', ...args];

        const result = await new Promise<CommandOutput>((resolve) => {
            execFile('bwrap', [...bwrapArgs, '--', ...childArgs], { timeout: timeoutMs, env: options?.env }, (err, stdout, stderr) => {
                let code = 0;
                let errorMessage = '';

                if (err !== null) {
                    if (err.killed) {
                        code = 124;
                    } else if (typeof (err as NodeJS.ErrnoException).code === 'number') {
                        code = (err as NodeJS.ErrnoException).code as unknown as number;
                    }
                    errorMessage = 'Error executing in sandbox!\n';
                    console.error(err);
                } else if (stderr.trim() !== '') {
                    code = 1;
                    errorMessage = stderr;
                }
                resolve({ stdout, stderr: errorMessage, code });
            });
        });

        return result;
    } catch (error) {
        console.error('Error executing in sandbox:', error);
        return {
            stdout: '',
            stderr: `Error executing in sandbox: ${(error as Error).message}\n`,
            code: 1,
        };
    }
}
