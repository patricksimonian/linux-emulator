import { CommandFn, CommandOutput } from '../types';

export const pwd: CommandFn = async (
    raw,
    command,
    args,
    context,
    accountName
): Promise<CommandOutput> => {
    const cwd = context.cwd[accountName!] || context.default_cwd;
    return { stdout: cwd + '\n', code: 0 };
};
