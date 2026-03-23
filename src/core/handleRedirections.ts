export interface RedirectionResult {
    command: string;
    stdinFile?: string;
    stdoutFile?: string;
    stderrFile?: string;
    appendStdout?: boolean;
    appendStderr?: boolean;
}

export const handleRedirections = (commandInput: string): RedirectionResult => {
    const result: RedirectionResult = { command: '' };

    const redirectRegex = /(\d+|&)?(>>|>|<)\s*([^\s]+)/g;

    let match;
    const redirections: { start: number, end: number }[] = [];

    while ((match = redirectRegex.exec(commandInput)) !== null) {
        const fullMatch = match[0];
        const fdOrAmp = match[1];
        const operator = match[2];
        const file = match[3];

        redirections.push({ start: match.index, end: match.index + fullMatch.length });

        if (operator === '<') {
            result.stdinFile = file;
        } else if (operator === '>' || operator === '>>') {
            const append = operator === '>>';

            if (fdOrAmp === '2') {
                result.stderrFile = file;
                result.appendStderr = append;
            } else if (fdOrAmp === '&') {
                result.stdoutFile = file;
                result.appendStdout = append;
                result.stderrFile = file;
                result.appendStderr = append;
            } else if (!fdOrAmp || fdOrAmp === '1') {
                result.stdoutFile = file;
                result.appendStdout = append;
            }
        }
    }

    let cleanCommand = '';
    let lastIndex = 0;

    for (const red of redirections) {
        cleanCommand += commandInput.substring(lastIndex, red.start);
        lastIndex = red.end;
    }
    cleanCommand += commandInput.substring(lastIndex);

    result.command = cleanCommand.trim();
    return result;
};
