const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Some Windows/dev networks fail SSL verification for Google OAuth cert fetching
if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_INSECURE_TLS === 'true') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const connectDB = require('./config/db');
const seedDatabase = require('./config/seed');
const { initDailyResetCron, checkMissedReset } = require('./services/dailyReset');

// Import routes
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const analyticsRoutes = require('./routes/analytics');
const noteRoutes = require('./routes/notes');
const workspaceRoutes = require('./routes/workspaces');
const inviteRoutes = require('./routes/invites');
const commentRoutes = require('./routes/comments');
const notificationRoutes = require('./routes/notifications');
const dashboardRoutes = require('./routes/dashboard');
const customFieldRoutes = require('./routes/customFields');
const attachmentRoutes = require('./routes/attachments');
const { startOverdueChecker } = require('./jobs/overdueChecker');
const { startRecurringTasksJob } = require('./jobs/recurringTasks');
const auth = require('./middleware/auth');
const attachWorkspace = require('./middleware/attachWorkspace');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to database, seed default user, start cron jobs
connectDB().then(async () => {
    seedDatabase();
    initDailyResetCron();
    await checkMissedReset();
    startOverdueChecker();
    startRecurringTasksJob();

    // One-time migration: mark existing tasks as daily so they persist across days
    try {
        const Task = require('./models/Task');
        const result = await Task.updateMany(
            { isDaily: { $ne: true } },
            { $set: { isDaily: true } }
        );
        if (result.modifiedCount > 0) {
            console.log(`🔄 Migrated ${result.modifiedCount} existing tasks to daily mode`);
        }
    } catch (err) {
        // Non-critical — skip silently
    }
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000, // Increased for development
    message: { message: 'Too many requests, please try again later' }
});

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true
}));
app.use(express.json({ limit: '50kb' }));
app.use('/api/', limiter);

// Static file serving for local uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/tasks', auth, attachWorkspace, taskRoutes);
app.use('/api/tasks/:taskId/comments', auth, attachWorkspace, commentRoutes);
app.use('/api/analytics', auth, attachWorkspace, analyticsRoutes);
app.use('/api/notes', auth, attachWorkspace, noteRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/workspaces/:id/custom-fields', customFieldRoutes);
app.use('/api/tasks/:taskId/attachments', auth, attachWorkspace, attachmentRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🚀 TaskFlow Server running on port ${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api`);
});

module.exports = app;
