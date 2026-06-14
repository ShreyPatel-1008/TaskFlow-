import { createContext, useContext, useState, useEffect, useRef } from 'react';
import API from '../utils/api';
import { useSocket } from './SocketContext';
import { useWorkspace } from './WorkspaceContext';
import toast from 'react-hot-toast';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [channels, setChannels] = useState([]);
  const [dmList, setDmList] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const { socket } = useSocket();
  const { activeWorkspace } = useWorkspace();
  const activeChannelIdRef = useRef(null);

  const fetchChannels = async () => {
    try {
      const res = await API.get('/chat/channels');
      setChannels(res.data);
      const counts = {};
      res.data.forEach(c => {
        counts[c._id] = c.unreadCount || 0;
      });
      setUnreadCounts(prev => ({ ...prev, ...counts }));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDMList = async () => {
    try {
      const res = await API.get('/chat/dm/list');
      setDmList(res.data.dms || []);
      const counts = {};
      (res.data.dms || []).forEach(d => {
        counts[d.channel._id] = d.unreadCount || 0;
      });
      setUnreadCounts(prev => ({ ...prev, ...counts }));
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch when workspace changes
  // Small delay ensures WorkspaceContext's axios interceptor (x-workspace-id) is registered first
  useEffect(() => {
    if (activeWorkspace) {
      const timer = setTimeout(() => {
        fetchChannels();
        fetchDMList();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setChannels([]);
      setDmList([]);
      setUnreadCounts({});
    }
  }, [activeWorkspace]);

  // Listen for new messages to update unread counts
  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (message) => {
      // Get channelId as string
      const msgChannelId = typeof message.channelId === 'object' 
        ? message.channelId._id 
        : message.channelId;
      
      // Don't increment unread for the channel the user is currently viewing
      if (activeChannelIdRef.current === msgChannelId) return;
      
      setUnreadCounts(prev => ({
        ...prev,
        [msgChannelId]: (prev[msgChannelId] || 0) + 1
      }));
    };

    const handleNewDMChannel = ({ channel, initiator }) => {
      setDmList(prev => {
        const exists = prev.find(dm => dm.channel._id === channel._id);
        if (exists) return prev;
        return [...prev, { channel, otherMember: initiator, unreadCount: 1, lastMessage: null }];
      });
      setUnreadCounts(prev => ({ ...prev, [channel._id]: 1 }));
      toast(`${initiator.name} started a new chat with you`, { icon: '💬' });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('new_dm_channel', handleNewDMChannel);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('new_dm_channel', handleNewDMChannel);
    };
  }, [socket]);

  const clearUnread = (channelId) => {
    activeChannelIdRef.current = channelId;
    setUnreadCounts(prev => ({ ...prev, [channelId]: 0 }));
  };

  const setActiveChannelId = (channelId) => {
    activeChannelIdRef.current = channelId;
  };

  return (
    <ChatContext.Provider value={{
      channels, dmList, unreadCounts,
      fetchChannels, fetchDMList, clearUnread, setActiveChannelId,
      setChannels, setDmList
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
