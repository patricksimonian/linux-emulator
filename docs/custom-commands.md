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

## Registering the Custom Command

To bind your new helper into the live execution engine, simply register it within the central dictionary. Since the core commands logic utilizes `emulatedCommands` directly, you can map it dynamically at load time!

```typescript
import { emulatedCommands } from 'linux-emulator';

// Simply map the execution engine key
emulatedCommands['mycommand'] = myCustomCommand;

// Usage:
// user@kanda:~$ mycommand arg1 arg2
// Success
```
