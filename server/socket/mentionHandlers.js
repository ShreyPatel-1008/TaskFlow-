const Notification = require('../models/Notification');
const Channel = require('../models/Channel');

const handleMentionNotifications = async ({
  mentionedUserIds,
  sender,
  message,
  channel,
  io,
  onlineUsers
}) => {
  // Don't notify the sender if they mention themselves
  const filteredIds = mentionedUserIds.filter(
    id => id.toString() !== sender._id.toString()
  );

  if (filteredIds.length === 0) return;

  // Create DB notifications using insertMany directly
  const notifications = filteredIds.map(userId => ({
    userId,
    type: 'mention',
    text: `${sender.name} mentioned you in #${channel.name}: "${message.text.slice(0, 50)}${message.text.length > 50 ? '...' : ''}"`,
    link: `/chat?channel=${channel._id}`,
    read: false,
    createdAt: new Date()
  }));

  try {
    await Notification.insertMany(notifications);
  } catch (err) {
    console.error('Failed to create mention notifications:', err);
  }

  // Emit real-time notification to each mentioned user
  for (const userId of filteredIds) {
    const socketIds = onlineUsers.getUserSocketIds(userId.toString());
    socketIds.forEach(sid => {
      io.to(sid).emit('chat_mention', {
        channelId: channel._id,
        channelName: channel.name,
        sender: { 
          _id: sender._id, 
          name: sender.name, 
          avatar: sender.avatar 
        },
        messageText: message.text,
        messageId: message._id
      });
    });
  }
};

const handleEveryoneNotification = async ({
  channel,
  sender,
  message,
  io,
  onlineUsers,
  onlineOnly
}) => {
  // Get all channel members
  const channelDoc = await Channel.findById(channel._id);
  let targetMembers = channelDoc.members.filter(
    id => id.toString() !== sender._id.toString()
  );

  // If @here: filter to only online members
  if (onlineOnly) {
    targetMembers = targetMembers.filter(
      id => onlineUsers.isUserOnline(id.toString())
    );
  }

  if (targetMembers.length === 0) return;

  // Create bulk notifications using insertMany directly
  const notifications = targetMembers.map(userId => ({
    userId,
    type: 'mention',
    text: `${sender.name} mentioned ${onlineOnly ? '@here' : '@everyone'} in #${channel.name}`,
    link: `/chat?channel=${channel._id}`,
    read: false,
    createdAt: new Date()
  }));

  try {
    await Notification.insertMany(notifications);
  } catch (err) {
    console.error('Failed to create everyone/here notifications:', err);
  }

  // Real-time emit to online members
  for (const userId of targetMembers) {
    const socketIds = onlineUsers.getUserSocketIds(userId.toString());
    socketIds.forEach(sid => {
      io.to(sid).emit('chat_mention', {
        channelId: channel._id,
        channelName: channel.name,
        sender: { _id: sender._id, name: sender.name, avatar: sender.avatar },
        messageText: message.text,
        isEveryone: !onlineOnly,
        isHere: onlineOnly
      });
    });
  }
};

module.exports = { 
  handleMentionNotifications, 
  handleEveryoneNotification 
};
