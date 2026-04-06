const cron = require('node-cron');
const Task = require('../models/Task');
const DailyHistory = require('../models/DailyHistory');

/**
 * Perform the daily reset PER USER:
 * 1. Save current status of each user's daily tasks to DailyHistory
 * 2. Reset only THAT user's daily tasks to NOT_STARTED
 *
 * NOTE: Only tasks where isDaily=true are reset. Regular tasks (isDaily=false)
 * are NEVER touched — they persist permanently in the database.
 */
const performDailyReset = async (dateForHistory) => {
    const dailyTasks = await Task.find({ isDaily: true });

    if (dailyTasks.length === 0) {
        console.log('🔄 [RESET] No daily tasks found. Nothing to reset.');
        return;
    }

    // Group tasks by userId so we process each user independently
    const tasksByUser = {};
    dailyTasks.forEach(task => {
        const uid = task.userId.toString();
        if (!tasksByUser[uid]) tasksByUser[uid] = [];
        tasksByUser[uid].push(task);
    });

    let totalHistorySaved = 0;
    let totalReset = 0;

    for (const [uid, tasks] of Object.entries(tasksByUser)) {
        // Save history records for this user
        const historyRecords = tasks.map(task => ({
            taskId: task._id,
            userId: task.userId,
            taskTitle: task.title,
            category: task.category,
            status: task.status,
            wasCompleted: task.status === 'COMPLETED',
            date: dateForHistory
        }));

        await DailyHistory.insertMany(historyRecords);
        totalHistorySaved += historyRecords.length;

        // Reset ONLY this user's daily tasks by their exact _ids
        const taskIds = tasks.map(t => t._id);
        const result = await Task.updateMany(
            { _id: { $in: taskIds }, isDaily: true },
            { $set: { status: 'NOT_STARTED', completedAt: null } }
        );
        totalReset += result.modifiedCount;
    }

    console.log(`📝 [RESET] Saved ${totalHistorySaved} history records for ${dateForHistory.toDateString()}`);
    console.log(`✅ [RESET] Reset ${totalReset} daily tasks to NOT_STARTED`);
};

/**
 * Check if a daily reset was missed (e.g., server was off at 4 AM).
 * Runs on server startup.
 *
 * IMPORTANT: Only triggers if there are daily tasks AND no history exists
 * for yesterday. This prevents false resets on a fresh server start.
 */
const checkMissedReset = async () => {
    try {
        console.log('🔍 [STARTUP] Checking for missed daily reset...');

        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        // Only run if there are actually daily tasks in the DB
        const hasDailyTasks = await Task.exists({ isDaily: true });
        if (!hasDailyTasks) {
            console.log('✅ [STARTUP] No daily tasks exist. Skipping reset check.');
            return;
        }

        // Check if history for yesterday already exists
        const existingHistory = await DailyHistory.findOne({
            date: { $gte: yesterday, $lt: todayStart }
        });

        if (!existingHistory) {
            console.log('⚠️ [STARTUP] Missed daily reset detected! Running reset now...');
            await performDailyReset(yesterday);
            console.log('✅ [STARTUP] Missed reset completed successfully!');
        } else {
            console.log('✅ [STARTUP] Daily reset already ran. No action needed.');
        }
    } catch (error) {
        console.error('❌ [STARTUP] Missed reset check failed:', error.message);
    }
};

/**
 * Daily Task Reset Cron Job — runs every day at 4:00 AM IST.
 */
const initDailyResetCron = () => {
    cron.schedule('0 4 * * *', async () => {
        console.log('🔄 [CRON] Daily task reset started at', new Date().toISOString());
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            await performDailyReset(yesterday);
            console.log('🔄 [CRON] Daily reset complete!');
        } catch (error) {
            console.error('❌ [CRON] Daily reset failed:', error.message);
        }
    }, {
        timezone: 'Asia/Kolkata'
    });

    console.log('⏰ Daily task reset scheduled: Every day at 4:00 AM IST');
};

module.exports = { initDailyResetCron, checkMissedReset };
