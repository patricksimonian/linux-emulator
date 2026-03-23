# Linux Emulator

This is a standalone Linux emulator inspired by the backend that powered the kanda learning tool I built. I took the core logic and extracted it into a standalone package that can be used by other projects. The core purpose of the emulator is to provide a way for users to interact with a linux like environment to learn and work with linux commands and tools. 

It supports a series of built-in commands, a virtual file system, and the ability to run real binaries in a sandbox.

# Running the Demo

1. Navigate to ./demo
2. Run `npm install`
3. Run `npm run dev`
4. Open the browser to `http://localhost:5173/`

## Custom Commands

To add a custom command, you can add it to the `emulatedCommands` object in `src/commands/index.ts`.

```typescript
import { CommandFn } from '../types';

export const myCustomCommand: CommandFn = async (
    raw,
    command,
    args,
    context,
    accountName,
    env,
    stdin,
    callbacks
) => {
    // Your custom logic here
    return {
        stdout: 'Hello from custom command!\n',
        code: 0
    };
};
```

## Custom 'Virtual' Binaries

The linux emulator supports running binaries in a npm 'vm' sandbox. You can add your binaries as an implemention of the commandFn interface within an emulated filesystem in the /usr/bin directory. For example, you can add a binary like '/usr/bin/grep' with the following contents..

```typescript
// /usr/bin/grep

(async (raw, command, args, context, account, env, stdin) => {
    if (args.length === 0) return { stderr: 'grep: missing pattern\n', stdout: '', code: 1 };
    const patternArg = args.find(a => !a.startsWith('-')) || '';
    if (!patternArg) return { stderr: 'grep: missing pattern\n', stdout: '', code: 1 };
    
    if (!stdin) return { stderr: 'grep: no input provided for demo sandbox\n', stdout: '', code: 1 };
    
    let output = '';
    let matchFound = false;
    const lines = stdin.split('\n');
    for (const line of lines) {
        if (line.includes(patternArg)) {
            output += line + '\n';
            matchFound = true;
        }
    }
    return { stdout: output, code: matchFound ? 0 : 1 };
})

```
Check out the demo at ./demo to see it in action! Try editing the contents of the file within the demo to see how you can change execution. Please note that since the implemention is typescript, you must write valid typescript. There is very rudimentary error handling in place at this stage for custom virtual binaries.
