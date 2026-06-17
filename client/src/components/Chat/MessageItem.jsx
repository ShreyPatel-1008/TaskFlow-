import { getRelativeTime } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

const MessageItem = ({ message, showAvatar }) => {
  const { user } = useAuth();
  const sender = (typeof message.senderId === 'object' && message.senderId !== null) ? message.senderId : { name: 'Unknown User', avatar: '' };
  const isSender = (sender._id || message.senderId) === user?._id;

  const renderMentions = (text) => {
    if (!text) return null;

    // Split on @mentions and @special
    const parts = text.split(/(@\w+)/g);

    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const handle = part.slice(1).toLowerCase();

        // Special mentions
        if (handle === 'everyone' || handle === 'here') {
          return (
            <span key={i} className="mention mention-special">
              {part}
            </span>
          );
        }

        // Check if this mention is the current user
        const isSelf = handle === user?.name?.toLowerCase();
        return (
          <span 
            key={i} 
            className={`mention ${isSelf ? 'mention-self' : ''}`}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={`message-item ${!showAvatar ? 'compact' : ''}`}>
      {showAvatar ? (
        <img 
          src={sender.avatar || '/default-avatar.png'} 
          className="message-avatar"
          alt={sender.name}
        />
      ) : null}
      
      <div style={{ flex: 1, minWidth: 0 }}>
        {showAvatar && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
            <span className="message-sender">{sender.name}</span>
            <span className="message-time">{getRelativeTime(message.createdAt)}</span>
          </div>
        )}
        
        {message.isDeleted ? (
          <div className="deleted-text">This message was deleted</div>
        ) : (
          <div className="message-text">
            {renderMentions(message.text)}
            {message.isEdited && <span className="edited-label">(edited)</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;
