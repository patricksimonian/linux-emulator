export type FlagType = 'boolean' | 'string' | 'number' | 'list';

export type TypeMap<T extends FlagType> =
    T extends 'boolean' ? boolean :
    T extends 'string' ? string :
    T extends 'number' ? number :
    T extends 'list' ? string[] :
    never;

export interface FlagDef<T extends FlagType> {
    name: string;
    short?: string;
    type: T;
    defaultValue?: TypeMap<T>;
    required?: boolean;
    description?: string;
}

export type ProgramStyle = 'POSIX' | 'GNU' | 'GO' | 'BSD';

export type FlagConfig = Record<string, FlagDef<FlagType>>;

export interface Schema<TFlags extends FlagConfig> {
    style: ProgramStyle;
    flags: TFlags;
    aliases: Record<string, keyof TFlags>;
}

export type ParsedFlags<TFlags extends FlagConfig> = {
    [K in keyof TFlags]: TypeMap<TFlags[K]['type']>;
};

export interface ParsedArgs<TFlags extends FlagConfig> {
    flags: ParsedFlags<TFlags>;
    positionals: string[];
}

export function createSchema<const T extends FlagConfig>(
    style: ProgramStyle,
    flags: T,
    aliases: Record<string, keyof T>
): Schema<T> {
    return { style, flags, aliases };
}

export type TokenType = 'FLAG' | 'LITERAL';

export interface Token {
    type: TokenType;
    name: string;
    raw: string;
    attachedValue?: string;
}

export function tokenize<TFlags extends FlagConfig>(
    args: string[],
    schema: Schema<TFlags>
): Token[] {
    const tokens: Token[] = [];

    const getLongName = (flagKey: string): string => {
        const aliasMap = schema.aliases as Record<string, string>;
        return aliasMap[flagKey] || flagKey;
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '-' || arg === '--') {
            tokens.push({ type: 'LITERAL', name: arg, raw: arg });
            continue;
        }

        if (schema.style === 'POSIX' || schema.style === 'GNU') {
            if (arg.startsWith('--')) {
                const [rawFlag, ...rest] = arg.slice(2).split('=');
                const longName = getLongName(rawFlag);
                tokens.push({
                    type: 'FLAG',
                    name: longName,
                    raw: arg,
                    attachedValue: rest.length > 0 ? rest.join('=') : undefined
                });
                continue;
            }

            if (arg.startsWith('-')) {
                const chars = arg.slice(1).split('');
                for (let j = 0; j < chars.length; j++) {
                    const char = chars[j];
                    const longName = getLongName(char);
                    const flagDef = schema.flags[longName];
                    const token: Token = { type: 'FLAG', name: longName, raw: `-${char}` };

                    if (flagDef && flagDef.type !== 'boolean') {
                        const rest = arg.slice(j + 2);
                        if (rest.length > 0) {
                            token.attachedValue = rest;
                            tokens.push(token);
                            break;
                        }
                    }
                    tokens.push(token);
                }
                continue;
            }
        }

        if (schema.style === 'GO') {
            if (arg.startsWith('-')) {
                const [rawFlag, ...rest] = arg.replace(/^-+/, '').split('=');
                const longName = getLongName(rawFlag);
                tokens.push({
                    type: 'FLAG',
                    name: longName,
                    raw: arg,
                    attachedValue: rest.length > 0 ? rest.join('=') : undefined
                });
                continue;
            }
        }

        tokens.push({ type: 'LITERAL', name: arg, raw: arg });
    }

    return tokens;
}

export function parseArgs<TFlags extends FlagConfig>(
    tokens: Token[],
    schema: Schema<TFlags>
): ParsedArgs<TFlags> {
    const resultFlags: Partial<ParsedFlags<TFlags>> = {};
    const positionals: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token.type === 'LITERAL') {
            positionals.push(token.raw);
            continue;
        }

        const flagDef = schema.flags[token.name];
        if (!flagDef) {
            throw new Error(`Parse Error: Unknown flag provided '${token.raw}'`);
        }

        if (flagDef.type === 'boolean') {
            (resultFlags as Record<string, unknown>)[token.name] = true;
            continue;
        }

        let rawValue: string;

        if (token.attachedValue !== undefined) {
            rawValue = token.attachedValue;
        } else {
            const nextToken = tokens[i + 1];
            if (!nextToken || nextToken.type === 'FLAG') {
                throw new Error(`Parse Error: Flag '${token.raw}' expects a value, but none was provided.`);
            }
            rawValue = nextToken.raw;
            i++;
        }

        switch (flagDef.type) {
            case 'string':
                (resultFlags as Record<string, unknown>)[token.name] = rawValue;
                break;
            case 'number': {
                const parsedNum = Number(rawValue);
                if (Number.isNaN(parsedNum)) {
                    throw new Error(`Parse Error: Flag '${token.raw}' expects a number, got '${rawValue}'.`);
                }
                (resultFlags as Record<string, unknown>)[token.name] = parsedNum;
                break;
            }
            case 'list':
                if (!(resultFlags as Record<string, unknown>)[token.name]) {
                    (resultFlags as Record<string, unknown>)[token.name] = [];
                }
                ((resultFlags as Record<string, unknown>)[token.name] as string[]).push(rawValue);
                break;
        }
    }

    for (const key in schema.flags) {
        const def = schema.flags[key];
        const isPresent = resultFlags[key] !== undefined;

        if (!isPresent) {
            if (def.required) {
                throw new Error(`Validation Error: Missing required flag '--${def.name}'.`);
            }
            if (def.defaultValue !== undefined) {
                (resultFlags as Record<string, unknown>)[key] = def.defaultValue;
            } else if (def.type === 'boolean') {
                (resultFlags as Record<string, unknown>)[key] = false;
            } else if (def.type === 'list') {
                (resultFlags as Record<string, unknown>)[key] = [];
            }
        }
    }

    return {
        flags: resultFlags as ParsedFlags<TFlags>,
        positionals
    };
}
