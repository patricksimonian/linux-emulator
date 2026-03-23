import { FileMetadata } from '../types';
import { CommandFn, CommandOutput } from '../types';
import path from 'path';
import crypto from 'crypto';
import { checkQuota, updateUsage } from '../core/quotas';
import { checkAccess, PERM_WRITE } from '../core/permissions';

export const mkdir: CommandFn = async (
    raw,
    command,
    args,
    context,
    accountName
): Promise<CommandOutput> => {
    if (args.length === 0) {
        return { stderr: `${command}: missing file operand\n`, stdout: '', code: 1 };
    }

    const folder = args[0].trim();
    let fullPath = folder.startsWith('/')
        ? folder
        : `${context.cwd[accountName!]}/${folder}`;
    fullPath = path.resolve(fullPath);
    const existing = context.files[fullPath];

    if (existing) {
        existing.id = crypto.randomUUID();
        return { stdout: '', code: 0 };
    }

    try {
        checkQuota(context, 0, 1);
    } catch (e: unknown) {
        return { stderr: `${command}: ${(e as Error).message}\n`, stdout: '', code: 1 };
    }

    const fileDir = path.dirname(fullPath);
    if (!context.files[fileDir]) {
        return { stderr: `Error mkdir: path to dir ${fullPath} does not exist\n`, stdout: '', code: 1 };
    }

    if (!checkAccess(context, context.files[fileDir], accountName!, PERM_WRITE)) {
        return { stderr: `${command}: permission denied\n`, stdout: '', code: 1 };
    }

    const participant = context.participants.find(p => p.account_name === accountName);
    const userGroup = participant?.groups?.[0] || 'users';

    const newDir: FileMetadata = {
        type: 'directory',
        id: crypto.randomUUID(),
        children: [],
        mode: 0o755,
        owner: accountName!,
        group: userGroup,
    };

    context.files[fullPath] = newDir;
    const name = path.basename(fullPath);
    context.files[fileDir]?.children?.push(name);
    updateUsage(context, 0, 1);

    return { stdout: '', code: 0 };
};
