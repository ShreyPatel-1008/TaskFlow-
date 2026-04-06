const express = require('express');
const router = express.Router({ mergeParams: true });
const CustomField = require('../models/CustomField');
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const attachWorkspace = require('../middleware/attachWorkspace');
const requireRole = require('../middleware/requireRole');

// GET /api/workspaces/:id/custom-fields
router.get('/', auth, attachWorkspace, requireRole('viewer'), async (req, res) => {
  try {
    const fields = await CustomField.find({
      workspaceId: req.workspaceId,
      deleted: false
    }).sort({ order: 1 });
    res.json(fields);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/workspaces/:id/custom-fields
router.post('/', auth, attachWorkspace, requireRole('admin'), async (req, res) => {
  try {
    const { name, type, options, defaultValue, required: isRequired, order } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required' });
    }

    // Max 20 fields per workspace
    const count = await CustomField.countDocuments({ workspaceId: req.workspaceId, deleted: false });
    if (count >= 20) {
      return res.status(400).json({ message: 'Maximum 20 custom fields per workspace' });
    }

    // Select type must have at least 2 options
    if (type === 'select' && (!options || options.length < 2)) {
      return res.status(400).json({ message: 'Select fields must have at least 2 options' });
    }

    const field = await CustomField.create({
      workspaceId: req.workspaceId,
      name: name.trim(),
      type,
      options: type === 'select' ? options : [],
      defaultValue: defaultValue || null,
      required: isRequired || false,
      order: order != null ? order : count,
      createdBy: req.user._id
    });

    res.status(201).json(field);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A field with this name already exists in this workspace' });
    }
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/workspaces/:id/custom-fields/:fieldId
router.patch('/:fieldId', auth, attachWorkspace, requireRole('admin'), async (req, res) => {
  try {
    const { name, options, defaultValue, order, required: isRequired } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name.trim();
    if (options !== undefined) updates.options = options;
    if (defaultValue !== undefined) updates.defaultValue = defaultValue;
    if (order !== undefined) updates.order = order;
    if (isRequired !== undefined) updates.required = isRequired;

    const field = await CustomField.findOneAndUpdate(
      { _id: req.params.fieldId, workspaceId: req.workspaceId, deleted: false },
      { $set: updates },
      { new: true }
    );

    if (!field) return res.status(404).json({ message: 'Field not found' });
    res.json(field);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A field with this name already exists' });
    }
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/workspaces/:id/custom-fields/:fieldId
router.delete('/:fieldId', auth, attachWorkspace, requireRole('admin'), async (req, res) => {
  try {
    const field = await CustomField.findOneAndUpdate(
      { _id: req.params.fieldId, workspaceId: req.workspaceId, deleted: false },
      { $set: { deleted: true } },
      { new: true }
    );

    if (!field) return res.status(404).json({ message: 'Field not found' });

    // Remove field values from all tasks
    const result = await Task.updateMany(
      { workspaceId: req.workspaceId },
      { $pull: { customFields: { fieldId: req.params.fieldId } } }
    );

    res.json({
      message: 'Field deleted',
      affectedTasks: result.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/tasks/:id/custom-fields — update task custom field values
// This is mounted differently in server.js
router.patch('/task/:taskId/fields', auth, attachWorkspace, requireRole('member'), async (req, res) => {
  try {
    const { fields } = req.body; // Array of { fieldId, value }
    if (!Array.isArray(fields)) {
      return res.status(400).json({ message: 'fields must be an array' });
    }

    // Validate each field
    const fieldDefs = await CustomField.find({
      workspaceId: req.workspaceId,
      deleted: false
    });
    const fieldMap = new Map(fieldDefs.map(f => [f._id.toString(), f]));

    const validated = [];
    for (const { fieldId, value } of fields) {
      const def = fieldMap.get(fieldId);
      if (!def) continue;

      // Type validation
      if (def.type === 'number' && value !== null && typeof value !== 'number') {
        return res.status(400).json({ message: `Field "${def.name}" expects a number` });
      }
      if (def.type === 'select' && value !== null && !def.options.includes(value)) {
        return res.status(400).json({ message: `"${value}" is not a valid option for "${def.name}"` });
      }
      if (def.type === 'checkbox' && value !== null && typeof value !== 'boolean') {
        return res.status(400).json({ message: `Field "${def.name}" expects a boolean` });
      }

      validated.push({ fieldId, value });
    }

    const task = await Task.findOne({ _id: req.params.taskId, workspaceId: req.workspaceId });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Merge: update existing, add new
    const existing = new Map((task.customFields || []).map(cf => [cf.fieldId.toString(), cf]));
    for (const v of validated) {
      existing.set(v.fieldId, v);
    }
    task.customFields = Array.from(existing.values());
    await task.save();

    res.json(task.customFields);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
