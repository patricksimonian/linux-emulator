import { CommandFn } from '../types';
import { resolvePath } from '../core/resolvePaths';

export const chmod: CommandFn = async (raw, command, args, context, accountName) => {
    if (args.length < 2) {
        return { stderr: 'chmod: missing operand\n', stdout: '', code: 1 };
    }

    const modeStr = args[0];
    const fileArgs = args.slice(1);
    const mode = parseInt(modeStr, 8);

    if (isNaN(mode)) {
        return { stderr: `chmod: invalid mode: '${modeStr}'\n`, stdout: '', code: 1 };
    }

    for (const fileArg of fileArgs) {
        const filePath = resolvePath(context.cwd[accountName!], fileArg);
        const file = context.files[filePath];

        if (!file) {
            return { stderr: `chmod: cannot access '${fileArg}': No such file or directory\n`, stdout: '', code: 1 };
        }

        if (file.owner !== accountName && accountName !== 'root') {
            return { stderr: `chmod: changing permissions of '${fileArg}': Operation not permitted\n`, stdout: '', code: 1 };
        }

        file.mode = mode;
    }

    return { stdout: '', code: 0 };
};
