const Task = require('../models/Task');
const TimeEntry = require('../models/TimeEntry');
const DailyHistory = require('../models/DailyHistory');
const mongoose = require('mongoose');

// Dashboard stats
exports.getDashboardStats = async (req, res) => {
    try {
        const workspaceId = req.workspaceId;

        const [total, completed, inProgress, notStarted] = await Promise.all([
            Task.countDocuments({ workspaceId }),
            Task.countDocuments({ workspaceId, status: 'COMPLETED' }),
            Task.countDocuments({ workspaceId, status: 'IN_PROGRESS' }),
            Task.countDocuments({ workspaceId, status: 'NOT_STARTED' })
        ]);

        const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayCompleted = await Task.countDocuments({
            workspaceId,
            status: 'COMPLETED',
            completedAt: { $gte: today, $lt: tomorrow }
        });

        // Category distribution
        const categoryDistribution = await Task.aggregate([
            { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId) } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Priority distribution
        const priorityDistribution = await Task.aggregate([
            { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId) } },
            { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]);

        res.json({
            total,
            completed,
            inProgress,
            notStarted,
            completionPercentage,
            todayCompleted,
            categoryDistribution,
            priorityDistribution
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Weekly analytics
exports.getWeeklyAnalytics = async (req, res) => {
    try {
        const workspaceId = req.workspaceId;
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyData = [];

        // Get daily history for this week for the workspace
        const historyRecords = await DailyHistory.find({
            workspaceId,
            date: { $gte: startOfWeek }
        });

        // Group history by date
        const historyByDate = {};
        historyRecords.forEach(h => {
            const dateKey = h.date.toISOString().split('T')[0];
            if (!historyByDate[dateKey]) historyByDate[dateKey] = { total: 0, completed: 0 };
            historyByDate[dateKey].total++;
            if (h.wasCompleted) historyByDate[dateKey].completed++;
        });

        // Total daily tasks in the workspace
        const totalDailyTasks = await Task.countDocuments({ workspaceId, isDaily: true });

        for (let i = 0; i < 7; i++) {
            const dayStart = new Date(startOfWeek);
            dayStart.setDate(startOfWeek.getDate() + i);
            const dateStr = dayStart.toISOString().split('T')[0];

            let totalForDay, completedForDay;

            if (dateStr === todayStr) {
                totalForDay = totalDailyTasks;
                completedForDay = await Task.countDocuments({
                    workspaceId, isDaily: true, status: 'COMPLETED'
                });
            } else if (dayStart < today) {
                const dayHistory = historyByDate[dateStr];
                totalForDay = dayHistory ? dayHistory.total : 0;
                completedForDay = dayHistory ? dayHistory.completed : 0;
            } else {
                totalForDay = 0;
                completedForDay = 0;
            }

            weeklyData.push({
                day: days[i],
                date: dateStr,
                completed: completedForDay,
                total: totalForDay
            });
        }

        const weekCompleted = weeklyData.reduce((sum, d) => sum + d.completed, 0);
        const weekTotal = weeklyData.reduce((sum, d) => sum + d.total, 0);
        const productivityScore = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;

        const timeEntries = await TimeEntry.aggregate([
            {
                $match: {
                    workspaceId: new mongoose.Types.ObjectId(workspaceId),
                    startTime: { $gte: startOfWeek },
                    isRunning: false
                }
            },
            { $group: { _id: null, totalDuration: { $sum: '$duration' } } }
        ]);

        const focusHours = timeEntries.length > 0
            ? Math.round((timeEntries[0].totalDuration / 3600) * 10) / 10
            : 0;

        res.json({
            weeklyData,
            productivityScore,
            focusHours,
            weekCompleted,
            weekTotal
        });
    } catch (error) {
        console.error('Weekly analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Monthly analytics
exports.getMonthlyAnalytics = async (req, res) => {
    try {
        const workspaceId = req.workspaceId;
        const now = new Date();
        const year = parseInt(req.query.year) || now.getFullYear();
        const month = parseInt(req.query.month) || now.getMonth();

        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
        const daysInMonth = endOfMonth.getDate();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const historyRecords = await DailyHistory.find({
            workspaceId,
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const historyByDate = {};
        historyRecords.forEach(h => {
            const dateKey = h.date.toISOString().split('T')[0];
            if (!historyByDate[dateKey]) historyByDate[dateKey] = { total: 0, completed: 0 };
            historyByDate[dateKey].total++;
            if (h.wasCompleted) historyByDate[dateKey].completed++;
        });

        const totalDailyTasks = await Task.countDocuments({ workspaceId, isDaily: true });
        const monthlyData = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const dayStart = new Date(year, month, day);
            const dateStr = dayStart.toISOString().split('T')[0];

            let totalForDay, completedForDay;

            if (dateStr === todayStr) {
                totalForDay = totalDailyTasks;
                completedForDay = await Task.countDocuments({
                    workspaceId, isDaily: true, status: 'COMPLETED'
                });
            } else if (dayStart < today) {
                const dayHistory = historyByDate[dateStr];
                totalForDay = dayHistory ? dayHistory.total : 0;
                completedForDay = dayHistory ? dayHistory.completed : 0;
            } else {
                totalForDay = 0;
                completedForDay = 0;
            }

            monthlyData.push({
                day,
                date: dateStr,
                completed: completedForDay,
                total: totalForDay
            });
        }

        const statusDistribution = await Task.aggregate([
            { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId) } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const monthCompleted = monthlyData.reduce((sum, d) => sum + d.completed, 0);
        const monthTotal = monthlyData.reduce((sum, d) => sum + d.total, 0);

        res.json({
            monthlyData,
            statusDistribution,
            monthCompleted,
            monthTotal,
            productivityScore: monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Heatmap data
exports.getHeatmapData = async (req, res) => {
    try {
        const workspaceId = req.workspaceId;
        const now = new Date();
        const startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);

        const completedTasks = await Task.aggregate([
            {
                $match: {
                    workspaceId: new mongoose.Types.ObjectId(workspaceId),
                    completedAt: { $gte: startDate, $lte: now }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        const heatmapData = {};
        completedTasks.forEach(item => { heatmapData[item._id] = item.count; });

        res.json({ heatmapData, startDate: startDate.toISOString(), endDate: now.toISOString() });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Streak
exports.getStreak = async (req, res) => {
    try {
        const workspaceId = req.workspaceId;
        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        const todayEnd = new Date(currentDate);
        todayEnd.setDate(todayEnd.getDate() + 1);

        const todayCount = await Task.countDocuments({
            workspaceId,
            completedAt: { $gte: currentDate, $lt: todayEnd }
        });

        if (todayCount === 0) currentDate.setDate(currentDate.getDate() - 1);
        else { streak = 1; currentDate.setDate(currentDate.getDate() - 1); }

        for (let i = 0; i < 365; i++) {
            const dayStart = new Date(currentDate);
            const dayEnd = new Date(currentDate);
            dayEnd.setDate(dayEnd.getDate() + 1);

            const count = await Task.countDocuments({
                workspaceId,
                completedAt: { $gte: dayStart, $lt: dayEnd }
            });

            if (count > 0) { streak++; currentDate.setDate(currentDate.getDate() - 1); }
            else break;
        }

        res.json({ currentStreak: streak, todayCompleted: todayCount });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Smart insights
exports.getInsights = async (req, res) => {
    try {
        const workspaceId = req.workspaceId;
        const insights = [];
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);

        const weeklyCompletion = await Task.aggregate([
            {
                $match: {
                    workspaceId: new mongoose.Types.ObjectId(workspaceId),
                    completedAt: { $gte: startOfWeek }
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: '$completedAt' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        if (weeklyCompletion.length > 0) {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            insights.push({
                type: 'productive_day',
                icon: '📅',
                message: `The workspace is most productive on ${dayNames[weeklyCompletion[0]._id - 1]}s`
            });
        }

        // Overdue tasks
        const overdueTasks = await Task.countDocuments({
            workspaceId,
            status: { $ne: 'COMPLETED' },
            dueDate: { $lt: now }
        });

        if (overdueTasks > 0) {
            insights.push({
                type: 'overdue',
                icon: '⚠️',
                message: `Workspace has ${overdueTasks} overdue tasks`
            });
        }

        res.json({ insights });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
