import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus, CheckCircle, User, MessageCircle,
  UserPlus, AlertTriangle, Activity
} from 'lucide-react';
import API from '../../utils/api';

const typeConfig = {
  task_created:   { icon: Plus,           color: 'var(--color-blue, #3b82f6)' },
  task_completed: { icon: CheckCircle,    color: 'var(--color-green, #22c55e)' },
  task_assigned:  { icon: User,           color: 'var(--color-purple, #a855f7)' },
  comment_added:  { icon: MessageCircle,  color: 'var(--color-amber, #f59e0b)' },
  member_joined:  { icon: UserPlus,       color: 'var(--color-teal, #14b8a6)' },
  task_overdue:   { icon: AlertTriangle,  color: 'var(--color-red, #ef4444)' },
};

const ActivityItem = ({ item, onClick }) => {
  const config = typeConfig[item.type] || { icon: Activity, color: '#6b7280' };
  const Icon = config.icon;
  const actorName = item.actor?.name || 'Former member';

  let timeStr = 'just now';
  try {
    timeStr = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });
  } catch (e) { /* keep 'just now' */ }

  // Bold the actor name in the text
  const textParts = item.text?.split(actorName) || [item.text];
  
  return (
    <div
      className="dash-activity-item"
      onClick={() => onClick(item)}
      role="button"
      tabIndex={0}
    >
      <div className="dash-activity-icon" style={{ color: config.color }}>
        <Icon size={15} />
      </div>
      <div className="dash-activity-avatar">
        {item.actor?.avatar ? (
          <img src={item.actor.avatar} alt={actorName} />
        ) : (
          <span>{actorName[0]?.toUpperCase() || '?'}</span>
        )}
      </div>
      <div className="dash-activity-content">
        <p className="dash-activity-text">
          {textParts.length > 1 ? (
            <>
              <strong>{actorName}</strong>
              {textParts.slice(1).join(actorName)}
            </>
          ) : (
            item.text
          )}
        </p>
        <span className="dash-activity-time">{timeStr}</span>
      </div>
    </div>
  );
};

const ActivityFeed = ({ activity = [], generatedAt, loading }) => {
  const navigate = useNavigate();
  const [moreItems, setMoreItems] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const allItems = [...activity, ...moreItems];

  const handleLoadMore = async () => {
    if (allItems.length === 0 || loadingMore) return;
    setLoadingMore(true);
    try {
      const lastDate = allItems[allItems.length - 1].createdAt;
      const res = await API.get(`/dashboard/activity?before=${lastDate}&limit=20`);
      setMoreItems(prev => [...prev, ...res.data.activity]);
      setHasMore(res.data.hasMore);
    } catch (err) {
      console.error('Load more activity error:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleClick = (item) => {
    if (item.link) navigate(item.link);
  };

  let timeAgo = '';
  if (generatedAt) {
    try {
      timeAgo = formatDistanceToNow(new Date(generatedAt), { addSuffix: true });
    } catch (e) { timeAgo = ''; }
  }

  if (loading) {
    return (
      <div className="dash-card dash-activity-card">
        <div className="dash-card-header">
          <h3><Activity className="inline-icon" /> Recent activity</h3>
        </div>
        <div className="dash-activity-skeleton">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="dash-activity-item skeleton-row">
              <div className="skeleton-avatar small" />
              <div className="skeleton-lines flex-1">
                <div className="skeleton-bar w-80" />
                <div className="skeleton-bar w-30" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dash-card dash-activity-card">
      <div className="dash-card-header">
        <h3><Activity className="inline-icon" /> Recent activity</h3>
        {timeAgo && <span className="dash-card-meta">Last updated {timeAgo}</span>}
      </div>

      {allItems.length === 0 ? (
        <div className="dash-empty-state">
          <Activity className="dash-empty-icon" />
          <p className="dash-empty-title">No activity yet</p>
          <p className="dash-empty-sub">Create your first task to get started</p>
          <div className="dash-empty-arrow">←</div>
        </div>
      ) : (
        <div className="dash-activity-list">
          {allItems.map((item, idx) => (
            <ActivityItem
              key={item._id || idx}
              item={item}
              onClick={handleClick}
            />
          ))}
          
          {hasMore && allItems.length >= 20 && (
            <button
              className="dash-load-more-btn"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
