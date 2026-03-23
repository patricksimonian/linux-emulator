import { CommandOutput, EmulatorContext, EngineConfig, CommandFn, LocalExecCommandFn } from '../types';
import { expandVariables } from './expandVariables';
import { processRawInput } from './processRawInput';
import { emulatedCommands, localExecCommands, readOnlyCommands, writeCommands } from '../commands';
import { readFile } from '../commands/readFile';
import { appendToFile } from '../commands/appendToFile';
import { writeFile } from '../commands/writeFile';
import { handleRedirections } from './handleRedirections';
import { stripAnsiCodes } from './stripAnsi';
import { createSnapshot } from './snapshot';
import { isToolSupported } from '../commands/bin';
import { resetHistoricalIndex } from './navigateToHistoricalCommand';
import { resolveVirtualCommand } from './resolveVirtualCommand';
import { minimatch } from 'minimatch';
import path from 'path';

export const ENV_VAR_REGEX = /([a-zA-Z_0-9]+)=([^ ]+)/g;

function wrapLocalExec(fn: LocalExecCommandFn): CommandFn {
    return (raw, command, args, context, accountName, env, stdin, callbacks) =>
        fn(raw, command, args, context, accountName ?? '', env, stdin, callbacks);
}

export const handleExecution = async (
    input: string,
    command: string,
    args: string[],
    currentContext: EmulatorContext,
    userId: string,
    env: Record<string, string>,
    stdinOverride?: string,
    options?: EngineConfig
): Promise<CommandOutput> => {
    let containsWriteAction = false;
    const processedInput = processRawInput(input);

    let commandString = processedInput.replace(/^(\s*)/, '');
    const matches: RegExpMatchArray[] = [];
    const prefixRegex = /^([a-zA-Z_0-9]+)=([^ ]+)\s*/;

    while (true) {
        const match = commandString.match(prefixRegex);
        if (match) {
            matches.push(match);
            commandString = commandString.substring(match[0].length);
        } else {
            break;
        }
    }

    const updatedEnv: Record<string, string> = { ...currentContext.env, ...env };

    for (const match of matches) {
        updatedEnv[match[1]] = match[2];
    }

    // If the input was exclusively variable assignments (e.g. "foo=bar"), persist them natively
    if (!commandString.trim() && matches.length > 0) {
        for (const match of matches) {
            currentContext.env[match[1]] = match[2];
        }
        return { stdout: '', code: 0 };
    }

    const commands = commandString.trim().split('|');

    let previousCommandOutput: string | undefined = stdinOverride;
    let previousCommandAction: CommandOutput['clientAction'] | undefined;
    let accumulatedStderr = '';
    let lastCode = 0;

    for (const commandStr of commands) {
        const {
            command: parsedCommand,
            stdinFile,
            stdoutFile,
            stderrFile,
            appendStdout,
            appendStderr,
        } = handleRedirections(commandStr);

        const expandedCommand = expandVariables(parsedCommand, updatedEnv);
        const [commandName, ...rawArgs] = expandedCommand.trim().split(/\s+/);

        if (!commandName) continue;

        // Glob expansion
        const expandedArgs: string[] = [];
        const cwd = currentContext.cwd[userId] || '/';
        const allPaths = Object.keys(currentContext.files).map(p => path.relative(cwd, p));

        for (const arg of rawArgs) {
            if (/[*?[]/.test(arg)) {
                const globMatches = minimatch.match(allPaths, arg, { dot: false });
                expandedArgs.push(...(globMatches.length > 0 ? globMatches : [arg]));
            } else {
                expandedArgs.push(arg);
            }
        }

        // Readonly guard
        if (currentContext.state !== 'ready' && !readOnlyCommands[commandName]) {
            return { stderr: 'session is in readonly mode\n', code: 1, stdout: '' };
        }

        containsWriteAction = !!writeCommands[commandName];

        // Stdin from file
        let stdinForCommand: string | undefined = previousCommandOutput;
        if (stdinFile) {
            const res = await readFile('', '', [stdinFile], currentContext, userId, updatedEnv);
            if (res.code !== 0) {
                accumulatedStderr += res.stderr;
                lastCode = 1;
                continue;
            }
            stdinForCommand = res.stdout;
        }

        // Reject shell-exec patterns
        if (commandName.startsWith('./') || commandName.endsWith('.sh')) {
            accumulatedStderr += `bash: ${commandName}: Program execution is currently not supported\n`;
            lastCode = 126;
            continue;
        }

        // Resolve command handler
        const emulatedHandler: CommandFn | undefined = emulatedCommands[commandName];
        const localHandler: CommandFn | undefined = localExecCommands[commandName]
            ? wrapLocalExec(localExecCommands[commandName])
            : undefined;

        let commandHandler: CommandFn | undefined =
            emulatedHandler ?? localHandler;

        // Virtual /bin command resolution (opt-in)
        if (!commandHandler && options?.allowVirtualBinCommands) {
            commandHandler = resolveVirtualCommand(commandName, currentContext, userId) ?? undefined;
        }

        if (!commandHandler) {
            accumulatedStderr += `Command not found: ${commandName}\n`;
            lastCode = 127;
            continue;
        }

        const commandResult: CommandOutput = await commandHandler(
            commandStr,
            commandName,
            expandedArgs,
            currentContext,
            userId,
            updatedEnv,
            stdinForCommand,
        );

        // History
        if (!currentContext.history[userId]) {
            currentContext.history[userId] = [];
        }
        currentContext.history[userId].push({
            stdout: commandResult.stdout.substring(0, 255),
            stderr: commandResult.stderr || '',
            code: commandResult.code,
            command: commandName,
            userId,
            env: updatedEnv,
            args: expandedArgs,
            raw: commandStr.trim(),
        });

        lastCode = commandResult.code;

        // Stderr redirection
        if (stderrFile) {
            if (commandResult.stderr && (!stdoutFile || stdoutFile !== stderrFile)) {
                const fn = appendStderr ? appendToFile : writeFile;
                await fn('', '', [stderrFile, stripAnsiCodes(commandResult.stderr)], currentContext, userId, updatedEnv);
                containsWriteAction = true;
                commandResult.stderr = '';
            }
        } else if (commandResult.stderr) {
            accumulatedStderr += commandResult.stderr;
        }

        // Stdout redirection
        if (stdoutFile) {
            const contentToWrite = stripAnsiCodes(commandResult.stdout);
            const fn = appendStdout ? appendToFile : writeFile;
            await fn('', '', [stdoutFile, contentToWrite], currentContext, userId, updatedEnv);
            containsWriteAction = true;
            commandResult.stdout = '';
        }

        // Stderr to same file as stdout
        if (stderrFile && stderrFile === stdoutFile && commandResult.stderr) {
            await appendToFile('', '', [stderrFile, stripAnsiCodes(commandResult.stderr)], currentContext, userId, updatedEnv);
            containsWriteAction = true;
            commandResult.stderr = '';
        }

        previousCommandOutput = commandResult.stdout;
        previousCommandAction = commandResult.clientAction;
    }

    // Initialize h_index if needed
    if (!currentContext.h_index) {
        currentContext.h_index = { [userId]: -1 };
    }
    if (!currentContext.history[userId]) {
        currentContext.history[userId] = [];
    }

    if (userId in currentContext.h_index) {
        resetHistoricalIndex(currentContext, userId);
    }

    if (containsWriteAction) {
        const snapshot = createSnapshot(currentContext);
        currentContext._sessionTimeline.push(snapshot);
    }

    return { stdout: previousCommandOutput ?? '', stderr: accumulatedStderr, code: lastCode, clientAction: previousCommandAction };
};
