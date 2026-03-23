import { CommandFn, CommandOutput } from '../types';

export const dateCmd: CommandFn = async (): Promise<CommandOutput> => {
    return { stdout: new Date().toString() + '\n', code: 0 };
};
