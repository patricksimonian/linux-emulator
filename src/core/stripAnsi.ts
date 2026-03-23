export const stripAnsiCodes = (str: string): string =>
    str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
