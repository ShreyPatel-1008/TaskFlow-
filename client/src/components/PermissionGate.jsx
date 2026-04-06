import { usePermission } from '../hooks/usePermission';

/**
 * Declarative permission gate.
 *
 * Renders children only if the current user has the required
 * permission for the given action. Optionally renders a fallback
 * for unauthorized users instead of nothing.
 *
 * Usage:
 *   <PermissionGate action="deleteTask">
 *     <DeleteButton />
 *   </PermissionGate>
 *
 *   <PermissionGate action="editTask" fallback={<DisabledButton />}>
 *     <EditButton />
 *   </PermissionGate>
 */
const PermissionGate = ({ action, children, fallback = null }) => {
    const { can } = usePermission();
    return can(action) ? children : fallback;
};

export default PermissionGate;
