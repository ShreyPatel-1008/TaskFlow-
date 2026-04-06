import { useWorkspace } from '../context/WorkspaceContext';
import { hasPermission, ACTION_ROLES } from '../utils/roles';

/**
 * Hook that returns a `can(action)` predicate based on the current
 * user's role in the active workspace.
 *
 * Usage:
 *   const { can, role } = usePermission();
 *   if (can('deleteTask')) { ... }
 *
 * NOTE: This is a UI-level convenience. The server enforces
 * permissions independently via requireRole middleware.
 */
export const usePermission = () => {
    const { activeWorkspace } = useWorkspace();
    const role = activeWorkspace?.role || 'viewer';

    const can = (action) => {
        const requiredRole = ACTION_ROLES[action];
        if (!requiredRole) {
            console.warn(`usePermission: unknown action "${action}"`);
            return false;
        }
        return hasPermission(role, requiredRole);
    };

    return { can, role };
};
