import { CommandFn, CommandOutput } from '../types';

export const unset: CommandFn = async (
    raw,
    command,
    args,
    context
): Promise<CommandOutput> => {
    for (const arg of args) {
        delete context.env[arg];
    }
    return { stdout: '', code: 0 };
};
