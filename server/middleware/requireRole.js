const WorkspaceMember = require('../models/WorkspaceMember');
const { hasPermission } = require('../utils/roles');

/**
 * Middleware factory that enforces a minimum workspace role.
 *
 * Must be chained AFTER `auth` + `attachWorkspace` so that
 * `req.user`, `req.workspaceId`, and `req.workspaceRole` are available.
 *
 * The first call caches the full WorkspaceMember doc on `req.workspaceMember`
 * so downstream handlers never need to re-query it.
 *
 * @param {string} minimumRole  - 'viewer' | 'member' | 'admin'
 * @returns {Function} Express middleware
 */
const requireRole = (minimumRole) => {
    return async (req, res, next) => {
        try {
            // If attachWorkspace already resolved the role, use that.
            // Otherwise look it up (defensive — should never happen if
            // middleware is chained correctly).
            let role = req.workspaceRole;

            if (!role) {
                const member = await WorkspaceMember.findOne({
                    workspaceId: req.workspaceId,
                    userId: req.user._id,
                });

                if (!member) {
                    return res.status(403).json({
                        message: 'You are not a member of this workspace',
                    });
                }

                role = member.role;
                req.workspaceRole = role;
                req.workspaceMember = member;
            }

            // Cache the full member doc if we haven't yet
            if (!req.workspaceMember) {
                req.workspaceMember = await WorkspaceMember.findOne({
                    workspaceId: req.workspaceId,
                    userId: req.user._id,
                });
            }

            if (!hasPermission(role, minimumRole)) {
                return res.status(403).json({
                    message: 'Insufficient permissions',
                    required: minimumRole,
                    current: role,
                });
            }

            next();
        } catch (error) {
            console.error('requireRole error:', error);
            res.status(500).json({ message: 'Permission check failed' });
        }
    };
};

module.exports = requireRole;
