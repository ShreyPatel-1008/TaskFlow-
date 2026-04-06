import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Clock, MessageSquare, AtSign, UserPlus, ShieldAlert, CheckCircle2 } from 'lucide-react';

const NotificationItem = ({ notification, onClick }) => {
  const { type, actorId, text, createdAt, read } = notification;

  const getIcon = () => {
    switch (type) {
      case 'task_assigned': return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'mentioned': return <AtSign className="w-4 h-4 text-purple-500" />;
      case 'comment_added': return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'task_overdue': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'role_changed': return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case 'invite_received': return <UserPlus className="w-4 h-4 text-green-500" />;
      default: return <CheckCircle2 className="w-4 h-4 text-gray-500" />;
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
      className={`
        flex items-start gap-3 p-4 cursor-pointer transition-all border-b border-gray-100 last:border-0 hover:bg-gray-50
        ${!read ? 'bg-blue-50/40 border-l-4 border-l-blue-500' : 'bg-white'}
      `}
    >
      <div className="flex-shrink-0 mt-1">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
          {actorId?.avatar ? (
            <img src={actorId.avatar} alt={actorId.name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-gray-500 font-bold uppercase text-sm">
              {actorId?.name ? actorId.name[0] : getIcon()}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-grow min-w-0">
        <p className={`text-sm leading-snug flex flex-wrap gap-x-1 ${!read ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
          {/* We assume the service provides pre-bolded text where possible or we keep it simple here */}
          {text}
        </p>
        <span className="text-xs text-gray-400 mt-1 block">
          {getTime()}
        </span>
      </div>

      {!read && (
        <div className="flex-shrink-0 pt-2">
          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm animate-pulse"></div>
        </div>
      )}
    </div>
  );
};

export default NotificationItem;
