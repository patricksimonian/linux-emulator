import { CommandFn } from '../types';

export const ps: CommandFn = async (raw, command, args, context) => {
    let output = 'PID\tUSER\tSTATUS\tCOMMAND\n';
    const processes = context.processes || [];
    for (const proc of processes) {
        output += `${proc.pid}\t${proc.user}\t${proc.status}\t${proc.command}\n`;
    }
    return { stdout: output, code: 0 };
};
