import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, CheckCircle, AlertTriangle, Users } from 'lucide-react';

const SkeletonCard = () => (
  <div className="dash-metric-card skeleton-card">
    <div className="skeleton-icon" />
    <div className="skeleton-lines">
      <div className="skeleton-bar w-40" />
      <div className="skeleton-bar w-60" />
    </div>
  </div>
);

const MetricCards = ({ metrics, memberCount, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="dash-metrics-grid">
        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    );
  }

  const m = metrics || { total: 0, completedToday: 0, overdue: 0, byStatus: {} };
  const todo = m.byStatus?.NOT_STARTED || 0;
  const inProgress = m.byStatus?.IN_PROGRESS || 0;
  const done = m.byStatus?.COMPLETED || 0;
  const allDone = m.overdue === 0 && m.total > 0;

  return (
    <div className="dash-metrics-grid">
      {/* Total Tasks */}
      <div className="dash-metric-card dash-metric-blue">
        <div className="dash-metric-icon"><ClipboardList /></div>
        <div className="dash-metric-body">
          <span className="dash-metric-number">{m.total}</span>
          <span className="dash-metric-label">Total Tasks</span>
          <span className="dash-metric-sub">{todo} todo · {inProgress} in progress · {done} done</span>
        </div>
      </div>

      {/* Completed Today */}
      <div className="dash-metric-card dash-metric-green">
        <div className="dash-metric-icon"><CheckCircle /></div>
        <div className="dash-metric-body">
          <span className={`dash-metric-number${m.completedToday > 0 ? ' pulse-celebrate' : ''}`}>
            {m.completedToday}
          </span>
          <span className="dash-metric-label">Completed Today</span>
          <span className="dash-metric-sub">tasks finished today</span>
        </div>
      </div>

      {/* Overdue */}
      <div
        className={`dash-metric-card ${m.overdue > 0 ? 'dash-metric-red clickable' : allDone ? 'dash-metric-green' : 'dash-metric-gray'}`}
        onClick={() => m.overdue > 0 && navigate('/tasks?due=overdue')}
        role={m.overdue > 0 ? 'button' : undefined}
        tabIndex={m.overdue > 0 ? 0 : undefined}
      >
        <div className="dash-metric-icon">
          {allDone ? <CheckCircle /> : <AlertTriangle />}
        </div>
        <div className="dash-metric-body">
          <span className="dash-metric-number">{m.overdue}</span>
          <span className="dash-metric-label">Overdue</span>
          <span className="dash-metric-sub">
            {allDone ? 'all caught up!' : m.overdue > 0 ? 'need immediate attention' : 'no overdue tasks'}
          </span>
        </div>
      </div>

      {/* Team Members */}
      <div
        className="dash-metric-card dash-metric-purple clickable"
        onClick={() => navigate('/members')}
        role="button"
        tabIndex={0}
      >
        <div className="dash-metric-icon"><Users /></div>
        <div className="dash-metric-body">
          <span className="dash-metric-number">{memberCount || 0}</span>
          <span className="dash-metric-label">Team Members</span>
          <span className="dash-metric-sub">active in this workspace</span>
        </div>
      </div>
    </div>
  );
};

export default MetricCards;
