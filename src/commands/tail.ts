import { CommandFn } from '../types';
import { resolvePath } from '../core/resolvePaths';
import { checkAccess, PERM_READ } from '../core/permissions';

export const tail: CommandFn = async (raw, command, args, context, accountName, env, stdin) => {
    let linesToRead = 10;
    let fileArgs = args;

    if (args.length > 0 && args[0] === '-n') {
        if (args.length < 2) {
            return { stderr: "tail: option requires an argument -- 'n'\n", stdout: '', code: 1 };
        }
        const n = parseInt(args[1], 10);
        if (isNaN(n)) {
            return { stderr: `tail: invalid number of lines: '${args[1]}'\n`, stdout: '', code: 1 };
        }
        linesToRead = n;
        fileArgs = args.slice(2);
    }

    let content = '';

    if (fileArgs.length === 0) {
        if (stdin) { content = stdin; }
        else { return { stderr: 'tail: missing file operand\n', stdout: '', code: 1 }; }
    } else {
        const filePath = resolvePath(context.cwd[accountName!], fileArgs[0]);
        const file = context.files[filePath];
        if (!file) return { stderr: `tail: cannot open '${fileArgs[0]}' for reading: No such file or directory\n`, stdout: '', code: 1 };
        if (file.type === 'directory') return { stderr: `tail: error reading '${fileArgs[0]}': Is a directory\n`, stdout: '', code: 1 };
        if (!checkAccess(context, file, accountName!, PERM_READ)) return { stderr: `tail: cannot open '${fileArgs[0]}' for reading: Permission denied\n`, stdout: '', code: 1 };
        content = file.content || '';
    }

    if (linesToRead === 0) return { stdout: '', code: 0 };

    const lines = content.split('\n');
    return { stdout: lines.slice(-linesToRead).join('\n') + '\n', code: 0 };
};
