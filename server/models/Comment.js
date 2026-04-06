const mongoose = require('mongoose');

/**
 * Comment model — soft-delete only.
 *
 * We never hard-delete comments so thread numbering and mention
 * history stay intact. Soft-deleted comments have deleted=true
 * and their text is wiped to an empty string.
 *
 * workspaceId is denormalized from the parent Task to allow fast
 * workspace-scoped queries without joining through Task.
 */
const commentSchema = new mongoose.Schema({
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true,
        index: true
    },
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
        required: true
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: [2000, 'Comment cannot exceed 2000 characters']
    },
    mentions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    edited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date,
        default: null
    },
    deleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Compound index for paginated thread fetch (oldest first)
commentSchema.index({ taskId: 1, createdAt: 1 });
// Secondary sort tiebreaker for comments at the exact same millisecond
commentSchema.index({ taskId: 1, createdAt: 1, _id: 1 });

module.exports = mongoose.model('Comment', commentSchema);
