/**
 * Frontend role constants and permission logic.
 * Mirrors server/utils/roles.js for client-side checks.
 *
 * IMPORTANT: These are purely UI-level gates. The server always
 * enforces permissions independently via requireRole middleware.
 */

export const ROLES = Object.freeze({
    viewer: 1,
    member: 2,
    admin: 3,
});

export const hasPermission = (userRole, requiredRole) => {
    const userLevel = ROLES[userRole];
    const requiredLevel = ROLES[requiredRole];
    if (userLevel === undefined || requiredLevel === undefined) return false;
    return userLevel >= requiredLevel;
};

/**
 * Maps human-readable action names → minimum role required.
 * Used by the usePermission hook.
 */
export const ACTION_ROLES = Object.freeze({
    // Task actions
    createTask:       'member',
    editTask:         'member',
    deleteTask:       'member',
    assignTask:       'member',

    // Collaboration
    comment:          'member',

    // Workspace management
    inviteMembers:    'admin',
    changeRoles:      'admin',
    removeMembers:    'admin',
    manageWorkspace:  'admin',

    // Read-only
    viewWorkspace:    'viewer',
});
