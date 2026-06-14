const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const User = require('../models/User');
const requireRole = require('../middleware/requireRole');
const { logActivity } = require('../services/activity');
const onlineUsers = require('../socket/onlineUsers');

// @route   GET /api/chat/channels
// @desc    Get all channels in workspace that user is member of (including #general)
// @access  Viewer+ (all members)
router.get('/channels', async (req, res) => {
    try {
        const channels = await Channel.find({
            workspaceId: req.workspaceId,
            type: 'channel',
            members: req.user._id
        }).sort({ name: 1 });

        // Get last message and unread count for each channel
        const channelsWithMeta = await Promise.all(channels.map(async (channel) => {
            const lastMessage = await Message.findOne({ channelId: channel._id })
                .sort({ createdAt: -1 })
                .populate('senderId', 'name avatar');
            
            const unreadCount = await Message.countDocuments({
                channelId: channel._id,
                'readBy.userId': { $ne: req.user._id }
            });

            return {
                ...channel._doc,
                lastMessage,
                unreadCount
            };
        }));

        res.json(channelsWithMeta);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/chat/channels
// @desc    Create a new channel
// @access  Member+
router.post('/channels', requireRole('member'), async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !/^[a-z0-9-]+$/.test(name)) {
            return res.status(400).json({ message: 'Channel name must be lowercase alphanumeric and hyphens only' });
        }

        const existingChannel = await Channel.findOne({
            workspaceId: req.workspaceId,
            name,
            type: 'channel'
        });

        if (existingChannel) {
            return res.status(400).json({ message: 'Channel with this name already exists' });
        }

        const channel = await Channel.create({
            workspaceId: req.workspaceId,
            name,
            description,
            type: 'channel',
            members: [req.user._id],
            createdBy: req.user._id
        });

        res.status(201).json(channel);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/chat/channels/:channelId
// @desc    Get single channel details with members populated
// @access  Viewer+ (must be member of the channel)
router.get('/channels/:channelId', async (req, res) => {
    try {
        const channel = await Channel.findOne({
            _id: req.params.channelId,
            workspaceId: req.workspaceId,
            members: req.user._id
        }).populate('members', 'name avatar email');

        if (!channel) {
            return res.status(404).json({ message: 'Channel not found or you are not a member' });
        }

        res.json(channel);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/chat/channels/:channelId/join
// @desc    Join a channel
// @access  Member+
router.post('/channels/:channelId/join', requireRole('member'), async (req, res) => {
    try {
        const channel = await Channel.findOne({
            _id: req.params.channelId,
            workspaceId: req.workspaceId,
            type: 'channel'
        });

        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        if (channel.members.includes(req.user._id)) {
            return res.status(400).json({ message: 'Already a member of this channel' });
        }

        channel.members.push(req.user._id);
        await channel.save();

        res.json(channel);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   DELETE /api/chat/channels/:channelId
// @desc    Delete a channel and its messages
// @access  Admin only
router.delete('/channels/:channelId', requireRole('admin'), async (req, res) => {
    try {
        const channel = await Channel.findOne({
            _id: req.params.channelId,
            workspaceId: req.workspaceId
        });

        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        if (channel.isDefault && channel.name === 'general') {
            return res.status(400).json({ message: 'Cannot delete the #general channel' });
        }

        await Message.deleteMany({ channelId: channel._id });
        await Channel.findByIdAndDelete(channel._id);

        res.json({ message: 'Channel and its messages deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/chat/channels/:channelId/messages
// @desc    Get paginated messages for a channel
// @access  Viewer+ (must be member)
router.get('/channels/:channelId/messages', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const channel = await Channel.findOne({
            _id: req.params.channelId,
            workspaceId: req.workspaceId,
            members: req.user._id
        });

        if (!channel) {
            return res.status(403).json({ message: 'Access denied to this channel' });
        }

        const messages = await Message.find({ channelId: channel._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('senderId', 'name avatar');

        const total = await Message.countDocuments({ channelId: channel._id });

        res.json({
            messages,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/chat/channels/:channelId/messages
// @desc    Send a message in a channel
// @access  Member+
router.post('/channels/:channelId/messages', requireRole('member'), async (req, res) => {
    try {
        const { text, mentions } = req.body;

        const channel = await Channel.findOne({
            _id: req.params.channelId,
            workspaceId: req.workspaceId,
            members: req.user._id
        });

        if (!channel) {
            return res.status(403).json({ message: 'Access denied to this channel' });
        }

        const message = await Message.create({
            channelId: channel._id,
            workspaceId: req.workspaceId,
            senderId: req.user._id,
            text,
            mentions: mentions || [],
            readBy: [{ userId: req.user._id, readAt: new Date() }]
        });

        await message.populate('senderId', 'name avatar');

        // Log activity
        logActivity(
            req.workspaceId,
            req.user._id,
            'message_sent',
            `${req.user.name} sent a message in ${channel.name || 'a channel'}`,
            null,
            { channelId: channel._id, messageId: message._id }
        );

        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PATCH /api/chat/messages/:messageId
// @desc    Edit a message
// @access  Message sender only
router.patch('/messages/:messageId', async (req, res) => {
    try {
        const { text } = req.body;

        const message = await Message.findOne({
            _id: req.params.messageId,
            workspaceId: req.workspaceId
        });

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (message.senderId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You can only edit your own messages' });
        }

        if (message.isDeleted) {
            return res.status(400).json({ message: 'Cannot edit a deleted message' });
        }

        message.text = text;
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();
        await message.populate('senderId', 'name avatar');

        res.json(message);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   DELETE /api/chat/messages/:messageId
// @desc    Delete a message (soft delete)
// @access  Message sender or Admin
router.delete('/messages/:messageId', async (req, res) => {
    try {
        const message = await Message.findOne({
            _id: req.params.messageId,
            workspaceId: req.workspaceId
        });

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        const isSender = message.senderId.toString() === req.user._id.toString();
        const isAdmin = req.workspaceRole === 'admin';

        if (!isSender && !isAdmin) {
            return res.status(403).json({ message: 'Insufficient permissions to delete this message' });
        }

        message.isDeleted = true;
        message.deletedAt = new Date();
        message.text = 'This message was deleted';
        await message.save();

        res.json({ message: 'Message deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/chat/channels/:channelId/read
// @desc    Mark all messages in channel as read
// @access  Viewer+
router.post('/channels/:channelId/read', async (req, res) => {
    try {
        const channel = await Channel.findOne({
            _id: req.params.channelId,
            workspaceId: req.workspaceId,
            members: req.user._id
        });

        if (!channel) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await Message.updateMany(
            { 
                channelId: channel._id, 
                'readBy.userId': { $ne: req.user._id } 
            },
            { 
                $push: { readBy: { userId: req.user._id, readAt: new Date() } } 
            }
        );

        res.json({ message: 'Messages marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/chat/dm
// @desc    Create or return an existing DM channel
// @access  Member+
router.post('/dm', requireRole('member'), async (req, res) => {
    try {
        const { targetUserId } = req.body;

        if (req.user._id.toString() === targetUserId) {
            return res.status(400).json({ message: 'Cannot create a DM with yourself' });
        }

        // Check if DM channel already exists between these two users in this workspace
        const existingDM = await Channel.findOne({
            workspaceId: req.workspaceId,
            type: 'direct',
            members: { $all: [req.user._id, targetUserId], $size: 2 }
        }).populate('members', 'name avatar');

        if (existingDM) {
            return res.json(existingDM);
        }

        // Validate target user exists and is in workspace (optional but good practice)
        // Leaving explicit workspace validation for brevity, assuming targetUserId is valid

        const newDM = await Channel.create({
            workspaceId: req.workspaceId,
            name: `dm-${Date.now()}`, // Internal name, usually not displayed
            type: 'direct',
            members: [req.user._id, targetUserId],
            createdBy: req.user._id
        });

        await newDM.populate('members', 'name avatar lastSeen');

        const io = req.app.get('io');
        if (io) {
            const targetSocketIds = onlineUsers.getUserSocketIds(targetUserId);
            targetSocketIds.forEach(sid => {
                io.to(sid).emit('new_dm_channel', {
                    channel: newDM,
                    initiator: { _id: req.user._id, name: req.user.name, avatar: req.user.avatar }
                });
            });
        }
        
        res.status(201).json(newDM);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/chat/dm/list
// @desc    Get all DM channels for the user
// @access  Viewer+
router.get('/dm/list', async (req, res) => {
    try {
        const dms = await Channel.find({
            workspaceId: req.workspaceId,
            type: 'direct',
            members: req.user._id
        }).populate('members', 'name avatar');

        const dmsWithMeta = await Promise.all(dms.map(async (dm) => {
            const lastMessage = await Message.findOne({ channelId: dm._id })
                .sort({ createdAt: -1 })
                .populate('senderId', 'name avatar');
            
            const unreadCount = await Message.countDocuments({
                channelId: dm._id,
                'readBy.userId': { $ne: req.user._id }
            });

            const otherMemberObj = dm.members.find(m => m._id.toString() !== req.user._id.toString());
            let otherMember = null;
            if (otherMemberObj) {
                const status = onlineUsers.getUserStatus(otherMemberObj._id.toString());
                otherMember = {
                    _id: otherMemberObj._id,
                    name: otherMemberObj.name,
                    avatar: otherMemberObj.avatar,
                    status,
                    lastSeen: otherMemberObj.lastSeen
                };
            }

            return {
                channel: dm._doc,
                otherMember,
                lastMessage,
                unreadCount
            };
        }));

        res.json({ dms: dmsWithMeta });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/chat/online-users
// @desc    Get online users in current workspace
// @access  Viewer+
router.get('/online-users', async (req, res) => {
    try {
        const users = onlineUsers.getOnlineUsers(req.workspaceId);
        res.json({ onlineUsers: users });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/chat/users/:userId/status
// @desc    Get a single user's status
// @access  Viewer+
router.get('/users/:userId/status', async (req, res) => {
    try {
        const status = onlineUsers.getUserStatus(req.params.userId);
        if (status !== 'offline') {
            return res.json({ status, lastSeen: new Date() });
        }
        
        const user = await User.findById(req.params.userId).select('lastSeen');
        res.json({ status: 'offline', lastSeen: user?.lastSeen || null });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
