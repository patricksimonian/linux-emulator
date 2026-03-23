import { CommandFn } from '../types';
import { resolvePath } from '../core/resolvePaths';
import { FileMetadata } from '../types';
import { checkQuota, updateUsage } from '../core/quotas';
import crypto from 'crypto';
import path from 'path';

const MAX_DOWNLOAD_SIZE = 5 * 1024 * 1024; // 5MB

export const curl: CommandFn = async (raw, command, args, context, accountName) => {
    if (args.length === 0) {
        return { stderr: "curl: try 'curl --help' for more information\n", stdout: '', code: 1 };
    }

    let url = '';
    let method = 'GET';
    const headers: Record<string, string> = {};
    let data: string | undefined;
    let outputFile: string | undefined;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '-X' || arg === '--request') { method = args[++i]; }
        else if (arg === '-H' || arg === '--header') {
            const header = args[++i];
            const colonIdx = header.indexOf(':');
            if (colonIdx > -1) {
                headers[header.slice(0, colonIdx).trim()] = header.slice(colonIdx + 1).trim();
            }
        }
        else if (arg === '-d' || arg === '--data') { data = args[++i]; method = 'POST'; }
        else if (arg === '-o' || arg === '--output') { outputFile = args[++i]; }
        else if (!arg.startsWith('-')) { url = arg; }
    }

    if (!url) {
        return { stderr: 'curl: no URL specified!\n', stdout: '', code: 1 };
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, { method, headers, body: data, signal: controller.signal });
        clearTimeout(timeoutId);

        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > MAX_DOWNLOAD_SIZE) {
            return { stderr: `curl: File too large (${contentLength} bytes). Limit is ${MAX_DOWNLOAD_SIZE} bytes.\n`, stdout: '', code: 1 };
        }

        const reader = response.body?.getReader();
        if (!reader) {
            return { stderr: 'curl: No response body\n', stdout: '', code: 0 };
        }

        let receivedLength = 0;
        const chunks: Uint8Array[] = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            receivedLength += value.length;
            if (receivedLength > MAX_DOWNLOAD_SIZE) {
                controller.abort();
                return { stderr: `curl: Download exceeded limit of ${MAX_DOWNLOAD_SIZE} bytes.\n`, stdout: '', code: 1 };
            }
            chunks.push(value);
        }

        const bodyBuffer = new Uint8Array(receivedLength);
        let position = 0;
        for (const chunk of chunks) { bodyBuffer.set(chunk, position); position += chunk.length; }
        const bodyText = new TextDecoder('utf-8').decode(bodyBuffer);

        if (outputFile) {
            try { checkQuota(context, bodyText.length, 1); }
            catch (e: unknown) { return { stderr: `curl: ${(e as Error).message}\n`, stdout: '', code: 1 }; }

            const filePath = resolvePath(context.cwd[accountName!], outputFile);
            const participant = context.participants.find(p => p.account_name === accountName);
            const userGroup = participant?.groups?.[0] || 'users';

            const newFile: FileMetadata = {
                type: 'file',
                id: crypto.randomUUID(),
                mode: 0o644,
                owner: accountName!,
                group: userGroup,
                content: bodyText,
                locked: undefined,
            };

            context.files[filePath] = newFile;
            const parent = context.files[path.dirname(filePath)];
            if (parent?.children && !parent.children.includes(path.basename(filePath))) {
                parent.children.push(path.basename(filePath));
                updateUsage(context, bodyText.length, 1);
            }
            return { stdout: '', code: 0 };
        } else {
            return { stdout: bodyText, code: 0 };
        }
    } catch (error: unknown) {
        return { stderr: `curl: (35) ${(error as Error).message}\n`, stdout: '', code: 1 };
    }
};
