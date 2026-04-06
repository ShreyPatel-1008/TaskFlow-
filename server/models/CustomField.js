const mongoose = require('mongoose');

const CustomFieldSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  type: {
    type: String,
    enum: ['text', 'number', 'select', 'date', 'checkbox'],
    required: true
  },
  options: {
    type: [String],
    default: []
  },
  defaultValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  required: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index for sorted field fetching
CustomFieldSchema.index({ workspaceId: 1, order: 1 });
// Unique name within workspace (case-insensitive)
CustomFieldSchema.index(
  { workspaceId: 1, name: 1 },
  { unique: true, partialFilterExpression: { deleted: false } }
);

module.exports = mongoose.model('CustomField', CustomFieldSchema);
