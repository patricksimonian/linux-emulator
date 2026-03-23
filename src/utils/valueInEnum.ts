export function isValueInEnum<T extends object>(value: unknown, enumObj: T): value is T[keyof T] {
    return Object.values(enumObj).includes(value);
}
