import { CommandFn } from '../types';

export const kill: CommandFn = async (raw, command, args, context, accountName) => {
    if (args.length === 0) {
        return { stderr: "kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]\n", stdout: '', code: 1 };
    }

    const pidStr = args[args.length - 1];
    const pid = parseInt(pidStr, 10);

    if (isNaN(pid)) {
        return { stderr: `kill: ${pidStr}: arguments must be process or job IDs\n`, stdout: '', code: 1 };
    }

    const procIndex = context.processes?.findIndex(p => p.pid === pid) ?? -1;

    if (procIndex === -1) {
        return { stderr: `kill: (${pid}) - No such process\n`, stdout: '', code: 1 };
    }

    context.processes.splice(procIndex, 1);
    return { stdout: '', code: 0 };
};
