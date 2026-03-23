import { CommandFn } from '../types';
import { resolvePath } from '../core/resolvePaths';

export const chown: CommandFn = async (raw, command, args, context, accountName) => {
    if (args.length < 2) {
        return { stderr: 'chown: missing operand\n', stdout: '', code: 1 };
    }

    const ownerGroup = args[0];
    const fileArgs = args.slice(1);

    let newOwner = ownerGroup;
    let newGroup: string | undefined;

    if (ownerGroup.includes(':')) {
        const parts = ownerGroup.split(':');
        newOwner = parts[0];
        newGroup = parts[1];
    }

    if (newOwner) {
        const participant = context.participants.find(p => p.id === newOwner || p.account_name === newOwner);
        if (participant) {
            newOwner = participant.account_name ?? newOwner;
        } else if (newOwner !== 'root' && newOwner !== 'kanda_users' && newOwner !== 'default_user') {
            return { stderr: `chown: invalid user: '${newOwner}'\n`, stdout: '', code: 1 };
        }
    }

    for (const fileArg of fileArgs) {
        const filePath = resolvePath(context.cwd[accountName!], fileArg);
        const file = context.files[filePath];

        if (!file) {
            return { stderr: `chown: cannot access '${fileArg}': No such file or directory\n`, stdout: '', code: 1 };
        }

        if (file.owner !== accountName && accountName !== 'root') {
            return { stderr: `chown: changing ownership of '${fileArg}': Operation not permitted\n`, stdout: '', code: 1 };
        }

        if (newOwner) file.owner = newOwner;
        if (newGroup) file.group = newGroup;
    }

    return { stdout: '', code: 0 };
};
