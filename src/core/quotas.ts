import { EmulatorContext } from '../types';

/** Default limits — consumers override these via EngineConfig */
const DEFAULT_MAX_DISK = 50 * 1024 * 1024; // 50 MB
const DEFAULT_MAX_FILES = 1000;

export const checkQuota = (
    context: EmulatorContext,
    sizeToAdd: number = 0,
    filesToAdd: number = 0,
    maxDiskSpace: number = DEFAULT_MAX_DISK,
    maxFiles: number = DEFAULT_MAX_FILES,
): void => {
    const diskUsed = context.metadata.diskSpaceUsed ?? 0;
    const totalFiles = context.metadata.totalFiles ?? 0;

    if (diskUsed + sizeToAdd > maxDiskSpace) {
        throw new Error(`Disk quota exceeded. Limit: ${maxDiskSpace} bytes.`);
    }
    if (totalFiles + filesToAdd > maxFiles) {
        throw new Error(`File count quota exceeded. Limit: ${maxFiles} files.`);
    }
};

export const updateUsage = (context: EmulatorContext, sizeAdded: number, filesAdded: number): void => {
    context.metadata.diskSpaceUsed = (context.metadata.diskSpaceUsed ?? 0) + sizeAdded;
    context.metadata.totalFiles = (context.metadata.totalFiles ?? 0) + filesAdded;
};
