const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const WorkspaceMember = require('../models/WorkspaceMember');
const auth = require('../middleware/auth');
const attachWorkspace = require('../middleware/attachWorkspace');
const requireRole = require('../middleware/requireRole');

// In-memory cache: key = workspaceId string, value = { data, expiresAt }
const cache = new Map();

/**
 * GET /api/dashboard
 * Main endpoint — aggregates all workspace metrics in parallel.
 */
router.get('/', auth, attachWorkspace, requireRole('viewer'), async (req, res) => {
  try {
    const workspaceId = req.workspaceId;
    const wsObjId = new mongoose.Types.ObjectId(workspaceId);

    // Check cache (unless ?refresh=true from an admin)
    const refresh = req.query.refresh === 'true';
    if (!refresh) {
      const cached = cache.get(workspaceId.toString());
      if (cached && cached.expiresAt > Date.now()) {
        res.set('Cache-Control', 'max-age=60');
        return res.json(cached.data);
      }
    }

    const now = new Date();
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const [taskMetrics, completionTrend, membersRaw, activityFeed] = await Promise.all([
      // Pipeline 1 — Task metrics
      Task.aggregate([
        { $match: { workspaceId: wsObjId } },
        {
          $facet: {
            total: [{ $count: 'count' }],
            completedToday: [
              {
                $match: {
                  status: 'COMPLETED',
                  updatedAt: { $gte: todayMidnight }
                }
              },
              { $count: 'count' }
            ],
            overdue: [
              {
                $match: {
                  dueDate: { $lt: now },
                  status: { $ne: 'COMPLETED' }
                }
              },
              { $count: 'count' }
            ],
            byStatus: [
              { $group: { _id: '$status', count: { $sum: 1 } } }
            ],
            byPriority: [
              { $group: { _id: '$priority', count: { $sum: 1 } } }
            ]
          }
        }
      ]),

      // Pipeline 2 — Completion trend (last 14 days)
      Task.aggregate([
        {
          $match: {
            workspaceId: wsObjId,
            status: 'COMPLETED',
            updatedAt: { $gte: fourteenDaysAgo }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Pipeline 3 — Member breakdown
      (async () => {
        const members = await WorkspaceMember.find({ workspaceId })
          .populate('userId', '_id name email avatar')
          .lean();

        const memberStats = await Promise.all(
          members.map(async (m) => {
            if (!m.userId) return null;
            const [assigned, completed, overdue] = await Promise.all([
              Task.countDocuments({ workspaceId, assigneeId: m.userId._id }),
              Task.countDocuments({ workspaceId, assigneeId: m.userId._id, status: 'COMPLETED' }),
              Task.countDocuments({
                workspaceId,
                assigneeId: m.userId._id,
                dueDate: { $lt: now },
                status: { $ne: 'COMPLETED' }
              })
            ]);
            return {
              _id: m.userId._id,
              name: m.userId.name || 'Former member',
              avatar: m.userId.avatar || null,
              role: m.role,
              assigned,
              completed,
              overdue
            };
          })
        );

        // Count unassigned tasks
        const unassigned = await Task.countDocuments({
          workspaceId,
          $or: [{ assigneeId: null }, { assigneeId: { $exists: false } }]
        });

        return {
          members: memberStats.filter(Boolean).sort((a, b) => b.assigned - a.assigned),
          unassigned
        };
      })(),

      // Pipeline 4 — Recent activity
      Activity.find({ workspaceId })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('actorId', '_id name avatar')
        .lean()
    ]);

    // Parse task metrics facet
    const rawMetrics = taskMetrics[0];
    const metrics = {
      total: rawMetrics.total[0]?.count || 0,
      completedToday: rawMetrics.completedToday[0]?.count || 0,
      overdue: rawMetrics.overdue[0]?.count || 0,
      byStatus: {},
      byPriority: {}
    };
    rawMetrics.byStatus.forEach(s => { metrics.byStatus[s._id] = s.count; });
    rawMetrics.byPriority.forEach(p => { metrics.byPriority[p._id] = p.count; });

    // Fill missing days with 0 for last 14 days
    const trendMap = {};
    completionTrend.forEach(d => { trendMap[d._id] = d.count; });
    const trend = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trend.push({ date: dateStr, count: trendMap[dateStr] || 0 });
    }

    const result = {
      metrics,
      trend,
      members: membersRaw.members,
      unassignedCount: membersRaw.unassigned,
      activity: activityFeed.map(a => ({
        _id: a._id,
        type: a.type,
        text: a.text,
        link: a.link,
        createdAt: a.createdAt,
        actor: a.actorId ? {
          _id: a.actorId._id,
          name: a.actorId.name || 'Former member',
          avatar: a.actorId.avatar || null
        } : { name: 'Former member', avatar: null }
      })),
      generatedAt: new Date().toISOString()
    };

    // Cache the result for 60 seconds
    cache.set(workspaceId.toString(), {
      data: result,
      expiresAt: Date.now() + 60000
    });

    res.set('Cache-Control', 'max-age=60');
    res.json(result);
  } catch (err) {
    console.error('[Dashboard] Error:', err);
    res.status(500).json({ message: 'Failed to load dashboard data' });
  }
});

/**
 * GET /api/dashboard/activity
 * Paginated activity feed with cursor-based pagination.
 */
router.get('/activity', auth, attachWorkspace, requireRole('viewer'), async (req, res) => {
  try {
    const { before, limit: limitParam } = req.query;
    const limit = parseInt(limitParam) || 20;

    const query = { workspaceId: req.workspaceId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('actorId', '_id name avatar')
      .lean();

    const hasMore = activities.length > limit;
    const items = hasMore ? activities.slice(0, limit) : activities;

    res.json({
      activity: items.map(a => ({
        _id: a._id,
        type: a.type,
        text: a.text,
        link: a.link,
        createdAt: a.createdAt,
        actor: a.actorId ? {
          _id: a.actorId._id,
          name: a.actorId.name || 'Former member',
          avatar: a.actorId.avatar || null
        } : { name: 'Former member', avatar: null }
      })),
      hasMore
    });
  } catch (err) {
    console.error('[Dashboard] Activity error:', err);
    res.status(500).json({ message: 'Failed to load activity' });
  }
});

module.exports = router;
