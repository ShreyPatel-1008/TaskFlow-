const express = require('express');
const router = express.Router();
const Invite = require('../models/Invite');
const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const Channel = require('../models/Channel');
const auth = require('../middleware/auth');
const attachWorkspace = require('../middleware/attachWorkspace');
const requireRole = require('../middleware/requireRole');
const { sendInviteEmail } = require('../services/email');
const { createNotification } = require('../services/notify');
const { logActivity } = require('../services/activity');
const User = require('../models/User');


// @route   POST /api/invites
// @desc    Invite a member to the active workspace
// @access  Admin only — only admins should be able to invite new people
router.post('/', auth, attachWorkspace, requireRole('admin'), async (req, res) => {
    try {
        const { email, role } = req.body;

        // Check if already a member
        const targetUser = await User.findOne({ email: email.toLowerCase() }).select('_id');
        if (targetUser) {
            const existingMember = await WorkspaceMember.findOne({
                workspaceId: req.workspaceId,
                userId: targetUser._id
            });
            if (existingMember) {
                return res.status(409).json({ message: 'User is already a member of this workspace' });
            }
        }

        // Check for pending invite
        const pendingInvite = await Invite.findOne({
            workspaceId: req.workspaceId,
            invitedEmail: email.toLowerCase(),
            status: 'pending',
            expiresAt: { $gt: new Date() }
        });
        if (pendingInvite) {
            return res.status(409).json({ message: 'Invite already sent to this email' });
        }

        // Create Invite
        const invite = await Invite.create({
            workspaceId: req.workspaceId,
            invitedEmail: email.toLowerCase(),
            role: role || 'member',
            invitedBy: req.user._id
        });

        // Send Email (blocking but fault-tolerant)
        const workspace = await Workspace.findById(req.workspaceId);
        let emailSent = true;
        try {
            await sendInviteEmail(email, req.user.name, workspace.name, invite.token);
        } catch (emailErr) {
            console.error('Failed to send invite email:', emailErr);
            emailSent = false;
        }

        // --- NOTIFICATIONS ---
        // If the user already has an account, notify them in-app
        const existingUser = await User.findOne({ email: email.toLowerCase() }).select('_id');
        if (existingUser) {
            await createNotification(existingUser._id, {
                type: 'invite_received',
                actorId: req.user._id,
                link: `/invite/${invite.token}`,
                metadata: {
                    workspaceName: workspace.name
                }
            });
        }

        res.status(201).json({ ...invite._doc, emailSent });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/invites/workspace/:workspaceId
// @desc    List all pending invites for a workspace
// @access  Admin only — members/viewers shouldn't see pending invites
router.get('/workspace/:workspaceId', auth, async (req, res) => {
    try {
        const membership = await WorkspaceMember.findOne({
            workspaceId: req.params.workspaceId,
            userId: req.user._id,
            role: 'admin'
        });

        if (!membership) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const invites = await Invite.find({
            workspaceId: req.params.workspaceId,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        res.json(invites);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/invites/:token
// @desc    Public route to preview an invite (no auth needed)
router.get('/:token', async (req, res) => {
    try {
        const invite = await Invite.findOne({ token: req.params.token })
            .populate('workspaceId', 'name')
            .populate('invitedBy', 'name');

        if (!invite) return res.status(404).json({ message: 'Invite not found' });
        if (invite.status !== 'pending') return res.status(400).json({ message: 'This invite has already been used' });
        if (invite.expiresAt < new Date()) return res.status(410).json({ message: 'This invite has expired' });

        res.json({
            workspaceName: invite.workspaceId.name,
            inviterName: invite.invitedBy.name,
            email: invite.invitedEmail
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/invites/:token/accept
// @desc    Accept an invite (must be logged in)
router.post('/:token/accept', auth, async (req, res) => {
    try {
        const invite = await Invite.findOne({ token: req.params.token });

        if (!invite || invite.status !== 'pending') {
            return res.status(404).json({ message: 'Invalid or used invite' });
        }
        if (invite.expiresAt < new Date()) {
            return res.status(410).json({ message: 'This invite has expired' });
        }
        if (invite.invitedEmail !== req.user.email.toLowerCase()) {
            return res.status(403).json({ message: 'This invite was sent to a different email address' });
        }

        // Prevent duplicate membership
        const alreadyMember = await WorkspaceMember.findOne({
            workspaceId: invite.workspaceId,
            userId: req.user._id
        });
        if (alreadyMember) {
            return res.status(409).json({ message: 'Already a member of this workspace' });
        }

        await WorkspaceMember.create({
            workspaceId: invite.workspaceId,
            userId: req.user._id,
            role: invite.role
        });

        invite.status = 'accepted';
        await invite.save();

        // Auto-add to #general channel
        await Channel.findOneAndUpdate(
            { workspaceId: invite.workspaceId, name: 'general', type: 'channel' },
            { $addToSet: { members: req.user._id } }
        );

        // Log activity — member joined
        logActivity(
            invite.workspaceId, req.user._id, 'member_joined',
            `${req.user.name} joined the workspace`,
            null,
            { userId: req.user._id }
        );

        res.json({ message: 'Joined workspace successfully', workspaceId: invite.workspaceId });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PATCH /api/invites/:token/revoke
// @desc    Revoke a pending invite
// @access  Admin only — uses requireRole after attachWorkspace
router.patch('/:token/revoke', auth, attachWorkspace, requireRole('admin'), async (req, res) => {
    try {
        const invite = await Invite.findOneAndUpdate(
            { token: req.params.token, workspaceId: req.workspaceId },
            { status: 'revoked' },
            { new: true }
        );
        if (!invite) return res.status(404).json({ message: 'Invite not found' });

        res.json({ message: 'Invite revoked' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
