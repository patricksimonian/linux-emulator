import { handleExecution } from '../src/core/handleExecution';
import { EmulatorContext, FileMetadata } from '../src/types';

describe('Linux Emulator Functional Tests', () => {
    let ctx: EmulatorContext;
    const USER = 'user';

    beforeEach(() => {
        function makeDir(owner = USER, mode = 0o755): FileMetadata {
            return { type: 'directory', mode, owner, group: 'users', children: [] };
        }
        function makeFile(content: string, owner = USER, mode = 0o644): FileMetadata {
            return { type: 'file', mode, owner, group: 'users', content };
        }

        const files: Record<string, FileMetadata> = {
            '/': { ...makeDir('root', 0o755), children: ['home', 'etc', 'usr', 'tmp', 'var'] },
            '/home': { ...makeDir('root'), children: ['user'] },
            '/home/user': { ...makeDir(), children: [] },
            '/etc': { ...makeDir('root', 0o755), children: ['passwd', 'sudoers'] },
            '/etc/passwd': { type: 'file', mode: 0o644, owner: 'root', group: 'root', content: 'root:x:0:0:root:/root:/bin/bash\nuser:x:1000:1000:Demo User:/home/user:/bin/bash\n' },
            '/etc/sudoers': { type: 'file', mode: 0o440, owner: 'root', group: 'root', content: 'user ALL=(ALL) ALL\n' },
            '/usr': { ...makeDir('root'), children: ['local', 'bin'] },
            '/usr/bin': { ...makeDir('root'), children: ['env', 'grep', 'sudo', 'mkdir'] },
            '/usr/bin/grep': makeFile(`(async (raw, command, args, context, account, env, stdin) => {
                const patternArg = args.find(a => !a.startsWith('-')) || '';
                if (!patternArg) return { stderr: 'grep: missing pattern\\n', stdout: '', code: 1 };
                
                if (!stdin) return { stderr: 'grep: no input provided\\n', stdout: '', code: 1 };
                
                let output = '';
                let matchFound = false;
                const lines = stdin.split('\\n');
                for (const line of lines) {
                    if (line.includes(patternArg)) {
                        output += line + '\\n';
                        matchFound = true;
                    }
                }
                return { stdout: output, code: matchFound ? 0 : 1 };
            })`, 'root', 0o755),
            '/usr/local': { ...makeDir('root'), children: ['bin'] },
            '/usr/local/bin': { ...makeDir('root'), children: [] },
            '/tmp': { ...makeDir('root', 0o1777), children: [] },
            '/var': { ...makeDir('root'), children: ['log'] },
            '/var/log': { ...makeDir('root'), children: ['syslog'] },
        };

        ctx = {
            sessionId: 'test-session',
            env: {
                PATH: '/usr/local/bin:/usr/bin:/bin',
                HOME: '/home/user',
                USER,
                SHELL: '/bin/bash',
            },
            default_cwd: '/home/user',
            cwd: { [USER]: '/home/user' },
            files: JSON.parse(JSON.stringify(files)),
            participants: [{
                id: '1',
                account_name: USER,
                tag: 'user',
                role: 'member',
                permissions: { read: ['*'], write: ['*'], execute: ['*'] },
                groups: ['users'],
                uid: 1000,
                gid: 1000,
            }],
            history: { [USER]: [] },
            h_index: { [USER]: -1 },
            state: 'ready',
            processes: [],
            metadata: {},
            _sessionTimeline: [],
        };
    });

    const exec = async (cmd: string, user = USER) => {
        return handleExecution(
            cmd,
            cmd.split(' ')[0],
            cmd.split(' ').slice(1),
            ctx,
            user,
            ctx.env,
            undefined,
            { allowVirtualBinCommands: true }
        );
    };

    describe('Pipes and Redirections', () => {
        it('handles basic file writes and appends (>, >>)', async () => {
            let res = await exec('echo "hello world" > test.txt');
            expect(res.code).toBe(0);
            expect(ctx.files['/home/user/test.txt'].content).toBe('hello world\n');

            res = await exec('echo "append this" >> test.txt');
            expect(res.code).toBe(0);
            expect(ctx.files['/home/user/test.txt'].content).toBe('hello world\nappend this\n');
        });

        it('handles input redirection (<)', async () => {
            await exec('echo "hello world" > input.txt');
            const res = await exec('cat < input.txt');
            expect(res.code).toBe(0);
            expect(res.stdout).toBe('hello world\n');
        });

        it('handles piping (|) to grep', async () => {
            ctx.files['/home/user/text.txt'] = { type: 'file', mode: 0o644, owner: USER, group: 'users', content: 'line1\nhello there\nline3\n' };
            const res = await exec('cat text.txt | grep hello');
            expect(res.code).toBe(0);
            expect(res.stdout).toBe('hello there\n');
        });
    });

    describe('Environment Variables', () => {
        it('expands variables safely (${VAR})', async () => {
            await exec('export FOO=bar');
            const res = await exec('echo ${FOO}baz');
            expect(res.code).toBe(0);
            expect(res.stdout).toBe('barbaz\n');
        });

        it('allows inline environment variable overrides', async () => {
             const res = await exec('FOO=override env');
             expect(res.code).toBe(0);
             expect(res.stdout).toContain('FOO=override');
        });
    });

    describe('Directory Creation and Collision', () => {
        it('fails to mkdir if directory already exists', async () => {
            const res = await exec('mkdir /tmp/existing_dir');
            expect(res.code).toBe(0);
            
            const res2 = await exec('mkdir /tmp/existing_dir');
            expect(res2.code).not.toBe(0);
            expect(res2.stderr).toContain('File exists');
        });

        it('fails to mkdir if file already exists in path', async () => {
            await exec('touch /tmp/existing_file');
            
            const res = await exec('mkdir /tmp/existing_file');
            expect(res.code).not.toBe(0);
            expect(res.stderr).toContain('File exists');
        });
    });

    describe('File Permissions', () => {
        it('reads a file when permissions allow', async () => {
             const res = await exec('cat /etc/passwd');
             expect(res.code).toBe(0);
        });

        it('denies reading a file restricting others', async () => {
            // Sudoers is 0o440 and root:root. We are 'user' so we should be denied.
             const res = await exec('cat /etc/sudoers');
             expect(res.code).not.toBe(0);
             expect(res.stderr).toContain('Permission denied');
        });
        
        it('denies executing a script without +x', async () => {
             await exec('echo "echo hello" > script.sh');
             const res = await exec('./script.sh');
             expect(res.code).not.toBe(0);
             expect(res.stderr).toContain('Program execution is currently not supported');
        });
    });

    describe('Sudo commands', () => {
        it('escalates privileges and runs whoami as root', async () => {
            const res = await exec('sudo whoami');
            expect(res.code).toBe(0);
            expect(res.stdout).toBe('root\n');
        });

        it('escalates privileges to read restricted files', async () => {
             const res = await exec('sudo cat /etc/sudoers');
             expect(res.code).toBe(0);
             expect(res.stdout).toContain('user ALL=(ALL) ALL');
        });
    });
});
