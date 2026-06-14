import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useSocket } from '../../context/SocketContext';
import { getRelativeTime } from '../../utils/helpers';

const MembersPanel = ({ channel, isOpen }) => {
  const [members, setMembers] = useState([]);
  const { getUserStatus, isUserOnline } = useSocket();

  useEffect(() => {
    if (isOpen && channel) {
      API.get(`/chat/channels/${channel._id}`)
        .then(res => setMembers(res.data.members || []))
        .catch(console.error);
    }
  }, [isOpen, channel]);

  const onlineMembers = members.filter(m => isUserOnline(m._id));
  const offlineMembers = members.filter(m => !isUserOnline(m._id));

  return (
    <div className={`members-panel ${isOpen ? 'open' : ''}`}>
      <div className="members-panel-header">
        Members ({members.length})
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {onlineMembers.length > 0 && (
          <>
            <div className="member-group-label">Online — {onlineMembers.length}</div>
            {onlineMembers.map(member => {
              const status = getUserStatus(member._id);
              return (
                <div key={member._id} className="member-item">
                  <div className="member-item-avatar-wrapper">
                    <img 
                      src={member.avatar || '/default-avatar.png'} 
                      className="member-item-avatar"
                      alt={member.name}
                    />
                    <span className={`status-dot status-${status}`} style={{ position: 'absolute', bottom: -2, right: -2 }} />
                  </div>
                  <span>{member.name}</span>
                </div>
              );
            })}
          </>
        )}

        {offlineMembers.length > 0 && (
          <>
            <div className="member-group-label">Offline — {offlineMembers.length}</div>
            {offlineMembers.map(member => {
              return (
                <div key={member._id} className="member-item" style={{ opacity: 0.7 }}>
                  <div className="member-item-avatar-wrapper">
                    <img 
                      src={member.avatar || '/default-avatar.png'} 
                      className="member-item-avatar"
                      alt={member.name}
                    />
                    <span className="status-dot status-offline" style={{ position: 'absolute', bottom: -2, right: -2 }} />
                  </div>
                  <span>{member.name}</span>
                  {member.lastSeen && (
                    <span className="member-last-seen">{getRelativeTime(member.lastSeen)}</span>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default MembersPanel;
