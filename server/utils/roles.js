/**
 * Role hierarchy utility — shared between middleware and route logic.
 *
 * Numeric levels let us do simple comparisons:
 *   hasPermission('member', 'viewer') → true  (2 >= 1)
 *   hasPermission('viewer', 'admin')  → false (1 >= 3)
 */

const ROLES = Object.freeze({
    viewer: 1,
    member: 2,
    admin: 3,
});

/**
 * Check whether `userRole` meets or exceeds `requiredRole`.
 * @param {string} userRole   - The role the user currently holds
 * @param {string} requiredRole - The minimum role needed for the action
 * @returns {boolean}
 */
const hasPermission = (userRole, requiredRole) => {
    const userLevel = ROLES[userRole];
    const requiredLevel = ROLES[requiredRole];

    if (userLevel === undefined || requiredLevel === undefined) return false;
    return userLevel >= requiredLevel;
};

module.exports = { ROLES, hasPermission };
