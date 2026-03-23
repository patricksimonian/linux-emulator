export const supportedBins: Record<string, string> = {
    kubectl: process.env.LOCAL_EXEC_BIN_PATH
        ? process.env.LOCAL_EXEC_BIN_PATH + '/kubectl'
        : '/usr/local/bin/kubectl',
};

export const isToolSupported = (toolName: string): boolean => {
    return Object.keys(supportedBins).includes(toolName);
};

/** Register an additional external binary tool at runtime */
export const registerBin = (name: string, binaryPath: string): void => {
    supportedBins[name] = binaryPath;
};
