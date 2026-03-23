import { CommandFn } from '../types';

export const history: CommandFn = (raw, command, args, context, accountName) => {
    if (!accountName) {
        return Promise.resolve({ stdout: '', stderr: 'history: accountName does not exist', code: 1 });
    }
    if (!context.history[accountName]) {
        return Promise.resolve({ stdout: '', stderr: 'history: user does not have history yet', code: 1 });
    }
    const output = context.history[accountName]
        .map(h => `${h.command} ${h.args.join(' ')}`)
        .join('\n') + '\n';
    return Promise.resolve({ stdout: output, code: 0 });
};
