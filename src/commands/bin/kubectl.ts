import { LocalExecCommandFn } from '../../types';

/** Configurable path to the kubectl binary — set via option when creating the engine */
export let KUBECTL_BIN_PATH = process.env.LOCAL_EXEC_BIN_PATH
    ? process.env.LOCAL_EXEC_BIN_PATH + '/kubectl'
    : '/usr/local/bin/kubectl';

export function setKubectlBinPath(p: string) {
    KUBECTL_BIN_PATH = p;
}

// Actual kubectl command is implemented externally (sandboxed) or can be stubbed.
// This is a no-op placeholder; consumers inject their own implementation via `setBinCommand`.
export const kubectl: LocalExecCommandFn = async (raw, command, args, context, accountName, env) => {
    return { stdout: '', stderr: 'kubectl: not available in this environment\n', code: 1 };
};
