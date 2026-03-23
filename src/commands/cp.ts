import { CommandFn } from '../types';
import { resolvePath } from '../core/resolvePaths';
import path from 'path';
import { FileMetadata } from '../types';
import crypto from 'crypto';
import { checkAccess, PERM_READ, PERM_WRITE } from '../core/permissions';
import { checkQuota, updateUsage } from '../core/quotas';

const copyRecursive = (
    srcPath: string,
    dstPath: string,
    context: Parameters<CommandFn>[3],
    accountName: string
): void => {
    const srcEntry = context.files[srcPath];
    if (!srcEntry) return;

    const sizeToAdd = srcEntry.type === 'file' ? (srcEntry.content?.length || 0) : 0;
    checkQuota(context, sizeToAdd, 1);

    const participant = context.participants.find(p => p.account_name === accountName);
    const newEntry: FileMetadata = {
        ...srcEntry,
        id: crypto.randomUUID(),
        locked: undefined,
        owner: accountName,
        group: participant?.groups?.[0] || 'users',
        mode: srcEntry.mode,
    };

    if (srcEntry.type === 'directory') {
        newEntry.children = [];
        context.files[dstPath] = newEntry;

        const dstParent = context.files[path.dirname(dstPath)];
        if (dstParent?.children && !dstParent.children.includes(path.basename(dstPath))) {
            dstParent.children.push(path.basename(dstPath));
            updateUsage(context, 0, 1);
        }

        if (srcEntry.children) {
            for (const child of srcEntry.children) {
                copyRecursive(path.join(srcPath, child), path.join(dstPath, child), context, accountName);
            }
        }
    } else {
        context.files[dstPath] = newEntry;
        const dstParent = context.files[path.dirname(dstPath)];
        if (dstParent?.children && !dstParent.children.includes(path.basename(dstPath))) {
            dstParent.children.push(path.basename(dstPath));
            updateUsage(context, sizeToAdd, 1);
        }
    }
};

export const cp: CommandFn = async (raw, command, args, context, accountName) => {
    const flags = args.filter(arg => arg.startsWith('-'));
    const fileArgs = args.filter(arg => !arg.startsWith('-'));
    const recursive = flags.includes('-r') || flags.includes('-R');

    if (fileArgs.length < 2) {
        return { stderr: 'cp: missing file operand\n', stdout: '', code: 1 };
    }

    const sourcePath = resolvePath(context.cwd[accountName!], fileArgs[0]);
    let destPath = resolvePath(context.cwd[accountName!], fileArgs[1]);

    const sourceFile = context.files[sourcePath];
    if (!sourceFile) {
        return { stderr: `cp: cannot stat '${fileArgs[0]}': No such file or directory\n`, stdout: '', code: 1 };
    }

    if (sourceFile.type === 'directory') {
        if (!recursive) {
            return { stderr: `cp: -r not specified; omitting directory '${fileArgs[0]}'\n`, stdout: '', code: 1 };
        }
        if (destPath.startsWith(sourcePath)) {
            return { stderr: `cp: cannot copy a directory, '${fileArgs[0]}', into itself, '${fileArgs[1]}'\n`, stdout: '', code: 1 };
        }
    }

    const destEntry = context.files[destPath];
    if (destEntry?.type === 'directory') {
        destPath = path.join(destPath, path.basename(sourcePath));
    }

    if (!checkAccess(context, sourceFile, accountName!, PERM_READ)) {
        return { stderr: `cp: cannot open '${fileArgs[0]}' for reading: Permission denied\n`, stdout: '', code: 1 };
    }

    try {
        const sizeToAdd = sourceFile.type === 'file' ? (sourceFile.content?.length || 0) : 0;
        checkQuota(context, sizeToAdd, 1);
    } catch (e: unknown) {
        return { stderr: `cp: ${(e as Error).message}\n`, stdout: '', code: 1 };
    }

    try {
        copyRecursive(sourcePath, destPath, context, accountName!);
    } catch (e: unknown) {
        return { stderr: `cp: ${(e as Error).message}\n`, stdout: '', code: 1 };
    }

    return { stdout: '', code: 0 };
};
