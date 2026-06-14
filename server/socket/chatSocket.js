const socketAuth = require('./socketAuth');
const onlineUsers = require('./onlineUsers');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const User = require('../models/User');
const WorkspaceMember = require('../models/WorkspaceMember');
const { logActivity } = require('../services/activity');
const { parseChatMentions, parseSpecialMentions } = require('../utils/mentionParser');
const { handleMentionNotifications, handleEveryoneNotification } = require('./mentionHandlers');

const AWAY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Helper: check if userId is in an array of ObjectIds
const isMember = (membersArray, userId) => {
    const uid = userId.toString();
    return membersArray.some(id => id.toString() === uid);
};

module.exports = (io) => {
    io.use(socketAuth);

    // Middleware to track activity on every event
    io.use((socket, next) => {
        socket.lastActivity = Date.now();
        next();
    });

    const awayChecker = setInterval(() => {
        const now = Date.now();
        for (const [socketId, socket] of io.sockets.sockets) {
            if (socket.user && now - socket.lastActivity > AWAY_TIMEOUT) {
                const userId = socket.user._id.toString();
                const currentStatus = onlineUsers.getUserStatus(userId);
                if (currentStatus === 'online') {
                    onlineUsers.setStatus(userId, 'away');
                    // Notify workspace members
                    const userData = onlineUsers.users.get(userId);
                    if (userData) {
                        for (const workspaceId of userData.workspaceIds) {
                            io.to(`workspace:${workspaceId}`).emit('user_status_changed', {
                                userId,
                                status: 'away'
                            });
                        }
                    }
                }
            }
        }
    }, 60 * 1000);

    process.on('SIGTERM', () => clearInterval(awayChecker));
    process.on('SIGINT', () => clearInterval(awayChecker));

    io.on('connection', (socket) => {
        console.log('🔌 [SOCKET] New connection:', socket.id, 'User:', socket.user?.name, socket.user?._id);
        socket.lastActivity = Date.now();

        socket.use(([event, ...args], next) => {
            socket.lastActivity = Date.now();
            next();
        });

        socket.on('join_workspace', async ({ workspaceId }) => {
            try {
                const memberCheck = await WorkspaceMember.exists({ workspaceId, userId: socket.user._id });
                if (!memberCheck) return socket.emit('error', { message: 'Not a member of this workspace' });

                // Leave old workspace room and its channels if switching
                if (socket.currentWorkspaceId && socket.currentWorkspaceId !== workspaceId) {
                    socket.leave(`workspace:${socket.currentWorkspaceId}`);
                    // Leave all channel rooms from old workspace
                    const oldChannels = await Channel.find({ workspaceId: socket.currentWorkspaceId, members: socket.user._id });
                    oldChannels.forEach(c => {
                        socket.leave(`channel:${c._id}`);
                    });
                }

                socket.currentWorkspaceId = workspaceId;
                socket.join(`workspace:${workspaceId}`);
                onlineUsers.addUser(socket.user._id.toString(), socket.id, workspaceId);

                // Join all channels user is a member of in this workspace
                const channels = await Channel.find({ workspaceId, members: socket.user._id });
                channels.forEach(c => {
                    socket.join(`channel:${c._id}`);
                });

                // Broadcast online status
                socket.to(`workspace:${workspaceId}`).emit('user_online', { 
                    userId: socket.user._id.toString(),
                    name: socket.user.name
                });

                // Send back online users in this workspace
                const onlineList = onlineUsers.getOnlineUsers(workspaceId);
                socket.emit('join_workspace_success', { onlineUsers: onlineList });

            } catch (err) {
                console.error('join_workspace error:', err);
            }
        });

        socket.on('join_channel', async ({ channelId }) => {
            try {
                const channel = await Channel.findById(channelId);
                if (!channel || !isMember(channel.members, socket.user._id)) return;
                
                socket.join(`channel:${channelId}`);
            } catch (err) {
                console.error('join_channel error:', err);
            }
        });

        socket.on('leave_channel', ({ channelId }) => {
            socket.leave(`channel:${channelId}`);
        });

        socket.on('send_message', async ({ channelId, text }) => {
            console.log('Received send_message event:', { channelId, text, userId: socket.user?._id });
            try {
                const channel = await Channel.findById(channelId);
                if (!channel) {
                    console.log('Channel not found:', channelId);
                    return socket.emit('error', { message: 'Channel not found' });
                }
                
                if (!isMember(channel.members, socket.user._id)) {
                    console.log('Not a member of channel:', channelId, 'userId:', socket.user._id);
                    return socket.emit('error', { message: 'Not a member of this channel' });
                }

                // 2. Parse mentions
                const mentionedUsers = await parseChatMentions(text, channel.workspaceId);
                const { hasEveryone, hasHere } = parseSpecialMentions(text);
                const mentionIds = mentionedUsers.map(u => u._id);

                // 3. Create message
                const message = await Message.create({
                    channelId,
                    workspaceId: channel.workspaceId,
                    senderId: socket.user._id,
                    text,
                    mentions: mentionIds,
                    readBy: [{ userId: socket.user._id, readAt: new Date() }]
                });

                // 4. Populate
                await message.populate('senderId', 'name avatar');
                await message.populate('mentions', 'name');

                // 5. Emit to channel room
                io.to(`channel:${channelId}`).emit('new_message', message);

                // 6. Handle @mentions
                if (mentionIds.length > 0) {
                    await handleMentionNotifications({
                        mentionedUserIds: mentionIds,
                        sender: socket.user,
                        message,
                        channel,
                        io,
                        onlineUsers
                    });
                }

                // 7. Handle @everyone (channels only, not DMs)
                if (hasEveryone && channel.type === 'channel') {
                    await handleEveryoneNotification({
                        channel,
                        sender: socket.user,
                        message,
                        io,
                        onlineUsers,
                        onlineOnly: false
                    });
                }

                // 8. Handle @here (channels only, not DMs)
                if (hasHere && channel.type === 'channel') {
                    await handleEveryoneNotification({
                        channel,
                        sender: socket.user,
                        message,
                        io,
                        onlineUsers,
                        onlineOnly: true
                    });
                }

                // 9. Log activity
                await logActivity(
                    channel.workspaceId,
                    socket.user._id,
                    'message_sent',
                    `${socket.user.name} sent a message in ${channel.name || 'a channel'}`,
                    null,
                    { channelId: channel._id, messageId: message._id }
                );

            } catch (err) {
                console.error('send_message error:', err);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        socket.on('edit_message', async ({ messageId, text }) => {
            try {
                const message = await Message.findById(messageId);
                if (!message) return;

                if (message.senderId.toString() !== socket.user._id.toString()) return;

                message.text = text;
                message.isEdited = true;
                message.editedAt = new Date();
                await message.save();

                io.to(`channel:${message.channelId}`).emit('message_edited', { 
                    messageId, 
                    text, 
                    editedAt: message.editedAt 
                });
            } catch (err) {
                console.error('edit_message error:', err);
            }
        });

        socket.on('delete_message', async ({ messageId }) => {
            try {
                const message = await Message.findById(messageId);
                if (!message) return;

                const isSender = message.senderId.toString() === socket.user._id.toString();
                const memberDoc = await WorkspaceMember.findOne({ workspaceId: message.workspaceId, userId: socket.user._id });
                const isAdmin = memberDoc && memberDoc.role === 'admin';

                if (!isSender && !isAdmin) return;

                message.isDeleted = true;
                message.text = 'This message was deleted';
                message.deletedAt = new Date();
                await message.save();

                // message.channelId is a plain ObjectId here (not populated)
                io.to(`channel:${message.channelId}`).emit('message_deleted', { messageId });
            } catch (err) {
                console.error('delete_message error:', err);
            }
        });

        socket.on('typing_start', ({ channelId }) => {
            socket.to(`channel:${channelId}`).emit('user_typing', {
                userId: socket.user._id.toString(),
                name: socket.user.name,
                channelId
            });
        });

        socket.on('typing_stop', ({ channelId }) => {
            socket.to(`channel:${channelId}`).emit('user_stop_typing', {
                userId: socket.user._id.toString(),
                channelId
            });
        });

        socket.on('mark_read', async ({ channelId }) => {
            try {
                await Message.updateMany(
                    { 
                        channelId, 
                        'readBy.userId': { $ne: socket.user._id } 
                    },
                    { 
                        $push: { readBy: { userId: socket.user._id, readAt: new Date() } } 
                    }
                );
                
                socket.emit('messages_read', { channelId });
                socket.to(`channel:${channelId}`).emit('read_receipt', { 
                    channelId, 
                    userId: socket.user._id 
                });
            } catch (err) {
                console.error('mark_read error:', err);
            }
        });

        socket.on('set_status', ({ status }) => {
            const userId = socket.user._id.toString();
            onlineUsers.setStatus(userId, status);
            
            const userData = onlineUsers.users.get(userId);
            if (userData) {
                for (const workspaceId of userData.workspaceIds) {
                    io.to(`workspace:${workspaceId}`).emit('user_status_changed', {
                        userId,
                        status
                    });
                }
            }
        });

        socket.on('get_online_users', ({ workspaceId }, callback) => {
            const onlineList = onlineUsers.getOnlineUsers(workspaceId);
            if (typeof callback === 'function') callback({ onlineUsers: onlineList });
        });

        socket.on('dm_read', ({ channelId, targetUserId }) => {
            const userId = socket.user._id.toString();
            const targetSocketIds = onlineUsers.getUserSocketIds(targetUserId);
            targetSocketIds.forEach(sid => {
                io.to(sid).emit('dm_read_receipt', {
                    channelId,
                    readBy: userId
                });
            });
        });

        socket.on('disconnect', async () => {
            const userId = socket.user?._id?.toString();
            if (!userId) return;

            const removed = onlineUsers.removeUser(socket.id);
            if (removed) {
                try {
                    await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
                } catch (e) {
                    console.error(e);
                }

                // Only broadcast offline if user has no more sockets
                if (removed.fullyOffline) {
                    for (const workspaceId of removed.workspaceIds) {
                        io.to(`workspace:${workspaceId}`).emit('user_offline', {
                            userId,
                            lastSeen: new Date()
                        });
                    }
                }
            }
        });
    });
};
