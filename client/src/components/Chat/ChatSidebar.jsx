import { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { getRelativeTime } from '../../utils/helpers';
import CreateChannelModal from './CreateChannelModal';
import NewDMModal from './NewDMModal';

const ChatSidebar = ({ activeChannel, onSelectChannel }) => {
  const { channels, dmList, unreadCounts } = useChat();
  const { isUserOnline, getUserStatus } = useSocket();
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);

  return (
    <div className="chat-sidebar">
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '18px', margin: 0 }}>Chat</h2>
      </div>

      <div style={{ padding: '16px 0', flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px 8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Channels</span>
          <button 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
            onClick={() => setShowCreateChannel(true)}
          >
            +
          </button>
        </div>
        
        {channels.map(channel => (
          <div 
            key={channel._id} 
            className={`chat-channel-item ${activeChannel?._id === channel._id ? 'active' : ''}`}
            onClick={() => onSelectChannel(channel)}
            style={{ margin: '0 8px' }}
          >
            <span className="channel-hash">#</span>
            <span className="channel-name">{channel.name}</span>
            {unreadCounts[channel._id] > 0 && (
              <span className="unread-badge">{unreadCounts[channel._id]}</span>
            )}
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 16px 8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Direct Messages</span>
          <button 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
            onClick={() => setShowNewDM(true)}
          >
            +
          </button>
        </div>

        {dmList.map(dm => {
          // Guard: skip DMs with missing otherMember data
          if (!dm.otherMember) return null;
          
          const status = getUserStatus(dm.otherMember._id);
          const isActive = activeChannel?._id === dm.channel._id;

          return (
            <div 
              key={dm.channel._id} 
              className={`chat-dm-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectChannel(dm.channel)}
              style={{ margin: '0 8px' }}
            >
              <div className="dm-avatar-wrapper">
                <img 
                  src={dm.otherMember.avatar || '/default-avatar.png'} 
                  className="dm-avatar"
                  alt={dm.otherMember.name}
                />
                <span className={`status-dot status-${status}`} />
              </div>
              <div className="dm-info">
                <div className="dm-top-row">
                  <span className="dm-name" style={{ fontSize: '13px', fontWeight: 500 }}>{dm.otherMember.name}</span>
                  {dm.lastMessage && (
                    <span className="dm-time">
                      {getRelativeTime(dm.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                {dm.lastMessage && (
                  <span className="dm-preview">
                    {dm.lastMessage.text}
                  </span>
                )}
              </div>
              {unreadCounts[dm.channel._id] > 0 && (
                <span className="unread-badge">{unreadCounts[dm.channel._id]}</span>
              )}
            </div>
          );
        })}
      </div>

      {showCreateChannel && (
        <CreateChannelModal 
          onClose={() => setShowCreateChannel(false)} 
          onSuccess={(newChannel) => {
            setShowCreateChannel(false);
            onSelectChannel(newChannel);
          }}
        />
      )}

      {showNewDM && (
        <NewDMModal 
          onClose={() => setShowNewDM(false)}
          onSuccess={(newChannel) => {
            setShowNewDM(false);
            onSelectChannel(newChannel);
          }}
        />
      )}
    </div>
  );
};

export default ChatSidebar;
