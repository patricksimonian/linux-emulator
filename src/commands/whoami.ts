import { CommandFn, CommandOutput } from '../types';

export const whoami: CommandFn = async (
    raw,
    command,
    args,
    context,
    accountName
): Promise<CommandOutput> => {
    return { stdout: (accountName || 'unknown') + '\n', code: 0 };
};
