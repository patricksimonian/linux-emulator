import { EmulatorContext, FileMetadata } from "../types";
import path from 'path';
import crypto from 'crypto';
import { updateUsage } from "../core/quotas";

export interface GitFsStat {
    mode: number;
    size: number;
    mtimeMs: number;
    ctimeMs: number;
    atimeMs: number;
    birthtimeMs: number;
    mtime: Date;
    ctime: Date;
    atime: Date;
    birthtime: Date;
    isDirectory(): boolean;
    isFile(): boolean;
    isSymbolicLink(): boolean;
    type: 'file' | 'directory';
    ino: number;
    dev: number;
    uid: number;
    gid: number;
}

export interface GitFsPromises {
    readFile(filepath: string, options?: { encoding?: string }): Promise<Uint8Array | string>;
    writeFile(filepath: string, data: string | Uint8Array, options?: { encoding?: string; mode?: number }): Promise<void>;
    unlink(filepath: string): Promise<void>;
    readdir(filepath: string): Promise<string[]>;
    mkdir(filepath: string, options?: { mode?: number }): Promise<void>;
    rmdir(filepath: string): Promise<void>;
    stat(filepath: string): Promise<GitFsStat>;
    lstat(filepath: string): Promise<GitFsStat>;
    readlink(filepath: string): Promise<string>;
    symlink(target: string, filepath: string): Promise<void>;
}

export class GitFs {
    private context: EmulatorContext;
    private accountName: string;
    public promises: GitFsPromises;

    constructor(context: EmulatorContext, accountName: string) {
        this.context = context;
        this.accountName = accountName;

        this.promises = {
            readFile: this.readFile.bind(this),
            writeFile: this.writeFile.bind(this),
            unlink: this.unlink.bind(this),
            readdir: this.readdir.bind(this),
            mkdir: this.mkdir.bind(this),
            rmdir: this.rmdir.bind(this),
            stat: this.stat.bind(this),
            lstat: this.lstat.bind(this),
            readlink: this.readlink.bind(this),
            symlink: this.symlink.bind(this),
        };
    }

    private resolve(filepath: string): string {
        return path.isAbsolute(filepath) ? path.resolve(filepath) : path.resolve(this.context.cwd[this.accountName] || '/', filepath);
    }

    private getParticipantGroup(): string {
        const participant = this.context.participants.find((p: any) => p.account_name === this.accountName);
        return participant?.groups?.[0] || 'users';
    }

    private updateParentChildren(filepath: string, action: 'add' | 'remove') {
        const parentDir = path.dirname(filepath);
        const name = path.basename(filepath);
        const parent = this.context.files[parentDir];

        if (parent && parent.type === 'directory') {
            if (!parent.children) parent.children = [];
            if (action === 'add') {
                if (!parent.children.includes(name)) {
                    parent.children.push(name);
                }
            } else {
                parent.children = parent.children.filter((c: string) => c !== name);
            }
        }
    }

    async readFile(filepath: string, options?: { encoding?: string }): Promise<Uint8Array | string> {
        const fullPath = this.resolve(filepath);
        const file = this.context.files[fullPath];
        if (!file || file.type !== 'file') {
            const err = new Error(`ENOENT: no such file or directory, open '${filepath}'`);
            (err as any).code = 'ENOENT';
            throw err;
        }

        const buffer = Buffer.from(file.content || '', 'latin1');

        if (options?.encoding === 'utf8') return buffer.toString('utf8');
        return new Uint8Array(buffer);
    }

    async writeFile(filepath: string, data: string | Uint8Array, options?: { encoding?: string; mode?: number }): Promise<void> {
        const fullPath = this.resolve(filepath);

        const content = typeof data === 'string'
            ? Buffer.from(data, 'utf8').toString('latin1')
            : Buffer.from(data).toString('latin1');

        const file = this.context.files[fullPath];

        if (file) {
            const sizeDiff = content.length - (file.content?.length || 0);
            file.content = content;
            if (options?.mode !== undefined) file.mode = options.mode;
            updateUsage(this.context, sizeDiff, 0);
        } else {
            const newFile: FileMetadata = {
                type: 'file',
                id: crypto.randomUUID(),
                mode: options?.mode !== undefined ? options.mode : 0o644,
                owner: this.accountName,
                group: this.getParticipantGroup(),
                content: content,
            };
            this.context.files[fullPath] = newFile;
            this.updateParentChildren(fullPath, 'add');
            updateUsage(this.context, content.length, 1);
        }
    }

    async unlink(filepath: string): Promise<void> {
        const fullPath = this.resolve(filepath);
        const file = this.context.files[fullPath];
        if (!file) {
            const err = new Error(`ENOENT: no such file, unlink '${filepath}'`);
            (err as any).code = 'ENOENT';
            throw err;
        }

        const size = file.content?.length || 0;
        delete this.context.files[fullPath];
        this.updateParentChildren(fullPath, 'remove');
        updateUsage(this.context, -size, -1);
    }

    async readdir(filepath: string): Promise<string[]> {
        const fullPath = this.resolve(filepath);
        const dir = this.context.files[fullPath];
        if (!dir || dir.type !== 'directory') {
            const err = new Error(`ENOTDIR: not a directory, readdir '${filepath}'`);
            (err as any).code = 'ENOTDIR';
            throw err;
        }
        return dir.children || [];
    }

    async mkdir(filepath: string, options?: { mode?: number }): Promise<void> {
        const fullPath = this.resolve(filepath);
        if (this.context.files[fullPath]) return;

        const newDir: FileMetadata = {
            type: 'directory',
            id: crypto.randomUUID(),
            children: [],
            mode: options?.mode !== undefined ? options.mode : 0o755,
            owner: this.accountName,
            group: this.getParticipantGroup(),
        };
        this.context.files[fullPath] = newDir;
        this.updateParentChildren(fullPath, 'add');
        updateUsage(this.context, 0, 1);
    }

    async rmdir(filepath: string): Promise<void> {
        const fullPath = this.resolve(filepath);
        const dir = this.context.files[fullPath];
        if (!dir || dir.type !== 'directory') {
            const err = new Error(`ENOTDIR: not a directory, rmdir '${filepath}'`);
            (err as any).code = 'ENOTDIR';
            throw err;
        }
        if (dir.children && dir.children.length > 0) {
            const err = new Error(`ENOTEMPTY: directory not empty, rmdir '${filepath}'`);
            (err as any).code = 'ENOTEMPTY';
            throw err;
        }
        delete this.context.files[fullPath];
        this.updateParentChildren(fullPath, 'remove');
        updateUsage(this.context, 0, -1);
    }

    async stat(filepath: string): Promise<GitFsStat> {
        const fullPath = this.resolve(filepath);
        const file = this.context.files[fullPath];
        if (!file) {
            const err = new Error(`ENOENT: no such file or directory, stat '${filepath}'`);
            (err as any).code = 'ENOENT';
            throw err;
        }

        const mtime = file.lastModified ? new Date(file.lastModified) : new Date();
        const mtimeMs = mtime.getTime();

        return {
            mode: file.mode,
            size: file.type === 'file' ? (file.content?.length || 0) : 0,
            mtimeMs,
            ctimeMs: mtimeMs,
            atimeMs: mtimeMs,
            birthtimeMs: mtimeMs,
            mtime,
            ctime: mtime,
            atime: mtime,
            birthtime: mtime,
            isDirectory: () => file.type === 'directory',
            isFile: () => file.type === 'file',
            isSymbolicLink: () => false,
            type: file.type,
            ino: 0,
            dev: 0,
            uid: 0,
            gid: 0,
        };
    }

    async lstat(filepath: string): Promise<GitFsStat> {
        return this.stat(filepath);
    }

    async readlink(filepath: string): Promise<string> {
        const err = new Error("readlink not implemented");
        (err as any).code = 'ENOSYS';
        throw err;
    }

    async symlink(_target: string, _filepath: string): Promise<void> {
        const err = new Error("symlink not implemented");
        (err as any).code = 'ENOSYS';
        throw err;
    }
}
