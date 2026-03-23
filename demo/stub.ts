// Stub for Node.js built-ins in the browser
export const resolve = (...args: string[]) => args.join('/');
export const dirname = (p: string) => {
    const parts = p.split('/');
    parts.pop();
    return parts.length === 0 ? '/' : (parts.join('/') || '/');
};
export const basename = (p: string) => p.split('/').pop() || '';
export const relative = (from: string, to: string) => to;
export const join = (...args: string[]) => args.join('/');
export const sep = '/';

export const randomUUID = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'browser-uuid';
export const randomBytes = () => new Uint8Array(16);

export const exec = () => {};
export const execSync = () => {};
export const execFile = () => {};
export const spawn = () => {};
export const spawnSync = () => {};

export const runInNewContext = (code: string) => {
    // Basic polyfill for executing sandboxed commands in the browser demo
    return (0, eval)(code);
};
export const Script = class {};
export const createContext = () => {};

export const mkdir = () => Promise.resolve();
export const rm = () => Promise.resolve();
export const promises = { mkdir, rm };

export default {
    resolve, dirname, basename, relative, join, sep,
    randomUUID, randomBytes,
    exec, execSync, execFile, spawn, spawnSync,
    runInNewContext, Script, createContext,
    mkdir, rm, promises
};
