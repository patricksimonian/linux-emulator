export const processRawInput = (input: string): string => {
    const trimmedInput = input.trim();

    if (trimmedInput.startsWith('#')) {
        return '';
    }

    if (trimmedInput === '') {
        return '';
    }

    return trimmedInput;
};
