import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { useSocket } from '../context/SocketContext';
import ChatSidebar from '../components/Chat/ChatSidebar';
import MessageWindow from '../components/Chat/MessageWindow';
import ChatWelcome from '../components/Chat/ChatWelcome';

const ChatPage = () => {
  const [searchParams] = useSearchParams();
  const { channels, dmList, clearUnread, setActiveChannelId } = useChat();
  const { socket } = useSocket();
  const [activeChannel, setActiveChannel] = useState(null);
  const [socketStatus, setSocketStatus] = useState('unknown');

  // Track socket status for debug
  useEffect(() => {
    if (!socket) {
      setSocketStatus('❌ socket is NULL');
      return;
    }
    
    const updateStatus = () => {
      setSocketStatus(socket.connected ? `✅ Connected (${socket.id})` : '⏳ Connecting...');
    };
    
    updateStatus();
    socket.on('connect', updateStatus);
    socket.on('disconnect', () => setSocketStatus('🔴 Disconnected'));
    socket.on('connect_error', (err) => setSocketStatus(`❌ Error: ${err.message}`));
    
    return () => {
      socket.off('connect', updateStatus);
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, [socket]);

  // Auto-open channel from URL param (deep link from notifications)
  useEffect(() => {
    const channelId = searchParams.get('channel');
    if (channelId) {
      const foundChannel = channels.find(c => c._id === channelId);
      if (foundChannel) {
        setActiveChannel(foundChannel);
        return;
      }
      
      const foundDM = dmList.find(d => d.channel._id === channelId);
      if (foundDM) {
        setActiveChannel(foundDM.channel);
        return;
      }
    }
  }, [searchParams, channels, dmList]);

  // Sync active channel with ChatContext to prevent unread increments for active channel
  useEffect(() => {
    if (activeChannel) {
      setActiveChannelId(activeChannel._id);
      clearUnread(activeChannel._id);
    }
    return () => {
      setActiveChannelId(null);
    };
  }, [activeChannel]);

  const handleSelectChannel = (channel) => {
    setActiveChannel(channel);
  };

  return (
    <div className="chat-page">
      {/* DEBUG BANNER - remove after fixing */}
      <div style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        background: socketStatus.includes('✅') ? '#1a7a1a' : '#cc0000',
        color: 'white', padding: '4px 16px', borderRadius: '0 0 8px 8px',
        fontSize: '12px', fontFamily: 'monospace', zIndex: 9999
      }}>
        Socket: {socketStatus}
      </div>
      
      <ChatSidebar 
        activeChannel={activeChannel} 
        onSelectChannel={handleSelectChannel} 
      />
      {activeChannel ? (
        <MessageWindow channel={activeChannel} />
      ) : (
        <ChatWelcome />
      )}
    </div>
  );
};

export default ChatPage;

