import { CommandFn, CommandOutput } from '../types';

export const exportCmd: CommandFn = async (
    raw,
    command,
    args,
    context
): Promise<CommandOutput> => {
    if (args.length === 0) {
        const lines = Object.entries(context.env)
            .map(([k, v]) => `export ${k}="${v}"`)
            .join('\n');
        return { stdout: lines + '\n', code: 0 };
    }

    for (const arg of args) {
        const eqIdx = arg.indexOf('=');
        if (eqIdx === -1) {
            // export an existing variable — no-op here (already in env)
            continue;
        }
        const key = arg.slice(0, eqIdx);
        const value = arg.slice(eqIdx + 1);
        context.env[key] = value;
    }

    return { stdout: '', code: 0 };
};
