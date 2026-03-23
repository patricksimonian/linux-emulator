import { CommandFn, CommandOutput, DeleteProtectedDirectories } from '../types';
import path from 'path';
import { isValueInEnum } from '../utils/valueInEnum';
import { removeRecursively } from '../core/removeRecursively';
import { checkAccess, PERM_WRITE } from '../core/permissions';

export const rm: CommandFn = async (
    raw,
    command,
    args,
    context,
    accountName,
    env,
    stdin
): Promise<CommandOutput> => {
    if (args.length === 0 && !stdin) {
        return { stderr: `${command}: missing file operand\n`, stdout: '', code: 1 };
    }

    const hasRf = raw.includes('-rf');

    if (hasRf && args.length !== 2) {
        return { stderr: `${command}: missing file operand\n`, stdout: '', code: 1 };
    }
    if (!hasRf && args.length > 1) {
        return { stderr: `${command}: only supports -rf flag\n`, stdout: '', code: 1 };
    }

    const arg = args.filter(a => a !== '-rf')[0];
    let fullPath = arg.startsWith('/')
        ? arg
        : `${context.cwd[accountName!]}/${arg}`;
    fullPath = path.resolve(fullPath);

    const file = context.files[fullPath];

    if (!file) {
        return { stderr: `${command}: File not Found\n`, stdout: '', code: 1 };
    }

    if (!checkAccess(context, file, accountName!, PERM_WRITE)) {
        return { stderr: `${command}: cannot rm '${arg}': Permission denied\n`, stdout: '', code: 1 };
    }

    if (file.type === 'directory' && !hasRf) {
        return { stderr: `${command}: cannot remove '${arg}' because it is a directory`, stdout: '', code: 1 };
    }

    if (hasRf && file.type === 'directory') {
        if (isValueInEnum(path.basename(fullPath), DeleteProtectedDirectories)) {
            return { stderr: `${command}: cannot remove '${arg}' because it is delete-protected`, stdout: '', code: 1 };
        }
        removeRecursively(context, fullPath);
        const parentPath = path.dirname(fullPath);
        const parentFolder = context.files[parentPath];
        if (parentFolder?.type === 'directory' && Array.isArray(parentFolder.children)) {
            parentFolder.children = parentFolder.children.filter(c => c !== path.basename(fullPath));
        }
    } else {
        const parentPath = path.dirname(fullPath);
        const parentFolder = context.files[parentPath];
        if (parentFolder?.children) {
            parentFolder.children = parentFolder.children.filter(c => c !== path.basename(fullPath));
        }
        delete context.files[fullPath];
    }

    return { stdout: '\n', code: 0 };
};
