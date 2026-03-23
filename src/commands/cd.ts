import { CommandFn, CommandOutput } from '../types';
import { resolvePath } from '../core/resolvePaths';

export const cd: CommandFn = async (
    raw,
    command,
    args,
    context,
    accountName
): Promise<CommandOutput> => {
    if (!accountName) return { stdout: '', stderr: `${command}: no user context\n`, code: 1 };

    const currentPath = context.cwd[accountName] || context.default_cwd;

    if (args.length === 0) {
        context.cwd[accountName] = context.env['HOME'] || '/';
        return { stdout: '', code: 0 };
    }

    const targetArg = args[0].trim();
    const targetPath = resolvePath(currentPath, targetArg);

    const dir = context.files[targetPath];
    if (!dir || dir.type !== 'directory') {
        return {
            stderr: `${command}: ${targetArg}: No such file or directory\n`,
            stdout: '',
            code: 1,
        };
    }

    context.cwd[accountName] = targetPath;
    return { stdout: '', code: 0 };
};
