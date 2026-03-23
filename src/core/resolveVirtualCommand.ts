import { runInNewContext } from 'vm';
import { EmulatorContext, CommandFn } from '../types';
import { checkAccess, PERM_EXECUTE } from './permissions';

const VIRTUAL_CMD_TIMEOUT_MS = 5000;

/**
 * Resolves a command from the virtual filesystem by traversing $PATH.
 * Only files with execute permission are considered.
 * Evaluated inside a Node.js vm sandbox — user code has no access to
 * the host filesystem, require(), process, or any Node built-ins.
 */
export function resolveVirtualCommand(
    commandName: string,
    context: EmulatorContext,
    accountName: string
): CommandFn | null {
    const pathDirs = (context.env['PATH'] || '/usr/local/bin:/usr/bin:/bin').split(':');

    for (const dir of pathDirs) {
        const normalizedDir = dir.replace(/\/+$/, '');
        const filePath = `${normalizedDir}/${commandName}`;
        const file = context.files[filePath];

        if (!file || file.type !== 'file') continue;

        // Must have execute permission for this user
        if (!checkAccess(context, file, accountName, PERM_EXECUTE)) {
            // Return a function that yields a permission denied error
            return async () => ({
                stdout: '',
                stderr: `bash: ${commandName}: Permission denied\n`,
                code: 126,
            });
        }

        // Evaluate content inside an isolated vm context — no host access
        try {
            const fn = runInNewContext(
                `(${file.content ?? ''})`,
                {}, // empty sandbox — no require, no process, no fs
                { timeout: VIRTUAL_CMD_TIMEOUT_MS }
            ) as unknown;

            if (typeof fn !== 'function') {
                return async () => ({
                    stdout: '',
                    stderr: `bash: ${commandName}: invalid command (file content is not a function)\n`,
                    code: 126,
                });
            }

            return fn as CommandFn;
        } catch {
            return async () => ({
                stdout: '',
                stderr: `bash: ${commandName}: invalid command (failed to parse file content)\n`,
                code: 126,
            });
        }
    }

    return null;
}
