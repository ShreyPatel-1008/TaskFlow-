const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');

/**
 * Middleware to attach workspace context to the request.
 * Expects 'x-workspace-id' header or 'workspaceId' in query/body.
 */
const attachWorkspace = async (req, res, next) => {
    try {
        const workspaceId = req.headers['x-workspace-id'] || req.body.workspaceId || req.query.workspaceId;

        if (!workspaceId) {
            return res.status(400).json({ message: 'Workspace ID is required for this operation' });
        }

        // Verify the user is a member of this workspace
        const membership = await WorkspaceMember.findOne({
            workspaceId,
            userId: req.user.id
        });

        if (!membership) {
            return res.status(403).json({ message: 'You do not have access to this workspace' });
        }

        // Attach workspace info to request
        req.workspaceId = workspaceId;
        req.workspaceRole = membership.role;
        
        next();
    } catch (error) {
        console.error('Workspace Middleware Error:', error);
        res.status(500).json({ message: 'Internal server error during workspace validation' });
    }
};

module.exports = attachWorkspace;
