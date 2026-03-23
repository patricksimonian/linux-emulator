import { CommandFn, CommandOutput } from '../types';

export const groups: CommandFn = async (
    raw,
    command,
    args,
    context,
    accountName
): Promise<CommandOutput> => {
    const target = args[0] || accountName || '';
    const participant = context.participants.find(p => p.account_name === target);
    if (!participant) {
        return { stderr: `${command}: '${target}': No such user\n`, stdout: '', code: 1 };
    }
    return { stdout: participant.groups.join(' ') + '\n', code: 0 };
};
