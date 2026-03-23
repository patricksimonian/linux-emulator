import { FileMetadata } from '../types';
import { CommandFn, CommandOutput } from '../types';
import path from 'path';
import crypto from 'crypto';
import { checkQuota, updateUsage } from '../core/quotas';

export const touch: CommandFn = async (
    raw,
    command,
    args,
    context,
    accountName
): Promise<CommandOutput> => {
    if (args.length === 0) {
        return { stderr: `${command}: missing file operand\n`, stdout: '', code: 1 };
    }

    const fileName = args[0].trim();
    let fullPath = fileName.startsWith('/')
        ? fileName
        : `${context.cwd[accountName!]}/${fileName}`;
    fullPath = path.resolve(fullPath);
    const file = context.files[fullPath];

    if (file) {
        file.id = crypto.randomUUID();
        return { stdout: '', code: 0 };
    }

    try {
        checkQuota(context, 0, 1);
    } catch (e: unknown) {
        return { stderr: `${command}: ${(e as Error).message}\n`, stdout: '', code: 1 };
    }

    const participant = context.participants.find(p => p.account_name === accountName);
    const userGroup = participant?.groups?.[0] || 'users';

    const newFile: FileMetadata = {
        type: 'file',
        id: crypto.randomUUID(),
        mode: 0o644,
        owner: accountName!,
        group: userGroup,
        content: '',
        locked: undefined,
    };

    context.files[fullPath] = newFile;
    const fileDir = path.dirname(fullPath);
    const name = path.basename(fullPath);
    context.files[fileDir]?.children?.push(name);
    updateUsage(context, 0, 1);

    return { stdout: '', code: 0 };
};
