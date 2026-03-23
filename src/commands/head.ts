import { CommandFn } from '../types';
import { resolvePath } from '../core/resolvePaths';
import { checkAccess, PERM_READ } from '../core/permissions';

export const head: CommandFn = async (raw, command, args, context, accountName, env, stdin) => {
    let linesToRead = 10;
    let fileArgs = args;

    if (args.length > 0 && args[0] === '-n') {
        if (args.length < 2) {
            return { stderr: "head: option requires an argument -- 'n'\n", stdout: '', code: 1 };
        }
        const n = parseInt(args[1], 10);
        if (isNaN(n)) {
            return { stderr: `head: invalid number of lines: '${args[1]}'\n`, stdout: '', code: 1 };
        }
        linesToRead = n;
        fileArgs = args.slice(2);
    }

    let content = '';

    if (fileArgs.length === 0) {
        if (stdin) { content = stdin; }
        else { return { stderr: 'head: missing file operand\n', stdout: '', code: 1 }; }
    } else {
        const filePath = resolvePath(context.cwd[accountName!], fileArgs[0]);
        const file = context.files[filePath];
        if (!file) return { stderr: `head: cannot open '${fileArgs[0]}' for reading: No such file or directory\n`, stdout: '', code: 1 };
        if (file.type === 'directory') return { stderr: `head: error reading '${fileArgs[0]}': Is a directory\n`, stdout: '', code: 1 };
        if (!checkAccess(context, file, accountName!, PERM_READ)) return { stderr: `head: cannot open '${fileArgs[0]}' for reading: Permission denied\n`, stdout: '', code: 1 };
        content = file.content || '';
    }

    const lines = content.split('\n');
    return { stdout: lines.slice(0, linesToRead).join('\n') + '\n', code: 0 };
};
