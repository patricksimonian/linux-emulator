import { resolvePath } from '../core/resolvePaths';
import { CommandFn } from '../types';
import path from 'path';
import { modeToString } from '../core/permissions';
import { parseArgs, createSchema, tokenize } from '../core/parseArgs';

export const ls: CommandFn = async (raw, command, args, context, accountName) => {
    const schema = createSchema('POSIX', {
        l: { name: 'l', short: 'l', type: 'boolean' },
        a: { name: 'a', short: 'a', type: 'boolean' }
    }, { l: 'l', a: 'a' });

    const tokens = tokenize(args, schema);
    const parsedArgs = parseArgs(tokens, schema);
    const showDetails = parsedArgs.flags.l;
    const showHidden = parsedArgs.flags.a;
    const pathArgs = parsedArgs.positionals;

    const dirPath = resolvePath(context.cwd[accountName!], pathArgs[0] || '.');
    const directory = context.files[dirPath];

    if (!directory) {
        return { stderr: `Error: ${dirPath} does not exist.\n`, stdout: '', code: 1 };
    }

    if (directory.type !== 'directory') {
        if (showDetails) {
            const modeStr = modeToString(directory.mode, 'file');
            return { stdout: `${modeStr} ${directory.owner} ${directory.group} ${path.basename(dirPath)}\n`, code: 0 };
        }
        return { stdout: `${path.basename(dirPath)}\n`, code: 0 };
    }

    let children = directory.children || [];
    if (!showHidden) {
        children = children.filter(c => !c.startsWith('.'));
    }

    const formatName = (name: string, isDir: boolean) => {
        if (name.startsWith('.') && isDir) return `\x1b[94m${name}\x1b[0m`;
        return isDir ? `\x1b[34m${name}\x1b[0m` : name;
    };

    if (showDetails) {
        const lines = children.map(childName => {
            const childFullPath = path.join(dirPath, childName);
            const child = context.files[childFullPath];
            if (!child) return '';
            const modeStr = modeToString(child.mode, child.type);
            const formattedName = formatName(childName, child.type === 'directory');
            return `${modeStr} ${child.owner} ${child.group} ${formattedName}`;
        });
        return { stdout: `${lines.join('\n')}\n`, code: 0 };
    }

    const formattedChildren = children.map(childName => {
        const childFullPath = path.join(dirPath, childName);
        const child = context.files[childFullPath];
        const isDir = child ? child.type === 'directory' : false;
        return formatName(childName, isDir);
    });

    return { stdout: `${formattedChildren.join('\n')}\n`, code: 0 };
};
