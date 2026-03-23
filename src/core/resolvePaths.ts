export function resolvePath(currentPath: string, inputPath: string): string {
    const parts = inputPath.startsWith('/')
        ? inputPath.split('/')
        : `${currentPath}/${inputPath}`.split('/');

    const resolvedParts: string[] = [];
    for (const part of parts) {
        if (part === '.' || part === '') continue;
        if (part === '..') resolvedParts.pop();
        else resolvedParts.push(part);
    }

    return '/' + resolvedParts.join('/');
}
