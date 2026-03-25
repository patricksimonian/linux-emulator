import { CommandFn, CommandOutput } from '../types';
import path from 'path';
import { checkAccess, PERM_READ } from '../core/permissions';

export const cat: CommandFn = async (
    raw,
    command,
    args,
    context,
    accountName,
    env,
    stdin
): Promise<CommandOutput> => {
    if (args.length === 0) {
        if (stdin !== undefined) {
            return { stdout: stdin, code: 0 };
        }
        return {
            stderr: `${command}: missing file operand\n`,
            stdout: '',
            code: 1,
        };
    }
    const fileName = args[0].trim();

    let fullPath = fileName.startsWith('/')
        ? fileName
        : `${context.cwd[accountName!]}/${fileName}`;
    fullPath = path.resolve(fullPath);
    const file = context.files[fullPath];

    if (file) {
        if (!checkAccess(context, file, accountName!, PERM_READ)) {
            return {
                stderr: `${command}: cannot cat '${fileName}': Permission denied\n`,
                stdout: '',
                code: 1,
            };
        }

        return {
            stdout: file.content ?? '',
            code: 0,
        };
    } else {
        return {
            stderr: `${command}: File not Found\n`,
            stdout: '',
            code: 1,
        };
    }
};
