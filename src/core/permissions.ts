import { FileMetadata, EmulatorContext } from '../types';

export const PERM_READ = 4;
export const PERM_WRITE = 2;
export const PERM_EXECUTE = 1;

export const checkAccess = (
    context: EmulatorContext,
    file: FileMetadata,
    accountName: string,
    requiredPerm: number
): boolean => {
    if (accountName === 'root') return true;

    const participant = context.participants.find(p => p.account_name === accountName);
    const userGroups = participant?.groups || [];

    // Owner
    if (file.owner === accountName) {
        return ((file.mode >> 6) & requiredPerm) === requiredPerm;
    }

    // Group
    if (userGroups.includes(file.group)) {
        return ((file.mode >> 3) & requiredPerm) === requiredPerm;
    }

    // Others
    return (file.mode & requiredPerm) === requiredPerm;
};

export const modeToString = (mode: number, type: 'file' | 'directory'): string => {
    const typeChar = type === 'directory' ? 'd' : '-';

    const permString = (m: number) => {
        let s = '';
        s += (m & PERM_READ) ? 'r' : '-';
        s += (m & PERM_WRITE) ? 'w' : '-';
        s += (m & PERM_EXECUTE) ? 'x' : '-';
        return s;
    };

    return typeChar +
        permString(mode >> 6) +
        permString(mode >> 3) +
        permString(mode);
};
