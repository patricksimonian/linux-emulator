import { CommandFn } from '../types';
import path from 'path';

export const code: CommandFn = async (input, command, args, context, accountName, __, stdin) => {
    if (args.length === 0 && !stdin) {
        return { stderr: 'code: missing argument', code: 1, stdout: '' };
    }

    const targetPath = stdin ? stdin : args[0].trim();
    const currentPath = context.cwd[accountName!];
    const files = context.files;

    let newPath = targetPath.startsWith('/')
        ? targetPath
        : currentPath === '/'
            ? `/${targetPath}`
            : `${currentPath}/${targetPath}`;

    newPath = newPath
        .split('/')
        .reduce<string[]>((acc, part) => {
            if (part === '' || part === '.') return acc;
            if (part === '..') { acc.pop(); } else { acc.push(part); }
            return acc;
        }, [])
        .join('/');

    newPath = newPath === '' ? '/' : `/${newPath}`;

    const metadata = files[newPath];
    const currentTime = new Date().toISOString();

    if (!metadata) {
        files[newPath] = {
            type: 'file',
            id: crypto.randomUUID(),
            mode: 0o644,
            owner: accountName!,
            group: 'users',
            locked: { time: currentTime, userId: accountName as string },
            lastModified: currentTime,
            content: '',
        };

        const parentDir = path.dirname(newPath);
        const fileName = path.basename(newPath);
        if (files[parentDir]?.type === 'directory') {
            if (!files[parentDir].children) files[parentDir].children = [];
            if (!files[parentDir].children!.includes(fileName)) {
                files[parentDir].children!.push(fileName);
            }
        }
    } else if (metadata.type !== 'file') {
        return { stderr: `code: ${targetPath} is a directory`, code: 1, stdout: '' };
    } else if (metadata.locked && metadata.locked.userId !== accountName) {
        return { stdout: '', code: 1, stderr: 'code: File is already locked' };
    } else if (!metadata.locked) {
        metadata.locked = { time: currentTime, userId: accountName as string };
    }

    return { stdout: '', code: 0, clientAction: { type: 'openFile', args: [newPath] } };
};
