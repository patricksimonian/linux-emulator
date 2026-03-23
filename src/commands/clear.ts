import { CommandFn, CommandOutput } from '../types';

export const clear: CommandFn = async (): Promise<CommandOutput> => {
    return { stdout: '\x1B[2J\x1B[0f', code: 0 };
};
