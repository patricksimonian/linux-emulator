import { FileMetadata } from '../types';
import { CommandFn, CommandOutput } from '../types';
import path from 'path';
import { checkAccess, PERM_WRITE } from '../core/permissions';
import { checkQuota, updateUsage } from '../core/quotas';
import crypto from 'crypto';

export const appendToFile: CommandFn = async (
    raw,
    command,
    args,
    context,
    accountName
): Promise<CommandOutput> => {
    if (args.length === 0) {
        return { stderr: `${command}: missing file operand\n`, stdout: '', code: 1 };
    }

    const filename = args[0].trim();
    const content = args.slice(1).join('');
    let fullPath = filename.startsWith('/')
        ? filename
        : `${context.cwd[accountName!]}/${filename}`;
    fullPath = path.resolve(fullPath);
    const file = context.files[fullPath];

    if (file) {
        if (!checkAccess(context, file, accountName!, PERM_WRITE)) {
            return { stderr: `${command}: cannot write to '${filename}': Permission denied\n`, stdout: '', code: 1 };
        }
        try { checkQuota(context, content.length, 0); }
        catch (e: unknown) { return { stderr: `${command}: ${(e as Error).message}\n`, stdout: '', code: 1 }; }

        file.content += content;
        updateUsage(context, content.length, 0);
        return { stdout: '', code: 0 };
    } else {
        try { checkQuota(context, content.length, 1); }
        catch (e: unknown) { return { stderr: `${command}: ${(e as Error).message}\n`, stdout: '', code: 1 }; }

        const participant = context.participants.find(p => p.account_name === accountName);
        const userGroup = participant?.groups?.[0] || 'users';

        const newFile: FileMetadata = {
            type: 'file',
            id: crypto.randomUUID(),
            mode: 0o644,
            owner: accountName!,
            group: userGroup,
            locked: undefined,
            content,
        };

        context.files[fullPath] = newFile;
        const fileDir = path.dirname(fullPath);
        context.files[fileDir]?.children?.push(path.basename(fullPath));
        updateUsage(context, content.length, 1);
        return { code: 0, stdout: '' };
    }
};
