const cron = require('node-cron');
const Task = require('../models/Task');
const { logActivity } = require('../services/activity');
const { createNotification } = require('../services/notify');

/**
 * Calculate the next run date based on recurrence settings.
 */
function calculateNextRun(task, fromDate = new Date()) {
  const { frequency, interval, daysOfWeek, dayOfMonth } = task.recurrence;
  const next = new Date(fromDate);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;

    case 'weekly':
      if (daysOfWeek && daysOfWeek.length > 0) {
        // Find the next matching day of week
        let found = false;
        for (let i = 1; i <= 7 * interval; i++) {
          const check = new Date(next);
          check.setDate(check.getDate() + i);
          if (daysOfWeek.includes(check.getDay())) {
            next.setTime(check.getTime());
            found = true;
            break;
          }
        }
        if (!found) next.setDate(next.getDate() + 7 * interval);
      } else {
        next.setDate(next.getDate() + 7 * interval);
      }
      break;

    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      if (dayOfMonth) {
        // Handle months with fewer days (e.g., day 31 in February)
        const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(dayOfMonth, maxDay));
      }
      break;
  }

  // Set to 9 AM
  next.setHours(9, 0, 0, 0);
  return next;
}

/**
 * Process all overdue recurring task templates.
 */
async function processRecurringTasks() {
  try {
    const now = new Date();
    const templates = await Task.find({
      isTemplate: true,
      'recurrence.enabled': true,
      'recurrence.nextRunAt': { $lte: now }
    });

    if (templates.length === 0) return;

    console.log(`🔄 Processing ${templates.length} recurring task(s)...`);

    for (const template of templates) {
      try {
        // Create a new task instance from template
        const dueDate = new Date(template.recurrence.nextRunAt);
        dueDate.setDate(dueDate.getDate() + 1); // Due 1 day after creation

        const newTask = await Task.create({
          title: template.title,
          description: template.description,
          workspaceId: template.workspaceId,
          userId: template.userId,
          assigneeId: template.assigneeId,
          priority: template.priority,
          category: template.category,
          customFields: template.customFields,
          status: 'NOT_STARTED',
          dueDate,
          isTemplate: false,
          recurrence: {
            parentTaskId: template._id
          }
        });

        // Calculate next run
        const nextRunAt = calculateNextRun(template, now);

        // Update template
        template.recurrence.lastRunAt = now;
        template.recurrence.nextRunAt = nextRunAt;
        await template.save();

        // Log activity
        logActivity(
          template.workspaceId, template.userId, 'task_created',
          `Recurring task '${template.title}' was auto-created`,
          `/tasks?id=${newTask._id}`,
          { taskId: newTask._id, templateId: template._id }
        );

        // Notify assignee
        if (template.assigneeId) {
          createNotification(template.assigneeId, {
            type: 'task_assigned',
            actorId: template.userId,
            link: `/tasks?id=${newTask._id}`,
            metadata: { taskTitle: template.title }
          });
        }

        console.log(`  ✅ Created: "${newTask.title}" (next run: ${nextRunAt.toISOString()})`);
      } catch (err) {
        console.error(`  ❌ Failed to process template ${template._id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[RecurringTasks] Error:', err.message);
  }
}

function startRecurringTasksJob() {
  // Run every hour
  cron.schedule('0 * * * *', processRecurringTasks);
  console.log('🔄 Recurring tasks job scheduled: Every hour');

  // Also run immediately on startup to catch up any missed runs
  processRecurringTasks();
}

module.exports = { startRecurringTasksJob, calculateNextRun };
