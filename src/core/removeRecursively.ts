import { EmulatorContext } from '../types';
import path from 'path';

export const removeRecursively = (c: EmulatorContext, filePath: string): boolean => {
    if (!c.files[filePath]) {
        console.error(`File or directory not found: ${filePath}`);
        return false;
    }

    const file = c.files[filePath];

    if (file.children && Array.isArray(file.children)) {
        file.children.forEach(child => {
            const childPath = path.join(filePath, child);
            if (c.files[childPath]) {
                if (c.files[childPath].type === 'directory') {
                    removeRecursively(c, childPath);
                } else {
                    delete c.files[childPath];
                }
            }
        });
    }

    delete c.files[filePath];
    return true;
};
