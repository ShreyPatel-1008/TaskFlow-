const cron = require('node-cron');
const Task = require('../models/Task');
const { createNotification } = require('../services/notify');

/**
 * Runs every day at 8:00 AM (0 8 * * *)
 */
const startOverdueChecker = () => {
  cron.schedule('0 8 * * *', async () => {
    console.log('[Job] Starting overdue task checker...');
    try {
      const today = new Date();
      today.setHours(0,0,0,0);

      // Find all tasks that are overdue, not done, and weren't notified today
      const overdueTasks = await Task.find({
        dueDate: { $lt: today },
        status: { $ne: 'done' },
        assigneeId: { $ne: null },
        $or: [
          { lastOverdueNotifiedAt: null },
          { lastOverdueNotifiedAt: { $lt: today } }
        ]
      }).populate('workspaceId', 'name');

      console.log(`[Job] Found ${overdueTasks.length} overdue tasks to notify.`);

      let sentCount = 0;
      for (const task of overdueTasks) {
        await createNotification(task.assigneeId, {
          type: 'task_overdue',
          text: `Task '${task.title}' is overdue`,
          link: `/tasks?id=${task._id}`,
          metadata: { 
            taskTitle: task.title, 
            workspaceName: task.workspaceId?.name 
          }
        });
        
        task.lastOverdueNotifiedAt = new Date();
        await task.save();
        sentCount++;
      }

      console.log(`[Job] Overdue checker finished. ${sentCount} notifications sent.`);
    } catch (error) {
      console.error('[Job] Overdue checker failed:', error);
    }
  });
};

module.exports = { startOverdueChecker };
