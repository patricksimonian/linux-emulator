export const expandVariables = (command: string, env: Record<string, string>): string => {
    const regex = /'(.*?)'|"(.*?)"|(\S+)/g;

    return command.replace(regex, (match, singleQuoted, doubleQuoted, unquoted) => {
        if (singleQuoted !== undefined) {
            return singleQuoted;
        } else if (doubleQuoted !== undefined) {
            return doubleQuoted.replace(/\$(\w+)|\$\{(\w+)\}/g, (_: unknown, simpleVar: string | undefined, bracketedVar: string | undefined) => {
                const varName = simpleVar || bracketedVar;
                return env[varName as keyof Record<string, string>] ?? `$${simpleVar || `{${bracketedVar}}`}`;
            });
        } else if (unquoted !== undefined) {
            return unquoted.replace(/\$(\w+)|\$\{(\w+)\}/g, (_: unknown, simpleVar: string | undefined, bracketedVar: string | undefined) => {
                const varName = simpleVar || bracketedVar;
                return env[varName as keyof Record<string, string>] ?? `$${simpleVar || `{${bracketedVar}}`}`;
            });
        }
        return '';
    });
};
