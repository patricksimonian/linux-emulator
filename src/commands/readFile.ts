import { CommandFn, CommandOutput } from '../types';
import path from 'path';
import { checkAccess, PERM_READ } from '../core/permissions';

export const readFile: CommandFn = async (
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
    let fullPath = filename.startsWith('/')
        ? filename
        : `${context.cwd[accountName!]}/${filename}`;
    fullPath = path.resolve(fullPath);
    const file = context.files[fullPath];

    if (!file) {
        return { stderr: 'No file found', code: 1, stdout: '' };
    }

    if (!checkAccess(context, file, accountName!, PERM_READ)) {
        return { stderr: `${command}: cannot read '${filename}': Permission denied\n`, stdout: '', code: 1 };
    }

    return { stdout: file.content || '', code: 0 };
};
