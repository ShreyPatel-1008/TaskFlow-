const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    title: {
        type: String,
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters'],
        default: ''
    },
    content: {
        type: String,
        required: [true, 'Note content is required'],
        trim: true,
        maxlength: [5000, 'Content cannot exceed 5000 characters']
    },
    color: {
        type: String,
        enum: ['yellow', 'green', 'blue', 'purple', 'pink', 'orange', 'red', 'teal'],
        default: 'yellow'
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
        default: null,
        index: true
    }
}, {
    timestamps: true
});

noteSchema.index({ userId: 1, workspaceId: 1 });
noteSchema.index({ workspaceId: 1, updatedAt: -1 });
noteSchema.index({ userId: 1, isPinned: -1, updatedAt: -1 });

module.exports = mongoose.model('Note', noteSchema);
