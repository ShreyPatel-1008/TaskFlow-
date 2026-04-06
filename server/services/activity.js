const Activity = require('../models/Activity');

/**
 * Log an activity event for the workspace feed.
 * Never throws — silently catches errors so main request isn't affected.
 *
 * @param {ObjectId} workspaceId
 * @param {ObjectId} actorId
 * @param {string} type - One of: task_created, task_completed, task_assigned, comment_added, member_joined, task_overdue
 * @param {string} text - Human-readable description e.g. "Priya completed 'Fix login bug'"
 * @param {string} [link] - Frontend route e.g. /tasks?id=abc123
 * @param {object} [metadata] - Extra context (taskId, commentId, etc.)
 */
const logActivity = async (workspaceId, actorId, type, text, link = null, metadata = {}) => {
  try {
    if (!workspaceId || !actorId || !type || !text) return null;

    const activity = await Activity.create({
      workspaceId,
      actorId,
      type,
      text,
      link,
      metadata
    });

    return activity;
  } catch (error) {
    console.error('[Activity] Failed to log activity:', error.message);
    return null;
  }
};

module.exports = { logActivity };
