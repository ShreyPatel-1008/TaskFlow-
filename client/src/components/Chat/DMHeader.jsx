import { useSocket } from '../../context/SocketContext';
import { getRelativeTime } from '../../utils/helpers';

const DMHeader = ({ otherMember }) => {
  const { getUserStatus } = useSocket();

  if (!otherMember) return <div className="dm-header">Loading...</div>;

  const status = getUserStatus(otherMember._id);
  
  let statusText = 'Offline';
  if (status === 'online') statusText = 'Active now';
  else if (status === 'away') statusText = 'Away';
  else if (otherMember.lastSeen) statusText = `Last seen ${getRelativeTime(otherMember.lastSeen)}`;

  return (
    <div className="dm-header">
      <div className="dm-header-avatar-wrapper">
        <img 
          src={otherMember.avatar || '/default-avatar.png'} 
          className="dm-header-avatar"
          alt={otherMember.name}
        />
        <span className={`status-dot large status-${status}`} style={{ position: 'absolute', bottom: 0, right: 0 }} />
      </div>
      <div>
        <h3 className="dm-header-name">{otherMember.name}</h3>
        <div className={`dm-status-text status-${status}`}>
          {statusText}
        </div>
      </div>
    </div>
  );
};

export default DMHeader;
