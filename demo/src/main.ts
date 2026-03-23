import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import type { EmulatorContext, FileMetadata } from '../../src/types';
import { handleExecution } from '../../src/index';
import { getCompletions } from '../../src/core/getCompletions';

// ── Seed: initial virtual filesystem ──────────────────────────────────────────

const USER = 'user';

function makeDir(owner = USER, mode = 0o755): FileMetadata {
  return { type: 'directory', mode, owner, group: 'users', children: [] };
}
function makeFile(content: string, owner = USER, mode = 0o644): FileMetadata {
  return { type: 'file', mode, owner, group: 'users', content };
}

const files: Record<string, FileMetadata> = {
  '/': { ...makeDir('root', 0o755), children: ['home', 'etc', 'usr', 'tmp', 'var'] },
  '/home': { ...makeDir('root'), children: ['user'] },
  '/home/user': { ...makeDir(), children: ['projects', 'notes.txt', '.ssh', '.bashrc'] },
  '/home/user/projects': { ...makeDir(), children: ['demo.js', 'README.md'] },
  '/home/user/projects/demo.js': makeFile('console.log("Hello from kanda-linux-emulator!");\n'),
  '/home/user/projects/README.md': makeFile('# My Project\n\nA demo project in the virtual filesystem.\n'),
  '/home/user/notes.txt': makeFile('Welcome to kanda-linux-emulator!\n\nTry running: ls -la, cat notes.txt, mkdir, touch, etc.\n'),
  '/home/user/.ssh': { ...makeDir(USER, 0o700), children: ['id_rsa', 'id_rsa.pub'] },
  '/home/user/.ssh/id_rsa': makeFile('-----BEGIN RSA PRIVATE KEY-----\n(demo — not a real key)\n-----END RSA PRIVATE KEY-----\n', USER, 0o600),
  '/home/user/.ssh/id_rsa.pub': makeFile('ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAAB... user@demo\n'),
  '/home/user/.bashrc': makeFile('# .bashrc\nexport PATH="/usr/local/bin:$PATH"\nexport EDITOR=nano\n'),
  '/etc': { ...makeDir('root', 0o755), children: ['os-release', 'passwd', 'hosts', 'sudoers'] },
  '/etc/os-release': makeFile('NAME="Kanda Linux"\nVERSION="1.0"\nID=kanda\nPRETTY_NAME="Kanda Linux 1.0"\n', 'root'),
  '/etc/passwd': makeFile('root:x:0:0:root:/root:/bin/bash\nuser:x:1000:1000:Demo User:/home/user:/bin/bash\n', 'root'),
  '/etc/hosts': makeFile('127.0.0.1   localhost\n::1         localhost\n127.0.1.1   kanda.local\n', 'root'),
  '/etc/sudoers': makeFile('user ALL=(ALL) ALL\n', 'root', 0o440),
  '/usr': { ...makeDir('root'), children: ['local', 'bin'] },
  '/usr/bin': { ...makeDir('root'), children: ['env', 'grep'] },
  '/usr/bin/grep': makeFile(`(async (raw, command, args, context, account, env, stdin) => {
    if (args.length === 0) return { stderr: 'grep: missing pattern\\n', stdout: '', code: 1 };
    const patternArg = args.find(a => !a.startsWith('-')) || '';
    if (!patternArg) return { stderr: 'grep: missing pattern\\n', stdout: '', code: 1 };
    
    if (!stdin) return { stderr: 'grep: no input provided for demo sandbox\\n', stdout: '', code: 1 };
    
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
  '/var/log/syslog': makeFile('[demo] kanda-linux-emulator started\n', 'root', 0o644),
};

function buildContext(): EmulatorContext {
  return {
    sessionId: 'demo-session',
    env: {
      PATH: '/usr/local/bin:/usr/bin:/bin',
      HOME: '/home/user',
      USER,
      SHELL: '/bin/bash',
      TERM: 'xterm-256color',
      LANG: 'en_US.UTF-8',
    },
    default_cwd: '/home/user',
    cwd: { [USER]: '/home/user' },
    files: JSON.parse(JSON.stringify(files)), // deep clone for reset
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
    processes: [
      { pid: 1, name: 'init', command: '/sbin/init', user: 'root', startTime: new Date().toISOString(), cpuUsage: 0, memoryUsage: 4, status: 'sleeping', threads: 1 },
      { pid: 100, name: 'bash', command: '/bin/bash', user: USER, startTime: new Date().toISOString(), cpuUsage: 0.1, memoryUsage: 12, status: 'running', threads: 1 },
    ],
    metadata: {
      diskSpaceUsed: 0,
      totalFiles: Object.keys(files).length,
    },
    _sessionTimeline: [],
  };
}

// ── Terminal setup ─────────────────────────────────────────────────────────────

const term = new Terminal({
  theme: {
    background: '#090c10',
    foreground: '#e6edf3',
    cursor: '#58a6ff',
    cursorAccent: '#090c10',
    selectionBackground: 'rgba(88,166,255,0.25)',
    black: '#0d1117',
    brightBlack: '#6e7681',
    red: '#f85149',
    brightRed: '#ff7b72',
    green: '#56d364',
    brightGreen: '#3fb950',
    yellow: '#e3b341',
    brightYellow: '#d29922',
    blue: '#58a6ff',
    brightBlue: '#79c0ff',
    magenta: '#bc8cff',
    brightMagenta: '#d2a8ff',
    cyan: '#39c5cf',
    brightCyan: '#56d4dd',
    white: '#b1bac4',
    brightWhite: '#e6edf3',
  },
  fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", monospace',
  fontSize: 13,
  lineHeight: 1.5,
  letterSpacing: 0.3,
  cursorBlink: true,
  cursorStyle: 'bar',
  scrollback: 2000,
  allowProposedApi: true,
});

const fitAddon = new FitAddon();
term.loadAddon(fitAddon);
term.open(document.getElementById('terminal-container')!);
fitAddon.fit();
window.addEventListener('resize', () => fitAddon.fit());

// ── State ──────────────────────────────────────────────────────────────────────

let ctx = buildContext();
let inputBuffer = '';
let historyIndex = -1;

// Heredoc state machine
let isHeredoc = false;
let heredocTag = '';
let heredocCmd = '';
let heredocLines: string[] = [];

const PROMPT = () => {
  const cwd = ctx.cwd[USER] || '/home/user';
  const shortCwd = cwd === `/home/${USER}` ? '~' : cwd.replace(`/home/${USER}`, '~');
  return `\x1b[32m${USER}@kanda\x1b[0m:\x1b[34m${shortCwd}\x1b[0m$ `;
};

function printPrompt() {
  term.write(isHeredoc ? '> ' : PROMPT());
  if (!isHeredoc) {
    updateStatusBar();
    updateFsTree();
  }
}

function updateStatusBar() {
  const cwd = ctx.cwd[USER] || '/home/user';
  (document.getElementById('status-cwd') as HTMLElement).textContent = cwd;
}

function updateStatusCode(code: number) {
  const el = document.getElementById('status-code') as HTMLElement;
  el.textContent = String(code);
  el.style.color = code === 0 ? '#3fb950' : '#f85149';
}

// ── Filesystem tree sidebar ────────────────────────────────────────────────────

function buildFsTree(): string {
  const lines: string[] = [];
  function walk(dirPath: string, prefix: string, depth: number) {
    if (depth > 3) return;
    const entry = ctx.files[dirPath];
    if (!entry || entry.type !== 'directory') return;
    const children = entry.children ?? [];
    children.forEach((name: string, i: number) => {
      const isLast = i === children.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPath = dirPath === '/' ? `/${name}` : `${dirPath}/${name}`;
      const child = ctx.files[childPath];
      if (!child) return;
      const isDir = child.type === 'directory';
      const isExec = !isDir && (child.mode & 0o111) !== 0;
      const cls = isDir ? 'dir' : isExec ? 'exec' : 'file';
      const suffix = isDir ? '/' : '';
      lines.push(`<span>${prefix}${connector}</span><span class="${cls}">${name}${suffix}</span>`);
      if (isDir && depth < 2) {
        walk(childPath, prefix + (isLast ? '    ' : '│   '), depth + 1);
      }
    });
  }
  lines.push('<span class="dir">/</span>');
  walk('/', '', 0);
  return lines.join('\n');
}

function updateFsTree() {
  const el = document.getElementById('fs-tree');
  if (el) el.innerHTML = buildFsTree();
}

// ── Input handling ─────────────────────────────────────────────────────────────

async function runCommand(raw: string, overrideStdin?: string) {
  const trimmed = raw.trim();
  if (!trimmed) { printPrompt(); return; }

  historyIndex = -1;

  const parts = trimmed.split(/\s+/);
  const command = parts[0];
  const args = parts.slice(1);

  try {
    const result = await handleExecution(
      trimmed,
      command,
      args,
      ctx,
      USER,
      ctx.env,
      overrideStdin,
      { allowVirtualBinCommands: true }
    );

    if (result.stdout) {
      term.write(result.stdout.replace(/\n/g, '\r\n'));
    }
    if (result.stderr) {
      term.write('\x1b[31m' + result.stderr.replace(/\n/g, '\r\n') + '\x1b[0m');
    }

    updateStatusCode(result.code);
  } catch (err) {
    term.write(`\r\n\x1b[31mError: ${(err as Error).message}\x1b[0m`);
    updateStatusCode(1);
  }

  printPrompt();
}

// Prevent xterm.js from inserting a hard tab character when hitting Tab for autocomplete
term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    if (e.type === 'keydown') {
      const state = getCompletions(inputBuffer, ctx, USER);
      const matches = state.completions;
      if (matches.length === 1) {
        const completion = matches[0];
        const newCmd = (state.suffix ? state.suffix + ' ' : '') + completion;
        term.write('\b \b'.repeat(inputBuffer.length));
        inputBuffer = newCmd;
        term.write(newCmd);
      } else if (matches.length > 1) {
        term.write('\r\n' + matches.join('  ') + '\r\n');
        printPrompt();
        term.write(inputBuffer);
      }
    }
    return false; // Swallow the Tab key event
  }
  return true;
});

term.onKey(({ key, domEvent }) => {
  const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;
  const history = ctx.history[USER] ?? [];

  if (domEvent.key === 'Enter') {
    term.write('\r\n');
    const cmd = inputBuffer;
    inputBuffer = '';

    if (isHeredoc) {
      if (cmd === heredocTag) {
        isHeredoc = false;
        const finalCmd = heredocCmd;
        const finalStdin = heredocLines.join('\n');
        heredocLines = [];
        runCommand(finalCmd, finalStdin);
      } else {
        heredocLines.push(cmd);
        printPrompt();
      }
      return;
    }

    const heredocMatch = cmd.match(/<<\s*([A-Za-z0-9_]+)/);
    if (heredocMatch) {
      isHeredoc = true;
      heredocTag = heredocMatch[1];
      heredocCmd = cmd.replace(heredocMatch[0], ''); 
      heredocLines = [];
      printPrompt();
      return;
    }

    runCommand(cmd);
  } else if (domEvent.key === 'Tab') {
    // Intercepted natively by attachCustomKeyEventHandler
    return;
  } else if (domEvent.key === 'Backspace') {
    if (inputBuffer.length > 0) {
      inputBuffer = inputBuffer.slice(0, -1);
      term.write('\b \b');
    }
  } else if (domEvent.key === 'ArrowUp') {
    // Prevent default scroll behavior
    domEvent.preventDefault();
    if (history.length === 0) return;
    if (historyIndex < history.length - 1) historyIndex++;
    const entry = history[history.length - 1 - historyIndex];
    const cmd = entry ? (entry.raw || `${entry.command} ${entry.args.join(' ')}`.trim()) : '';
    // Clear current input
    term.write('\b \b'.repeat(inputBuffer.length));
    inputBuffer = cmd;
    term.write(cmd);
  } else if (domEvent.key === 'ArrowDown') {
    // Prevent default scroll behavior
    domEvent.preventDefault();
    if (historyIndex > 0) {
      historyIndex--;
      const entry = history[history.length - 1 - historyIndex];
      const cmd = entry ? (entry.raw || `${entry.command} ${entry.args.join(' ')}`.trim()) : '';
      term.write('\b \b'.repeat(inputBuffer.length));
      inputBuffer = cmd;
      term.write(cmd);
    } else {
      historyIndex = -1;
      term.write('\b \b'.repeat(inputBuffer.length));
      inputBuffer = '';
    }
  } else if (domEvent.ctrlKey && domEvent.key === 'l') {
    term.clear();
    printPrompt();
  } else if (domEvent.ctrlKey && domEvent.key === 'c') {
    term.write('^C');
    inputBuffer = '';
    printPrompt();
  } else if (printable) {
    inputBuffer += key;
    term.write(key);
  }
});

// ── Quick command chips ────────────────────────────────────────────────────────

document.querySelectorAll<HTMLButtonElement>('.cmd-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    const cmd = btn.dataset.cmd ?? '';
    // Clear current input then replay the chip command
    term.write('\b \b'.repeat(inputBuffer.length));
    inputBuffer = '';
    term.write(cmd);
    term.write('\r\n');
    inputBuffer = '';
    runCommand(cmd);
  });
});

// ── Reset ──────────────────────────────────────────────────────────────────────

function reset() {
  ctx = buildContext();
  term.clear();
  inputBuffer = '';
  historyIndex = -1;
  boot();
}

document.getElementById('reset-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  reset();
});

document.getElementById('clear-btn')?.addEventListener('click', () => {
  term.clear();
  printPrompt();
});

// ── Boot sequence ──────────────────────────────────────────────────────────────

function boot() {
  term.writeln('\x1b[1;34m╔══════════════════════════════════════════════════════╗\x1b[0m');
  term.writeln('\x1b[1;34m║\x1b[0m   \x1b[1mkanda-linux-emulator\x1b[0m  \x1b[32minteractive demo\x1b[0m             \x1b[1;34m║\x1b[0m');
  term.writeln('\x1b[1;34m║\x1b[0m   A virtual Linux filesystem running in the browser  \x1b[1;34m║\x1b[0m');
  term.writeln('\x1b[1;34m╚══════════════════════════════════════════════════════╝\x1b[0m');
  term.writeln('');
  term.writeln('  Type \x1b[33mhelp\x1b[0m for available commands, or click a chip in the sidebar.');
  term.writeln('  Try \x1b[33mls\x1b[0m, \x1b[33mcat /home/user/notes.txt\x1b[0m, \x1b[33mmkdir\x1b[0m, \x1b[33mchmod\x1b[0m, and more.');
  printPrompt();
  updateFsTree();
  term.focus();
}

boot();
