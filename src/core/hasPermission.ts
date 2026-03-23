export function hasPermission(
    accountName: string,
    requiredPermission: 'read' | 'write',
    resource: { permissions?: Record<string, string[]> }
): boolean {
    if (!resource.permissions) {
        return true;
    }

    const allowedUsers = resource.permissions[requiredPermission];
    return allowedUsers ? allowedUsers.includes(accountName) : false;
}
