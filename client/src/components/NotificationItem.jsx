import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Clock, MessageSquare, AtSign, UserPlus, ShieldAlert, CheckCircle2 } from 'lucide-react';

const ICON_COLORS = {
  task_assigned: 'var(--color-info)',
  mentioned: '#a855f7',
  comment_added: '#60a5fa',
  task_overdue: 'var(--color-warning)',
  role_changed: 'var(--color-danger)',
  invite_received: 'var(--color-success)',
};

const NotificationItem = ({ notification, onClick }) => {
  const { type, actorId, text, createdAt, read } = notification;

  const getIcon = () => {
    const color = ICON_COLORS[type] || 'var(--text-muted)';
    const style = { color, flexShrink: 0 };
    switch (type) {
      case 'task_assigned': return <UserPlus size={15} style={style} />;
      case 'mentioned': return <AtSign size={15} style={style} />;
      case 'comment_added': return <MessageSquare size={15} style={style} />;
      case 'task_overdue': return <Clock size={15} style={style} />;
      case 'role_changed': return <ShieldAlert size={15} style={style} />;
      case 'invite_received': return <UserPlus size={15} style={style} />;
      default: return <CheckCircle2 size={15} style={style} />;
    }
  };

  const getTime = () => {
    try {
      return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
    } catch (e) {
      return 'just now';
    }
  };

  return (
    <div 
      onClick={() => onClick(notification)}
      className={`notif-item${!read ? ' unread' : ''}`}
    >
      <div className="notif-item-avatar">
        {actorId?.avatar ? (
          <img src={actorId.avatar} alt={actorId.name} />
        ) : (
          <span>{actorId?.name ? actorId.name[0].toUpperCase() : getIcon()}</span>
        )}
      </div>
      
      <div className="notif-item-content">
        <p className="notif-item-text">{text}</p>
        <span className="notif-item-time">{getTime()}</span>
      </div>

      {!read && <div className="notif-unread-dot" />}
    </div>
  );
};

export default NotificationItem;
