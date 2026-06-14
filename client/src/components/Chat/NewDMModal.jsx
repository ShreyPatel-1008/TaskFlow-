import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const NewDMModal = ({ onClose, onSuccess }) => {
  const { activeWorkspace } = useWorkspace();
  const { fetchDMList } = useChat();
  const { user } = useAuth();
  const { getUserStatus } = useSocket();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeWorkspace) {
      API.get(`/workspaces/${activeWorkspace._id}/members`)
        .then(res => {
          // API returns array of WorkspaceMember docs with userId populated
          // Each item has: { _id, workspaceId, userId: { _id, name, email, avatar }, role }
          const data = Array.isArray(res.data) ? res.data : (res.data.members || []);
          const others = data
            .filter(m => m.userId && m.userId._id !== user._id)
            .map(m => ({
              _id: m.userId._id,
              name: m.userId.name,
              email: m.userId.email,
              avatar: m.userId.avatar
            }));
          setMembers(others);
        })
        .catch(err => setError('Failed to load members'));
    }
  }, [activeWorkspace, user]);

  const handleStartDM = async (targetUserId) => {
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/chat/dm', { targetUserId });
      await fetchDMList();
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start DM');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Direct Message</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto', padding: '0' }}>
          {error && <div className="error-message" style={{ margin: '16px' }}>{error}</div>}
          
          <div style={{ padding: '8px 16px', background: 'var(--bg-hover)', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
            WORKSPACE MEMBERS
          </div>
          
          {members.length === 0 && !error ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No other members in this workspace.
            </div>
          ) : (
            members.map(member => {
              const status = getUserStatus(member._id);
              return (
                <div 
                  key={member._id} 
                  className="member-item"
                  onClick={() => !loading && handleStartDM(member._id)}
                  style={{ opacity: loading ? 0.5 : 1, padding: '12px 16px', borderBottom: '1px solid var(--border-color)', borderRadius: 0, cursor: 'pointer' }}
                >
                  <div className="member-item-avatar-wrapper">
                    <img src={member.avatar || '/default-avatar.png'} className="member-item-avatar" alt={member.name} />
                    <span className={`status-dot status-${status}`} style={{ position: 'absolute', bottom: -2, right: -2 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{member.name}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{member.email}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default NewDMModal;
