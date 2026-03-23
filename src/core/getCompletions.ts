import { FileMetadata, EmulatorContext } from '../types';
import { localExecCommands, emulatedCommands } from '../commands';

const builtins = Object.keys({ ...localExecCommands, ...emulatedCommands });

type AutocompleteState = {
    completions: string[];
    isFirstWord: boolean;
    lastPart: string;
    suffix: string;
};

export const getCompletions = (
    prompt: string,
    session: EmulatorContext,
    accountName: string
): AutocompleteState => {
    const parts = prompt.trim().split(/\s+/);
    const lastPart = parts[parts.length - 1] ?? '';
    const isFirstWord = parts.length === 1;

    const suggestions = new Set<string>();
    const autoCompleteState: AutocompleteState = {
        completions: [],
        isFirstWord,
        lastPart,
        suffix: parts.slice(0, -1).join(' ')
    };

    try {
        if (isFirstWord) {
            suggestCommands(lastPart, session).forEach(c => suggestions.add(c));
            suggestFiles(lastPart, session, accountName).forEach(f => suggestions.add(f));
        } else {
            suggestFiles(lastPart, session, accountName).forEach(f => suggestions.add(f));
        }
    } catch (e) {
        console.error('Error getting completions: ', e);
    }

    autoCompleteState.completions = Array.from(suggestions);
    return autoCompleteState;
};

function suggestCommands(prefix: string, session: EmulatorContext): string[] {
    const cmds = new Set(builtins);

    if (session.env?.PATH) {
        const pathDirs = session.env.PATH.split(':');
        for (const dir of pathDirs) {
            const normalizedDir = dir.endsWith('/') ? dir : dir + '/';
            for (const filePath of Object.keys(session.files)) {
                if (filePath.startsWith(normalizedDir)) {
                    const cmd = filePath.slice(normalizedDir.length).split('/')[0];
                    if (cmd) cmds.add(cmd);
                }
            }
        }
    }

    for (const filePath of Object.keys(session.files)) {
        if (filePath.startsWith('/bin/') || filePath.startsWith('/usr/bin/')) {
            const cmd = filePath.split('/').pop();
            if (cmd) cmds.add(cmd);
        }
    }

    return Array.from(cmds).filter(c => c.startsWith(prefix));
}

function normalizePathForAutocomplete(input: string, cwd: string): { dir: string; partial: string } {
    let fullPath: string;

    if (input.startsWith('/')) {
        fullPath = input;
    } else {
        fullPath = cwd + '/' + input;
    }

    fullPath = fullPath.replace(/\/+/g, '/');

    const lastSlash = fullPath.lastIndexOf('/');
    const dir = lastSlash === -1 ? cwd : (lastSlash === 0 ? '/' : fullPath.substring(0, lastSlash));
    const partial = fullPath.substring(lastSlash + 1);
    return { dir, partial };
}

function listDirEntries(files: Record<string, FileMetadata>, dir: string): string[] {
    const prefix = dir.endsWith('/') ? dir : dir + '/';
    const entries = new Set<string>();

    for (const filePath of Object.keys(files)) {
        if (filePath.startsWith(prefix)) {
            const remainder = filePath.slice(prefix.length);
            const firstSegment = remainder.split('/')[0];
            if (firstSegment) entries.add(firstSegment);
        }
    }

    return Array.from(entries);
}

function suggestFiles(prefix: string, session: EmulatorContext, accountName: string): string[] {
    const cwd = session.cwd[accountName] || session.default_cwd;
    const { dir, partial } = normalizePathForAutocomplete(prefix, cwd);

    const entries = listDirEntries(session.files, dir);
    const matches = entries.filter(name => name.startsWith(partial));

    const userPrefix = prefix.substring(0, prefix.lastIndexOf('/') + 1);
    return matches.map(m => {
        let fullPath = dir === '/' ? `/${m}` : `${dir}/${m}`;
        fullPath = fullPath.replace(/\/+/g, '/');
        const isDir = session.files[fullPath]?.type === 'directory';
        return userPrefix + m + (isDir ? '/' : '');
    });
}
