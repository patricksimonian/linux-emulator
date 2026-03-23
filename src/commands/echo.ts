import { CommandFn, CommandOutput } from '../types';

export const echoCmd: CommandFn = async (
    raw,
    command,
    args
): Promise<CommandOutput> => {
    const noNewline = args[0] === '-n';
    const parts = noNewline ? args.slice(1) : args;
    const text = parts.join(' ');
    return { stdout: noNewline ? text : text + '\n', code: 0 };
};
