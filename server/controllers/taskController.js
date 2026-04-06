const Task = require('../models/Task');
const DailyHistory = require('../models/DailyHistory');
const { createNotification } = require('../services/notify');
const { logActivity } = require('../services/activity');

// Get all tasks with filtering, sorting, pagination
exports.getTasks = async (req, res) => {
    try {
        const { status, priority, category, search, sortBy, order, page, limit } = req.query;

        // FILTER BY WORKSPACE ID
        const query = { workspaceId: req.workspaceId };

        // Exclude recurring templates unless explicitly requested
        if (req.query.includeTemplates !== 'true') {
            query.isTemplate = { $ne: true };
        }

        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (category) query.category = category;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const sortOptions = {};
        sortOptions[sortBy || 'createdAt'] = order === 'asc' ? 1 : -1;

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const skip = (pageNum - 1) * limitNum;

        const [tasks, total] = await Promise.all([
            Task.find(query).sort(sortOptions).skip(skip).limit(limitNum),
            Task.countDocuments(query)
        ]);

        res.json({
            tasks,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get today's tasks
exports.getTodayTasks = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const tasks = await Task.find({
            workspaceId: req.workspaceId,
            $or: [
                { createdAt: { $gte: today, $lt: tomorrow } },
                { dueDate: { $gte: today, $lt: tomorrow } }
            ]
        }).sort({ priority: -1, createdAt: -1 });

        res.json({ tasks });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Create task
exports.createTask = async (req, res) => {
    try {
        const { title, description, status, priority, category, dueDate, isDaily } = req.body;

        if (!title) {
            return res.status(400).json({ message: 'Task title is required' });
        }

        const task = await Task.create({
            title,
            description: description || '',
            status: status || 'NOT_STARTED',
            priority: priority || 'MEDIUM',
            category: category || 'General',
            dueDate: dueDate || null,
            isDaily: isDaily !== undefined ? isDaily : false,
            userId: req.userId,
            assigneeId: req.body.assigneeId || null,
            workspaceId: req.workspaceId
        });

        // Notify assignee if assigned to someone else
        if (task.assigneeId && task.assigneeId.toString() !== req.userId) {
            await createNotification(task.assigneeId, {
                type: 'task_assigned',
                actorId: req.userId,
                link: `/tasks?id=${task._id}`,
                metadata: {
                    taskTitle: task.title,
                    workspaceName: req.workspace?.name
                }
            });
        }

        // Log activity
        logActivity(
          req.workspaceId, req.userId, 'task_created',
          `${req.user.name} created '${task.title}'`,
          `/tasks?id=${task._id}`,
          { taskId: task._id }
        );

        res.status(201).json({ task });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// Update task
exports.updateTask = async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, workspaceId: req.workspaceId });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const allowedUpdates = ['title', 'description', 'status', 'priority', 'category', 'dueDate', 'isDaily'];
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                task[field] = req.body[field];
            }
        });

        await task.save();
        res.json({ task });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// Update task status
exports.updateTaskStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const task = await Task.findOne({ _id: req.params.id, workspaceId: req.workspaceId });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        task.status = status;
        await task.save();

        // Log activity when task is completed
        if (status === 'COMPLETED') {
          logActivity(
            req.workspaceId, req.userId, 'task_completed',
            `${req.user.name} completed '${task.title}'`,
            `/tasks?id=${task._id}`,
            { taskId: task._id }
          );
        }

        res.json({ task });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete task
exports.deleteTask = async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, workspaceId: req.workspaceId });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get categories
exports.getCategories = async (req, res) => {
    try {
        const categories = await Task.distinct('category', { workspaceId: req.workspaceId });
        res.json({ categories });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get daily task history
exports.getDailyHistory = async (req, res) => {
    try {
        const { days } = req.query;
        const daysNum = parseInt(days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysNum);
        startDate.setHours(0, 0, 0, 0);

        const history = await DailyHistory.find({
            workspaceId: req.workspaceId,
            date: { $gte: startDate }
        }).sort({ date: -1 });

        // Group by date
        const grouped = {};
        history.forEach(h => {
            const dateKey = h.date.toISOString().split('T')[0];
            if (!grouped[dateKey]) grouped[dateKey] = { date: dateKey, tasks: [], completed: 0, total: 0 };
            grouped[dateKey].tasks.push(h);
            grouped[dateKey].total++;
            if (h.wasCompleted) grouped[dateKey].completed++;
        });

        res.json({
            history: Object.values(grouped),
            totalDays: Object.keys(grouped).length
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
