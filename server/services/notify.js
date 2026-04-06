const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Cleanly separate human-readable text from backend data logic.
 */
const buildNotificationText = (type, actor, context) => {
  const actorName = actor?.name || 'A user';
  const taskTitle = context?.taskTitle || 'a task';
  const workspaceName = context?.workspaceName || 'a workspace';

  switch (type) {
    case 'task_assigned':
      return `${actorName} assigned you '${taskTitle}'`;
    case 'mentioned':
      return `${actorName} mentioned you in a comment on '${taskTitle}'`;
    case 'comment_added':
      return `${actorName} commented on '${taskTitle}'`;
    case 'invite_received':
      return `${actorName} invited you to join '${workspaceName}'`;
    case 'role_changed':
      return `Your role in '${workspaceName}' was changed to ${context?.newRole || 'member'}`;
    case 'task_overdue':
      return `Task '${taskTitle}' is overdue`;
    default:
      return `${actorName} triggered a notification`;
  }
};

/**
 * Creates and saves a notification.
 * Never throws — just logs errors to prevent blocking main requests.
 */
const createNotification = async (userId, { type, actorId, metadata, link, text }) => {
  try {
    if (!userId) return null;

    // Use provided text or build from type
    let finalActor = null;
    if (actorId) {
      finalActor = await User.findById(actorId).select('name');
    }

    const notificationText = text || buildNotificationText(type, finalActor, metadata);

    const notification = new Notification({
      userId,
      type,
      text: notificationText,
      link,
      actorId,
      metadata
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Notification creation failed:', error);
    return null;
  }
};

/**
 * Efficiently insert multiple notifications at once.
 */
const createBulkNotifications = async (userIds, payload) => {
  try {
    if (!userIds || userIds.length === 0) return [];

    const notifications = userIds.map(userId => ({
      userId,
      ...payload,
      createdAt: new Date()
    }));

    const result = await Notification.insertMany(notifications);
    return result;
  } catch (error) {
    console.error('Bulk notification creation failed:', error);
    return [];
  }
};

module.exports = {
  createNotification,
  createBulkNotifications,
  buildNotificationText
};
