import { CommandFn } from '../types';
import { handleExecution } from '../core/handleExecution';

export const sudo: CommandFn = async (
    raw,
    command,
    args,
    context,
    userId,
    env,
    stdin
) => {
    if (args.length === 0) {
        return { stdout: '', stderr: 'usage: sudo <command>', code: 1 };
    }

    const sudoersPath = '/etc/sudoers';
    const sudoersFile = context.files[sudoersPath];

    if (!sudoersFile || sudoersFile.type !== 'file') {
        return { stdout: '', stderr: 'sudo: /etc/sudoers is missing', code: 1 };
    }

    const lines = sudoersFile.content?.split('\n') || [];
    const username = userId || 'unknown';

    const canSudo = lines.some(line => {
        const trimmed = line.trim();
        // Support: username ALL=(ALL) ALL
        // or: %group ALL=(ALL) ALL
        if (trimmed.startsWith('#') || trimmed === '') return false;
        const parts = trimmed.split(/\s+/);
        if (parts[0] === username) return true;
        if (parts[0]?.startsWith('%')) {
            const group = parts[0].slice(1);
            const participant = context.participants.find(p => p.account_name === username);
            return participant?.groups?.includes(group) ?? false;
        }
        return false;
    });

    if (!canSudo) {
        return { stdout: '', stderr: `${username} is not in the sudoers file. This incident will be reported.`, code: 1 };
    }

    // Re-run the rest of the args as a new command as 'root' would
    const subCommand = args[0];
    const subArgs = args.slice(1);
    const subRaw = subCommand + ' ' + subArgs.join(' ');

    return handleExecution(subRaw, subCommand, subArgs, context, 'root', env ?? {}, stdin);
};
