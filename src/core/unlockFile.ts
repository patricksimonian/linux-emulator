import { EmulatorContext } from '../types';

export function unlockFile(context: EmulatorContext, filePath: string, accountName: string) {
    if (!context.files[filePath]) {
        console.warn(`unlockFile for session ${context.sessionId}, path ${filePath}: file not found`);
    } else if (context.files[filePath].locked === null) {
        console.warn(`unlockFile for session ${context.sessionId}, path ${filePath}: file already unlocked`);
    } else if (context.files[filePath].locked?.userId !== accountName) {
        console.warn(`unlockFile for session ${context.sessionId}, path ${filePath}: user ${accountName} cannot unlock file`);
    } else {
        context.files[filePath].locked = undefined;
    }
}
