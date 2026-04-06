const express = require('express');
const router = express.Router();
const requireRole = require('../middleware/requireRole');
const Task = require('../models/Task');
const { createNotification } = require('../services/notify');
const { logActivity } = require('../services/activity');
const { calculateNextRun } = require('../jobs/recurringTasks');
const CustomField = require('../models/CustomField');
const {
    getTasks,
    getTodayTasks,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    getCategories,
    getDailyHistory
} = require('../controllers/taskController');
const {
    startTimer,
    stopTimer,
    getTimeEntries,
    getRunningTimers
} = require('../controllers/timeController');

// NOTE: `auth` and `attachWorkspace` are applied at the router level
// in server.js, so req.user, req.workspaceId, req.workspaceRole
// are already present by the time these handlers run.

// --- Read routes — viewer and above can read ---
router.get('/',              requireRole('viewer'), getTasks);
router.get('/today',         requireRole('viewer'), getTodayTasks);
router.get('/categories',    requireRole('viewer'), getCategories);
router.get('/daily-history', requireRole('viewer'), getDailyHistory);

// --- Write routes — member and above can create/edit/delete ---
router.post('/',             requireRole('member'), createTask);
router.put('/:id',           requireRole('member'), updateTask);

// @route   PATCH /api/tasks/:id
// @desc    Update task details (including assignment)
router.patch('/:id', requireRole('member'), async (req, res) => {
    try {
        const { assigneeId, ...otherUpdates } = req.body;
        const oldTask = await Task.findById(req.params.id);
        
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            { ...otherUpdates, assigneeId },
            { new: true }
        ).populate('assigneeId', 'name email avatar');

        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Notify new assignee if changed and not themselves
        if (assigneeId && assigneeId !== req.user._id.toString() && 
            (!oldTask.assigneeId || oldTask.assigneeId.toString() !== assigneeId)) {
            
            await createNotification(assigneeId, {
                type: 'task_assigned',
                actorId: req.user._id,
                link: `/tasks?id=${task._id}`,
                metadata: { 
                    taskTitle: task.title,
                    workspaceName: req.workspace?.name
                }
            });
        }

        // Log activity
        if (assigneeId && (!oldTask.assigneeId || oldTask.assigneeId.toString() !== assigneeId)) {
            const assigneeName = task.assigneeId?.name || 'someone';
            logActivity(
                req.workspaceId, req.user._id, 'task_assigned',
                `${req.user.name} assigned '${task.title}' to ${assigneeName}`,
                `/tasks?id=${task._id}`,
                { taskId: task._id, assigneeId }
            );
        }

        res.json(task);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.patch('/:id/status',  requireRole('member'), updateTaskStatus);
router.delete('/:id',        requireRole('member'), deleteTask);

// --- Timer routes — member and above can track time ---
router.post('/:id/timer/start', requireRole('member'), startTimer);
router.post('/:id/timer/stop',  requireRole('member'), stopTimer);
router.get('/:id/time',         requireRole('viewer'), getTimeEntries);
router.get('/timers/running',   requireRole('viewer'), getRunningTimers);

// --- Recurrence routes ---
// PATCH /api/tasks/:id/recurrence — set recurrence
router.patch('/:id/recurrence', requireRole('member'), async (req, res) => {
    try {
        const { frequency, interval, daysOfWeek, dayOfMonth } = req.body;
        const task = await Task.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        task.recurrence = {
            enabled: true,
            frequency,
            interval: interval || 1,
            daysOfWeek: frequency === 'weekly' ? (daysOfWeek || []) : [],
            dayOfMonth: frequency === 'monthly' ? (dayOfMonth || 1) : null,
            nextRunAt: null,
            lastRunAt: null,
            parentTaskId: null
        };

        // Calculate first nextRunAt
        task.recurrence.nextRunAt = calculateNextRun(task, new Date());
        task.isTemplate = true;
        await task.save();

        res.json(task);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/tasks/:id/recurrence — disable recurrence
router.delete('/:id/recurrence', requireRole('member'), async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        task.recurrence.enabled = false;
        task.isTemplate = false;
        await task.save();

        res.json(task);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Custom field values on tasks ---
// PATCH /api/tasks/:id/custom-fields
router.patch('/:id/custom-fields', requireRole('member'), async (req, res) => {
    try {
        const { fields } = req.body;
        if (!Array.isArray(fields)) {
            return res.status(400).json({ message: 'fields must be an array' });
        }

        const fieldDefs = await CustomField.find({ workspaceId: req.workspaceId, deleted: false });
        const fieldMap = new Map(fieldDefs.map(f => [f._id.toString(), f]));

        for (const { fieldId, value } of fields) {
            const def = fieldMap.get(fieldId);
            if (!def) continue;
            if (def.type === 'number' && value !== null && typeof value !== 'number') {
                return res.status(400).json({ message: `Field "${def.name}" expects a number` });
            }
            if (def.type === 'select' && value !== null && !def.options.includes(value)) {
                return res.status(400).json({ message: `Invalid option for "${def.name}"` });
            }
        }

        const task = await Task.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const existing = new Map((task.customFields || []).map(cf => [cf.fieldId?.toString(), cf]));
        for (const v of fields) {
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
