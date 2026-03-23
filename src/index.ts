/**
 * kanda-linux-emulator
 * Standalone Linux emulation engine — commands, filesystem, sandboxing.
 * Fully decoupled from other kanda services - FINALLY!
 */

// Core types
export * from './types';

// Core execution pipeline
export { handleExecution, ENV_VAR_REGEX } from './core/handleExecution';

// Tab-completion
export { getCompletions } from './core/getCompletions';

// Command registry (all built-in commands)
export {
    emulatedCommands,
    localExecCommands,
    readOnlyCommands,
    writeCommands,
} from './commands';

// Virtual /bin command resolution (for allowVirtualBinCommands opt-in)
export { resolveVirtualCommand } from './core/resolveVirtualCommand';

// Core utilities (exposed for consumers that build on top of the engine)
export { expandVariables } from './core/expandVariables';
export { processRawInput } from './core/processRawInput';
export { resolvePath } from './core/resolvePaths';
export { handleRedirections } from './core/handleRedirections';
export { stripAnsiCodes } from './core/stripAnsi';
export { createSnapshot } from './core/snapshot';
export { removeRecursively } from './core/removeRecursively';
export { checkAccess, modeToString, PERM_READ, PERM_WRITE, PERM_EXECUTE } from './core/permissions';
export { checkQuota, updateUsage } from './core/quotas';
export { parseArgs, createSchema, tokenize } from './core/parseArgs';
export {
    getHistoricalCommandFromIndex,
    resetHistoricalIndex,
} from './core/navigateToHistoricalCommand';
export { unlockFile } from './core/unlockFile';

// Sandbox utilities (for consumers that run real binaries)
export {
    runInSandbox,
    createSandboxedTempDir,
    SANDBOX_WORKDIR,
} from './core/linuxSandbox';
export { writeFileToSandbox, getSandboxBinds } from './core/fileToSystem';

// External binary registry
export { supportedBins, isToolSupported, registerBin } from './commands/bin';

// Utils
export { isValueInEnum } from './utils/valueInEnum';
