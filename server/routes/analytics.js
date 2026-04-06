const express = require('express');
const router = express.Router();
const requireRole = require('../middleware/requireRole');
const {
    getDashboardStats,
    getWeeklyAnalytics,
    getMonthlyAnalytics,
    getHeatmapData,
    getStreak,
    getInsights
} = require('../controllers/analyticsController');
const { getWeeklyFocusHours } = require('../controllers/timeController');

// NOTE: `auth` and `attachWorkspace` are applied at the router level
// in server.js.

// All analytics are read-only — viewers and above can access
router.get('/dashboard',   requireRole('viewer'), getDashboardStats);
router.get('/weekly',      requireRole('viewer'), getWeeklyAnalytics);
router.get('/monthly',     requireRole('viewer'), getMonthlyAnalytics);
router.get('/heatmap',     requireRole('viewer'), getHeatmapData);
router.get('/streak',      requireRole('viewer'), getStreak);
router.get('/insights',    requireRole('viewer'), getInsights);
router.get('/focus-hours', requireRole('viewer'), getWeeklyFocusHours);

module.exports = router;
