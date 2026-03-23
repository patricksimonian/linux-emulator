# Custom Commands in Linux Emulator

The `linux-emulator` package provides an expandable architecture that lets you inject totally bespoke logic right into the virtual sandbox execution pipeline! By defining your own `CommandFn`, you can expose powerful abstractions, interact with network requests or databases, and read/write to the virtual filesystem, all from within the emulated terminal workflow.

## The `CommandFn` Interface

A custom command is simply an async function that conforms to the `CommandFn` signature and returns a `Promise<CommandOutput>`:

```typescript
import type { CommandFn, CommandOutput } from 'linux-emulator';

export const myCustomCommand: CommandFn = async (
    raw,          // The literal raw unparsed argument string snippet
    command,      // The parsed name of the command
    args,         // The string arguments, post-variable expansion
    context,      // The active Sandbox Emulator Context (Virtual FS, Process Table, Env, etc)
    accountName,  // The ID of the user invoking the script
    env,          // A materialized dictionary of the active environment variables
    stdin         // Raw string standard input, if any data was piped into this command
): Promise<CommandOutput> => {
    // ... custom logic ...
    return {
        stdout: 'Success\\n',
        code: 0
    };
};
```

## Example: Building a Custom `grep` Utility

Because the pipeline routes `stdin` to your functions seamlessly, custom utilities make fantastic pipe destinations! Below is an example implementation of the common `grep` tool. Feel free to inject this into your frontend demo code.

```typescript
import { CommandFn, resolvePath } from 'linux-emulator';

export const grep: CommandFn = async (raw, command, args, context, accountName, env, stdin) => {
    if (args.length === 0) {
        return { stderr: 'grep: missing pattern\\n', stdout: '', code: 1 };
    }
    
    // Simplistic breakdown: first raw argument is the target pattern, the rest are files to parse!
    const patternArg = args.find(a => !a.startsWith('-')) || '';
    const fileArgs = args.filter(a => a !== patternArg && !a.startsWith('-'));

    if (!patternArg) {
        return { stderr: 'grep: missing pattern\\n', stdout: '', code: 1 };
    }

    let output = '';
    let matchFound = false;

    // SCENARIO 1: We're running at the end of a pipeline! Consume STDIN to perform the search!
    if (fileArgs.length === 0) {
        if (!stdin) {
            // Emulators shouldn't hang open STDIN descriptors, fail fast!
            return { stderr: 'grep: no input provided\\n', stdout: '', code: 1 };
        }
        const lines = stdin.split('\\n');
        for (const line of lines) {
            if (line.includes(patternArg)) {
                output += line + '\\n';
                matchFound = true;
            }
        }
    } 
    // SCENARIO 2: Standalone command invocation! Read directly from the Virtual Filesystem!
    else {
        for (const file of fileArgs) {
            // Resolve the contextual directory the user is executing this command from!
            const filePath = resolvePath(context.cwd[accountName], file);
            
            // Check the internal virtual filesystem for matches
            const fileObj = context.files[filePath];
            if (!fileObj || fileObj.type === 'directory') {
                output += `grep: ${file}: No such file or directory\\n`;
                continue;
            }
            
            const lines = (fileObj.content || '').split('\\n');
            for (const line of lines) {
                if (line.includes(patternArg)) {
                    if (fileArgs.length > 1) {
                        output += `${file}:${line}\\n`;
                    } else {
                        output += `${line}\\n`;
                    }
                    matchFound = true;
                }
            }
        }
    }

    return { stdout: output, code: matchFound ? 0 : 1 };
};
```

## Registering the Custom Command

To bind your new helper into the live execution engine, simply register it within the central dictionary. Since the core commands logic utilizes `emulatedCommands` directly, you can map it dynamically at load time!

```typescript
import { emulatedCommands } from 'linux-emulator';

// Simply map the execution engine key
emulatedCommands['grep'] = grep;

// Usage:
// user@kanda:~$ echo "Secret Codes: XYZ" > data.txt
// user@kanda:~$ cat data.txt | grep Secret
// Secret Codes: XYZ
```
