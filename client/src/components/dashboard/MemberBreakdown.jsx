import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';

const MemberBreakdown = ({ members = [], unassignedCount = 0, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="dash-card dash-members-card">
        <div className="dash-card-header"><h3><Users className="inline-icon" /> Team workload</h3></div>
        <div className="dash-member-skeleton">
          {[1, 2, 3].map(i => (
            <div key={i} className="dash-member-row skeleton-row">
              <div className="skeleton-avatar" />
              <div className="skeleton-lines flex-1"><div className="skeleton-bar w-60" /><div className="skeleton-bar w-40" /></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dash-card dash-members-card">
      <div className="dash-card-header">
        <h3><Users className="inline-icon" /> Team workload</h3>
      </div>
      <div className="dash-members-list">
        {members.map((m) => {
          const ratio = m.assigned > 0 ? Math.round((m.completed / m.assigned) * 100) : 0;
          const isIdle = m.assigned === 0;
          
          return (
            <div key={m._id} className={`dash-member-row${isIdle ? ' idle' : ''}`}>
              <div className="dash-member-avatar">
                {m.avatar ? (
                  <img src={m.avatar} alt={m.name} />
                ) : (
                  <span>{(m.name || '?')[0].toUpperCase()}</span>
                )}
              </div>
              <div className="dash-member-info">
                <div className="dash-member-name">{m.name || 'Former member'}</div>
                <div className="dash-member-bar">
                  <div className="dash-member-bar-fill" style={{ width: `${ratio}%` }} />
                </div>
              </div>
              <div className="dash-member-badges">
                <span className="dash-badge dash-badge-blue" title="Assigned">{m.assigned}</span>
                <span className="dash-badge dash-badge-green" title="Done">{m.completed}</span>
                <span className={`dash-badge ${m.overdue > 0 ? 'dash-badge-red' : 'dash-badge-muted'}`} title="Overdue">{m.overdue}</span>
              </div>
            </div>
          );
        })}

        {/* Unassigned tasks row */}
        {unassignedCount > 0 && (
          <div
            className="dash-member-row unassigned clickable"
            onClick={() => navigate('/tasks?assignee=unassigned')}
            role="button"
            tabIndex={0}
          >
            <div className="dash-member-avatar unassigned-avatar">
              <span>?</span>
            </div>
            <div className="dash-member-info">
              <div className="dash-member-name">Unassigned tasks</div>
            </div>
            <div className="dash-member-badges">
              <span className="dash-badge dash-badge-amber">{unassignedCount}</span>
            </div>
          </div>
        )}

        {members.length === 0 && unassignedCount === 0 && (
          <div className="dash-empty-state small">
            <p className="dash-empty-sub">No team members yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberBreakdown;
