export function parseEnv(commandStr: string) {
    const [inlineEnv] = commandStr.split(' ', 1);
    const inlineEnvMatches = inlineEnv.matchAll(/([a-zA-Z_0-9]+)=([^ ]+)/g);
    return inlineEnvMatches;
}
