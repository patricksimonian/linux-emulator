import git from 'isomorphic-git';
import { CommandFn, CommandOutput } from "../types";
import { GitFs } from "../utils/git_fs";
import { colors, color } from "../utils/colors";
import path from 'path';

export const gitCmd: CommandFn = async (
    raw,
    command,
    args,
    context,
    accountName,
    env,
    stdin,
    callbacks
): Promise<CommandOutput> => {
    if (args.length === 0) {
        return {
            stdout: "usage: git <command> [<args>]\n",
            code: 0
        };
    }

    const subCommand = args[0];
    const subArgs = args.slice(1);
    const fs = new GitFs(context, accountName!);
    const cwd = context.cwd[accountName!] || '/';
    let dir = cwd;

    const onProgress = (p: any) => {
        if (callbacks?.onProgress) {
            const progressStr = `[${p.phase}] ${Math.round((p.loaded / (p.total || 1)) * 100)}% (${p.loaded}/${p.total || '?'})`;
            callbacks.onProgress(progressStr);
        }
    };

    const participant = context.participants.find(p => p.account_name === accountName);
    const author = {
        name: participant?.account_name || 'Kanda User',
        email: participant ? `${participant.account_name}#${participant.tag}@kanda.sh` : 'user@kanda.ai'
    };

    // Commands that don't need an existing repo or establish one
    const noRepoNeeded = ['init', 'clone', 'version', 'help'];

    try {
        if (!noRepoNeeded.includes(subCommand)) {
            try {
                // Find the root of the git repository starting from CWD
                dir = await git.findRoot({ fs, filepath: cwd });
            } catch (e: any) {
                if (e.code === 'NotFoundError') {
                    return { stderr: `fatal: not a git repository (or any of the parent directories): .git\n`, code: 128, stdout: '' };
                }
                throw e;
            }
        }

        switch (subCommand) {
            case 'init': {
                const gitDir = path.join(cwd, '.git');
                await fs.mkdir(gitDir);

                await git.init({ fs, dir: cwd, defaultBranch: 'main' });
                return { stdout: `Initialized empty Git repository in ${cwd}\n`, code: 0 };
            }
            case 'status': {
                const matrix = await git.statusMatrix({ fs, dir });

                const untracked: string[] = [];
                const modifiedNotStaged: string[] = [];
                const staged: string[] = [];
                const deleted: string[] = [];

                matrix.forEach(row => {
                    const [file, head, workdir, stage] = row as [string, number, number, number];
                    if (head === 0 && workdir === 2 && stage === 0) {
                        untracked.push(file);
                    } else if (head === 0 && stage === 2) {
                        staged.push(`new file:   ${file}`);
                    } else if (head === 1 && workdir === 2 && stage === 1) {
                        modifiedNotStaged.push(`modified:   ${file}`);
                    } else if (head === 1 && stage === 2) {
                        staged.push(`modified:   ${file}`);
                    } else if (head === 1 && workdir === 0) {
                        deleted.push(`deleted:    ${file}`);
                    }
                });

                const currentBranch = await git.currentBranch({ fs, dir }) || 'HEAD';
                let output = `On branch ${currentBranch}\n`;

                let clean = true;

                if (staged.length > 0) {
                    clean = false;
                    output += `Changes to be committed:\n`;
                    output += `  (use "git restore --staged <file>..." to unstage)\n`;
                    staged.forEach(line => {
                        output += color(`\t${line}\n`, colors.fg.green);
                    });
                    output += '\n';
                }

                if (modifiedNotStaged.length > 0 || deleted.length > 0) {
                    clean = false;
                    output += `Changes not staged for commit:\n`;
                    output += `  (use "git add <file>..." to update what will be committed)\n`;
                    output += `  (use "git restore <file>..." to discard changes in working directory)\n`;
                    modifiedNotStaged.forEach(line => {
                        output += color(`\t${line}\n`, colors.fg.red);
                    });
                    deleted.forEach(line => {
                        output += color(`\t${line}\n`, colors.fg.red);
                    });
                    output += '\n';
                }

                if (untracked.length > 0) {
                    clean = false;
                    output += `Untracked files:\n`;
                    output += `  (use "git add <file>..." to include in what will be committed)\n`;
                    untracked.forEach(file => {
                        output += color(`\t${file}\n`, colors.fg.red);
                    });
                    output += '\n';
                }

                if (clean) {
                    output += 'nothing to commit, working tree clean\n';
                } else if (staged.length === 0 && (modifiedNotStaged.length > 0 || untracked.length > 0 || deleted.length > 0)) {
                    output += 'no changes added to commit (use "git add" and/or "git commit -a")\n';
                }

                return { stdout: output, code: 0 };
            }

            case 'add': {
                for (const arg of subArgs) {
                    const absoluteArgPath = path.resolve(cwd, arg);

                    let relativeToRoot = path.relative(dir, absoluteArgPath);
                    if (arg === '.') relativeToRoot = '.';

                    await git.add({ fs, dir, filepath: relativeToRoot });
                }
                return { stdout: '', code: 0 };
            }

            case 'commit': {
                const messageIndex = subArgs.indexOf('-m');
                const message = messageIndex !== -1 ? subArgs[messageIndex + 1] : 'Manual commit from emulated terminal';
                const sha = await git.commit({
                    fs,
                    dir,
                    message,
                    author
                });
                const currentBranch = await git.currentBranch({ fs, dir });
                const shortSha = sha.substring(0, 7);
                return { stdout: `[${currentBranch} ${shortSha}] ${message}\n`, code: 0 };
            }

            case 'branch': {
                const branches = await git.listBranches({ fs, dir });
                const currentBranch = await git.currentBranch({ fs, dir });
                const output = branches.map(b => {
                    if (b === currentBranch) {
                        return color(`* ${b}`, colors.fg.green);
                    }
                    return `  ${b}`;
                }).join('\n');
                return { stdout: output + '\n', code: 0 };
            }

            case 'log': {
                const commits = await git.log({ fs, dir, depth: 10 });
                const output = commits.map(c => {
                    const { commit } = c;
                    const dateStr = new Date(commit.author.timestamp * 1000).toString();
                    let logItem = color(`commit ${c.oid}`, colors.fg.yellow) + '\n';
                    logItem += `Author: ${commit.author.name} <${commit.author.email}>\n`;
                    logItem += `Date:   ${dateStr}\n\n`;
                    logItem += `    ${commit.message}\n`;
                    return logItem;
                }).join('\n');
                return { stdout: output, code: 0 };
            }

            case 'diff': {
                const matrix = await git.statusMatrix({ fs, dir });
                let output = '';
                for (const row of matrix) {
                    const [file, head, workdir] = row as [string, number, number, number];
                    if (head !== workdir) {
                        output += `${colors.fg.white}${colors.bright}diff --git a/${file} b/${file}${colors.reset}\n`;
                        output += `index 0000000..0000000\n`;
                        output += `--- a/${file}\n`;
                        output += `+++ b/${file}\n`;
                        output += `@@ -1 +1 @@\n`;
                        output += `(diff content not supported in virtual fs yet)\n`;
                    }
                }
                return { stdout: output, code: 0 };
            }

            case 'push':
            case 'restore':
            case 'stash':
            case 'rebase':
            case 'merge':
            case 'reflog':
            case 'remote':
            case 'checkout': {
                return { stdout: `git ${subCommand} is not yet implemented via isomorphic-git bridge\n`, code: 0 };
            }

            default:
                return { stderr: `git: '${subCommand}' is not a command. See 'git --help'.\n`, code: 1, stdout: '' };
        }
    } catch (e: any) {
        return { stderr: color(`fatal: ${e.message}\n`, colors.fg.red), code: 1, stdout: '' };
    }
};
