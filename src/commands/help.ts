import { CommandFn } from '../types';

export const help: CommandFn = () => {
  return Promise.resolve({
    stdout: `
Available Commands:
  help         Show available commands
  echo <text>  Print text to the terminal
  ls [path]    List directory contents
  cd [path]    Change directory
  cat <file>   Print file contents
  pwd          Print working directory
  env          Print environment variables
  mkdir <dir>  Create directory
  rm [-rf] <path>  Remove file or directory
  touch <file> Create empty file
  cp <src> <dst>   Copy file or directory
  mv <src> <dst>   Move or rename
  chmod <mode> <file>  Change permissions
  chown <user> <file>  Change ownership
  head [-n N] <file>   Print first N lines
  tail [-n N] <file>   Print last N lines
  history      Show command history
  ps           List processes
  kill <pid>   Kill a process
  whoami       Print current user
  groups       Print user groups
  date         Print current date
  clear        Clear the terminal
  export [VAR=val]  Set environment variable
  unset <VAR>  Unset environment variable
  readFile <file>  Read file contents
  writeFile <file> [content]  Write to file
  sudo <cmd>   Execute command as superuser
  git          Git version control
  curl <url>   HTTP client
`, code: 0
  });
};
