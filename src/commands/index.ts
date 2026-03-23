import { CommandFn, LocalExecCommandFn } from '../types';
import { help } from './help';
import { echoCmd as echo } from './echo';
import { ls } from './ls';
import { pwd } from './pwd';
import { cd } from './cd';
import { clear } from './clear';
import { touch } from './touch';
import { mkdir } from './mkdir';
import { cat } from './cat';
import { history } from './history';
import { code } from './code';
// import { grep } from './grep';

import { rm } from './rm';
import { cp } from './cp';
import { mv } from './mv';
import { head } from './head';
import { tail } from './tail';
import { envCmd as env } from './env';
import { exportCmd } from './export';
import { unset } from './unset';
import { ps } from './ps';
import { kill } from './kill';
import { whoami } from './whoami';
import { dateCmd as date } from './date';
import { chmod } from './chmod';
import { chown } from './chown';
import { groups } from './groups';
import { curl } from './curl';
import { readFile } from './readFile';
import { writeFile } from './writeFile';
import { appendToFile } from './appendToFile';
import { sudo } from './sudo';
import { kubectl } from './bin/kubectl';

import { gitCmd } from './git';

export const emulatedCommands: Record<string, CommandFn> = {
    help,
    echo,
    ls,
    pwd,
    cd,
    clear,
    touch,
    mkdir,
    cat,
    history,
    code,
    // grep,
    rm,
    cp,
    mv,
    head,
    tail,
    env,
    export: exportCmd,
    unset,
    ps,
    kill,
    whoami,
    date,
    chmod,
    chown,
    groups,
    curl,
    readFile,
    writeFile,
    appendToFile,
    sudo,
    git: gitCmd,
};

export const localExecCommands: Record<string, LocalExecCommandFn> = {
    kubectl,
};

export const readOnlyCommands: Record<string, string> = {
    help: 'help',
    ls: 'ls',
    pwd: 'pwd',
    cd: 'cd',
    clear: 'clear',
    echo: 'echo',
    cat: 'cat',
    history: 'history',
    env: 'env',
    whoami: 'whoami',
    date: 'date',
    ps: 'ps',
    head: 'head',
    tail: 'tail',
    groups: 'groups',
    readFile: 'readFile',
    grep: 'grep',
};

export const writeCommands: Record<string, string> = {
    mkdir: 'mkdir',
    touch: 'touch',
    writeFile: 'writeFile',
    appendToFile: 'appendToFile',
    rm: 'rm',

    cp: 'cp',
    mv: 'mv',
    export: 'export',
    unset: 'unset',
    kill: 'kill',
    chmod: 'chmod',
    chown: 'chown',
    curl: 'curl',
    kubectl: 'kubectl',
    git: 'git',
    sudo: 'sudo',
    code: 'code',

};
