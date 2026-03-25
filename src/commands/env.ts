import { CommandFn, CommandOutput } from '../types';

export const envCmd: CommandFn = async (
    raw,
    command,
    args,
    context,
    accountName,
    env
): Promise<CommandOutput> => {
    const activeEnv = env ?? context.env;
    const envLines = Object.entries(activeEnv)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
    return { stdout: envLines + '\n', code: 0 };
};
