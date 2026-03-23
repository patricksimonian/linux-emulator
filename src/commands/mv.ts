import { CommandFn } from '../types';
import { resolvePath } from '../core/resolvePaths';
import path from 'path';
import { checkAccess, PERM_WRITE } from '../core/permissions';

export const mv: CommandFn = async (raw, command, args, context, accountName) => {
    if (args.length < 2) {
        return { stderr: 'mv: missing file operand\n', stdout: '', code: 1 };
    }

    const sourcePath = resolvePath(context.cwd[accountName!], args[0]);
    let destPath = resolvePath(context.cwd[accountName!], args[1]);

    const sourceFile = context.files[sourcePath];
    if (!sourceFile) {
        return { stderr: `mv: cannot stat '${args[0]}': No such file or directory\n`, stdout: '', code: 1 };
    }

    if (!checkAccess(context, sourceFile, accountName!, PERM_WRITE)) {
        return { stderr: `mv: cannot move '${args[0]}': Permission denied\n`, stdout: '', code: 1 };
    }

    if (destPath === sourcePath) return { stdout: '', code: 0 };

    const destFileEntry = context.files[destPath];
    if (destFileEntry?.type === 'directory') {
        destPath = path.join(destPath, path.basename(sourcePath));
    }

    if (sourcePath === destPath) return { stdout: '', code: 0 };

    context.files[destPath] = sourceFile;
    delete context.files[sourcePath];

    const sourceParent = context.files[path.dirname(sourcePath)];
    if (sourceParent?.children) {
        sourceParent.children = sourceParent.children.filter(c => c !== path.basename(sourcePath));
    }

    const destParent = context.files[path.dirname(destPath)];
    const destName = path.basename(destPath);
    if (destParent?.children && !destParent.children.includes(destName)) {
        destParent.children.push(destName);
    }

    return { stdout: '', code: 0 };
};
