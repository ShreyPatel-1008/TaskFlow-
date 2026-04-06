const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'task_created',
      'task_completed',
      'task_assigned',
      'comment_added',
      'member_joined',
      'task_overdue'
    ],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  link: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: -1
  }
}, {
  timestamps: false // We manage createdAt manually, no updatedAt needed
});

// Compound index for fast workspace feed queries
ActivitySchema.index({ workspaceId: 1, createdAt: -1 });

// TTL index: auto-delete activity older than 30 days
ActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('Activity', ActivitySchema);
