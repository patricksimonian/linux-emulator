import { CommandFn, CommandOutput } from '../types';

export const envCmd: CommandFn = async (
    raw,
    command,
    args,
    context
): Promise<CommandOutput> => {
    const envLines = Object.entries(context.env)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
    return { stdout: envLines + '\n', code: 0 };
};
