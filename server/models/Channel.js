const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Channel name is required'],
        lowercase: true,
        trim: true,
        maxlength: [30, 'Channel name cannot exceed 30 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [200, 'Description cannot exceed 200 characters'],
        default: ''
    },
    type: {
        type: String,
        enum: ['channel', 'direct'],
        default: 'channel'
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
channelSchema.index({ workspaceId: 1, name: 1, type: 1 }, { unique: true });
channelSchema.index({ members: 1 });

module.exports = mongoose.model('Channel', channelSchema);
