// ---- File System ----

export interface FileLock {
    time: string;
    userId: string;
}

export interface FileMetadata {
    type: 'file' | 'directory';
    id?: string;
    children?: string[];
    mode: number;
    owner: string;
    group: string;
    lastModified?: string;
    content?: string;
    locked?: FileLock;
}

// ---- History ----

export interface HistoryEntry {
    command: string;
    code: number;
    stdout: string;
    stderr?: string;
    userId: string;
    args: string[];
    env: Record<string, string>;
    raw?: string;
}

// ---- Participants ----

export interface Perms {
    read: string[];
    write: string[];
    execute: string[];
}

export interface Participant {
    id: string;
    account_name?: string;
    tag?: string;
    role?: string;
    permissions: Perms;
    groups: string[];
    uid?: number;
    gid?: number;
}

// ---- Processes ----

export type ProcessStatus = 'running' | 'stopped' | 'zombie' | 'sleeping';

export interface EmulatorProcess {
    pid: number;
    parentPid?: number;
    name: string;
    command: string;
    user: string;
    startTime: string;
    cpuUsage: number;
    memoryUsage: number;
    status: ProcessStatus;
    threads: number;
}

// ---- Metadata ----
// purposely set empty to allow users to bind metadata to a session for their own client purposes
// in Kanda this is where we set limitations on session interaction as well as other metadata like emulation options
// and create date etc
export interface SessionMetadata {
    /** Disk space consumed across the virtual filesystem (bytes) */
    diskSpaceUsed?: number;
    /** Total number of files in the virtual filesystem */
    totalFiles?: number;
}


// ---- Snapshot ----

export interface EmulatorSnapshot {
    env?: Record<string, string>;
    default_cwd?: string;
    processes?: EmulatorProcess[];
    files?: Record<string, FileMetadata>;
    version?: string;
    cwd?: Record<string, string>;
    lastExitCode?: number;
    timestamp: string;
}



// ---- Main Context ----

export type SessionState = 'error' | 'ready' | 'paused' | 'initializing' | 'complete';

export interface EmulatorContext {
    sessionId: string;
    env: Record<string, string>;
    default_cwd: string;
    cwd: Record<string, string>;
    files: Record<string, FileMetadata>;
    participants: Participant[];
    participantIds?: string[];
    history: Record<string, HistoryEntry[]>;
    h_index: Record<string, number>;
    state: SessionState;
    processes: EmulatorProcess[];
    metadata: SessionMetadata;
    lastExitCode?: number;
    startTime?: string;
    lastActivityTime?: string;
    version?: string;
    _sessionTimeline: EmulatorSnapshot[];
}

// ---- Command API ----

/**
 * Generic client-side action returned by a command.
 * Consumers (e.g. kanda-wss) map these to their own transport layer
 * (e.g. WebSocket messages) — the emulator has no knowledge of transport.
 */
export interface ClientAction {
    type: 'openFile' | 'closeFile' | 'printLine' | 'updateState';
    args: string[];
}

export interface CommandOutput {
    stdout: string;
    stderr?: string;
    code: number;
    clientAction?: ClientAction;
}

/**
 * Callbacks passed into command execution.
 * Replaces direct WebSocket usage so the emulator is transport-agnostic.
 */
export interface CommandCallbacks {
    onProgress?: (message: string) => void;
}

/**
 * The signature every command must implement.
 */
export interface CommandFn {
    (
        raw: string,
        command: string,
        args: string[],
        context: EmulatorContext,
        accountName?: string,
        env?: Record<string, string>,
        stdin?: string,
        callbacks?: CommandCallbacks
    ): Promise<CommandOutput>;
}

/**
 * Like CommandFn but accountName is required (used for local exec commands).
 */
export interface LocalExecCommandFn {
    (
        raw: string,
        command: string,
        args: string[],
        context: EmulatorContext,
        accountName: string,
        env?: Record<string, string>,
        stdin?: string,
        callbacks?: CommandCallbacks
    ): Promise<CommandOutput>;
}

// ---- Engine Config ----

export interface EngineConfig {
    /**
     * When true, commands found in $PATH directories of the virtual FS
     * with execute permission will be evaluated and run.
     * User-authored commands run inside a Node.js vm sandbox with no
     * access to the host filesystem or Node built-ins.
     * Default: false
     */
    allowVirtualBinCommands?: boolean;
}

// ---- Protected Directories ----

export enum DeleteProtectedDirectories {
    etc = 'etc',
    bin = 'bin',
    lib = 'lib',
    var = 'var',
    usr = 'usr',
    home = 'home',
    tmp = 'tmp',
}
