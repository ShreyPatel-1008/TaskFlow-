const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :taskId from parent
const Comment = require('../models/Comment');
const Task = require('../models/Task');
const requireRole = require('../middleware/requireRole');
const { extractMentionHandles, resolveMentions } = require('../utils/mentionParser');
const { createNotification, createBulkNotifications } = require('../services/notify');
const { logActivity } = require('../services/activity');

/**
 * All routes below are mounted at /api/tasks/:taskId/comments
 * Auth + attachWorkspace are already applied at the router level in server.js.
 */

// @route   GET /api/tasks/:taskId/comments
// @desc    Fetch paginated comment thread for a task
// @access  Viewer+ (anyone in the workspace can read comments)
router.get('/', requireRole('viewer'), async (req, res) => {
    try {
        const { taskId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const [comments, totalCount] = await Promise.all([
            Comment.find({ taskId })
                .sort({ createdAt: 1, _id: 1 }) // Oldest first, tiebreak by _id
                .skip(skip)
                .limit(limit)
                .populate('authorId', '_id name avatar')
                .lean(),
            Comment.countDocuments({ taskId })
        ]);

        // Mask soft-deleted comments: keep the doc but wipe text
        const masked = comments.map(c => {
            if (c.deleted) {
                return { ...c, text: null, mentions: [] };
            }
            return c;
        });

        res.json({
            comments: masked,
            totalCount,
            hasMore: skip + comments.length < totalCount
        });
    } catch (error) {
        console.error('GET comments error:', error);
        res.status(500).json({ message: 'Failed to load comments' });
    }
});

// @route   POST /api/tasks/:taskId/comments
// @desc    Add a comment to a task
// @access  Member+ (viewers cannot comment)
router.post('/', requireRole('member'), async (req, res) => {
    try {
        const { taskId } = req.params;
        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ message: 'Comment text is required' });
        }

        // Verify task exists in this workspace
        const task = await Task.findOne({ _id: taskId, workspaceId: req.workspaceId });
        if (!task) {
            return res.status(404).json({ message: 'Task not found in this workspace' });
        }

        // Resolve @mentions
        const handles = extractMentionHandles(text);
        const mentionIds = await resolveMentions(handles, req.workspaceId);

        const comment = await Comment.create({
            taskId,
            workspaceId: req.workspaceId,
            authorId: req.user._id,
            text: text.trim(),
            mentions: mentionIds
        });

        // Populate author for the response
        const populated = await Comment.findById(comment._id)
            .populate('authorId', '_id name avatar');

        // --- NOTIFICATIONS ---
        // 1. Notify mentioned users (skip self)
        const otherMentions = mentionIds.filter(id => id.toString() !== req.user._id.toString());
        if (otherMentions.length > 0) {
            await createBulkNotifications(otherMentions, {
                type: 'mentioned',
                actorId: req.user._id,
                link: `/tasks?id=${taskId}`,
                metadata: {
                    taskTitle: task.title,
                    workspaceName: req.workspace?.name
                }
            });
        }

        // 2. Notify task assignee (if not self and not already mentioned)
        if (task.assigneeId && 
            task.assigneeId.toString() !== req.user._id.toString() && 
            !mentionIds.some(id => id.toString() === task.assigneeId.toString())) {
            
            await createNotification(task.assigneeId, {
                type: 'comment_added',
                actorId: req.user._id,
                link: `/tasks?id=${taskId}`,
                metadata: {
                    taskTitle: task.title,
                    workspaceName: req.workspace?.name
                }
            });
        }

        // Log activity
        logActivity(
            req.workspaceId, req.user._id, 'comment_added',
            `${req.user.name} commented on '${task.title}'`,
            `/tasks?id=${taskId}`,
            { taskId, commentId: comment._id }
        );

        res.status(201).json(populated);
    } catch (error) {
        console.error('POST comment error:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Failed to add comment' });
    }
});

// @route   PATCH /api/tasks/:taskId/comments/:commentId
// @desc    Edit a comment (original author only)
// @access  Member+ & must be the author
router.patch('/:commentId', requireRole('member'), async (req, res) => {
    try {
        const { commentId } = req.params;
        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ message: 'Comment text is required' });
        }

        const comment = await Comment.findById(commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });
        if (comment.deleted) return res.status(400).json({ message: 'Cannot edit a deleted comment' });

        // Only the original author can edit
        if (comment.authorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the comment author can edit this' });
        }

        // Diff mentions: find newly added mentions to avoid re-notifying
        const oldMentionSet = new Set(comment.mentions.map(id => id.toString()));
        const newHandles = extractMentionHandles(text);
        const newMentionIds = await resolveMentions(newHandles, req.workspaceId);
        const newlyAdded = newMentionIds.filter(id => !oldMentionSet.has(id));

        comment.text = text.trim();
        comment.edited = true;
        comment.editedAt = new Date();
        comment.mentions = newMentionIds;
        await comment.save();

        const populated = await Comment.findById(commentId)
            .populate('authorId', '_id name avatar');

        // Notify newly added mentions
        const otherNewMentions = newlyAdded.filter(id => id.toString() !== req.user._id.toString());
        if (otherNewMentions.length > 0) {
            // Re-fetch task for metadata
            const task = await Task.findById(taskId);
            await createBulkNotifications(otherNewMentions, {
                type: 'mentioned',
                actorId: req.user._id,
                link: `/tasks?id=${taskId}`,
                metadata: {
                    taskTitle: task?.title || 'Unknown Task',
                    workspaceName: req.workspace?.name
                }
            });
        }

        res.json(populated);
    } catch (error) {
        console.error('PATCH comment error:', error);
        res.status(500).json({ message: 'Failed to edit comment' });
    }
});

// @route   DELETE /api/tasks/:taskId/comments/:commentId
// @desc    Soft-delete a comment (author or workspace admin)
// @access  Member+ (author) or Admin
router.delete('/:commentId', requireRole('member'), async (req, res) => {
    try {
        const { commentId } = req.params;
        const comment = await Comment.findById(commentId);

        if (!comment) return res.status(404).json({ message: 'Comment not found' });
        if (comment.deleted) return res.status(400).json({ message: 'Comment already deleted' });

        // Author or workspace admin can soft-delete
        const isAuthor = comment.authorId.toString() === req.user._id.toString();
        const isAdmin = req.workspaceRole === 'admin';

        if (!isAuthor && !isAdmin) {
            return res.status(403).json({ message: 'Only the author or a workspace admin can delete this comment' });
        }

        // Soft delete — wipe text, keep the document
        comment.deleted = true;
        comment.text = '';
        await comment.save();

        res.json({ success: true });
    } catch (error) {
        console.error('DELETE comment error:', error);
        res.status(500).json({ message: 'Failed to delete comment' });
    }
});

module.exports = router;
