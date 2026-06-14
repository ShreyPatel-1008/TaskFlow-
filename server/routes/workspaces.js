const express = require('express');
const router = express.Router();
const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const Channel = require('../models/Channel');
const auth = require('../middleware/auth');
const attachWorkspace = require('../middleware/attachWorkspace');
const requireRole = require('../middleware/requireRole');
const { createNotification } = require('../services/notify');

// @route   POST /api/workspaces
// @desc    Create a new workspace — any authenticated user can create
router.post('/', auth, async (req, res) => {
    try {
        const { name, description } = req.body;

        const workspace = await Workspace.create({
            name,
            description,
            ownerId: req.user.id
        });

        // Auto-add creator as admin
        await WorkspaceMember.create({
            workspaceId: workspace._id,
            userId: req.user.id,
            role: 'admin'
        });

        // Auto-create #general channel
        await Channel.create({
            workspaceId: workspace._id,
            name: 'general',
            description: 'General discussion for the workspace',
            type: 'channel',
            members: [req.user.id],
            createdBy: req.user.id,
            isDefault: true
        });

        res.status(201).json(workspace);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/workspaces/mine
// @desc    Get all workspaces for the logged-in user
router.get('/mine', auth, async (req, res) => {
    try {
        const memberships = await WorkspaceMember.find({ userId: req.user.id })
            .populate('workspaceId');

        const workspaces = memberships
            .filter(m => m.workspaceId)
            .map(m => ({
                ...m.workspaceId._doc,
                role: m.role
            }));

        res.json(workspaces);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/workspaces/:id/switch
// @desc    Validate and return workspace details for switching
router.post('/:id/switch', auth, async (req, res) => {
    try {
        const membership = await WorkspaceMember.findOne({
            workspaceId: req.params.id,
            userId: req.user.id
        }).populate('workspaceId');

        if (!membership) {
            return res.status(403).json({ message: 'Access denied: Not a member of this workspace' });
        }

        res.json({
            workspace: membership.workspaceId,
            role: membership.role
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   DELETE /api/workspaces/:id
// @desc    Delete a workspace
// @access  Admin only — destructive action, only admins should delete
router.delete('/:id', auth, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.id);
        if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

        // Only the owner can delete
        if (workspace.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the workspace owner can delete it' });
        }

        await WorkspaceMember.deleteMany({ workspaceId: req.params.id });
        await Workspace.findByIdAndDelete(req.params.id);

        res.json({ message: 'Workspace deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/workspaces/:id/members
// @desc    Get all members of a workspace
// @access  Viewer and above — all workspace members can see the team
router.get('/:id/members', auth, async (req, res) => {
    try {
        const membership = await WorkspaceMember.findOne({
            workspaceId: req.params.id,
            userId: req.user._id
        });

        if (!membership) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const members = await WorkspaceMember.find({ workspaceId: req.params.id })
            .populate('userId', 'name email avatar')
            .sort({ role: 1 });

        res.json(members);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PATCH /api/workspaces/:id/members/:userId
// @desc    Change a member's role
// @access  Admin only — role management is a sensitive admin action
router.patch('/:id/members/:userId', auth, async (req, res) => {
    try {
        const { role } = req.body;
        if (!['admin', 'member', 'viewer'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        // Verify caller is admin
        const callerMembership = await WorkspaceMember.findOne({
            workspaceId: req.params.id,
            userId: req.user._id
        });
        if (!callerMembership || callerMembership.role !== 'admin') {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        // Prevent changing the workspace owner's role
        const workspace = await Workspace.findById(req.params.id);
        if (workspace.ownerId.toString() === req.params.userId) {
            return res.status(400).json({ message: "Cannot change the workspace owner's role" });
        }

        // If admin is demoting themselves, ensure they aren't the last admin
        if (req.user._id.toString() === req.params.userId && role !== 'admin') {
            const adminCount = await WorkspaceMember.countDocuments({
                workspaceId: req.params.id,
                role: 'admin'
            });
            if (adminCount <= 1) {
                return res.status(400).json({
                    message: 'Cannot demote — you are the only admin. Transfer admin role to another member first.'
                });
            }
        }

        const updated = await WorkspaceMember.findOneAndUpdate(
            { workspaceId: req.params.id, userId: req.params.userId },
            { role },
            { new: true }
        ).populate('userId', 'name email avatar');

        if (!updated) return res.status(404).json({ message: 'Member not found' });

        // --- NOTIFICATIONS ---
        // Notify the user about their role change (if not themselves)
        if (req.params.userId !== req.user._id.toString()) {
            await createNotification(req.params.userId, {
                type: 'role_changed',
                link: `/`,
                metadata: {
                    workspaceName: workspace.name,
                    newRole: role
                }
            });
        }

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   DELETE /api/workspaces/:id/members/:userId
// @desc    Remove a member from a workspace
// @access  Admin only — removing someone is a sensitive admin action
router.delete('/:id/members/:userId', auth, async (req, res) => {
    try {
        const callerMembership = await WorkspaceMember.findOne({
            workspaceId: req.params.id,
            userId: req.user._id
        });

        if (!callerMembership || callerMembership.role !== 'admin') {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        // Prevent removing yourself (use a "Leave" flow instead)
        if (req.user._id.toString() === req.params.userId) {
            return res.status(400).json({ message: 'Cannot remove yourself. Use the Leave Workspace option instead.' });
        }

        // Prevent removing the workspace owner
        const workspace = await Workspace.findById(req.params.id);
        if (workspace.ownerId.toString() === req.params.userId) {
            return res.status(400).json({ message: 'Cannot remove the workspace owner' });
        }

        await WorkspaceMember.findOneAndDelete({
            workspaceId: req.params.id,
            userId: req.params.userId
        });

        res.json({ message: 'Member removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/workspaces/:id/leave
// @desc    Leave a workspace voluntarily
// @access  Any member (but the last admin cannot leave)
router.post('/:id/leave', auth, async (req, res) => {
    try {
        const membership = await WorkspaceMember.findOne({
            workspaceId: req.params.id,
            userId: req.user._id
        });

        if (!membership) return res.status(404).json({ message: 'Not a member' });

        // Owner cannot leave their own workspace
        const workspace = await Workspace.findById(req.params.id);
        if (workspace.ownerId.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Workspace owner cannot leave. Transfer ownership first.' });
        }

        // Last admin check
        if (membership.role === 'admin') {
            const adminCount = await WorkspaceMember.countDocuments({
                workspaceId: req.params.id,
                role: 'admin'
            });
            if (adminCount <= 1) {
                return res.status(400).json({
                    message: 'Cannot leave — you are the only admin. Transfer admin role first.'
                });
            }
        }

        await WorkspaceMember.findByIdAndDelete(membership._id);
        res.json({ message: 'Left workspace successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
