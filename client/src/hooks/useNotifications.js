import { useState, useEffect, useCallback, useRef } from 'react';
import API from '../utils/api';
import { useSocket } from '../context/SocketContext';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const pollInterval = useRef(null);
  const { socket } = useSocket();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await API.get('/notifications/unread-count');
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, []);

  const fetchNotifications = async (before = null) => {
    setLoading(true);
    try {
      const url = before 
        ? `/notifications?before=${before}&limit=20` 
        : '/notifications?limit=20';
        
      const res = await API.get(url);
      
      if (before) {
        setNotifications(prev => [...prev, ...res.data.notifications]);
      } else {
        setNotifications(res.data.notifications);
      }
      
      setUnreadCount(res.data.unreadCount);
      setHasMore(res.data.hasMore);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    // Optimistic update
    setNotifications(prev => 
      prev.map(n => n._id === id ? { ...n, read: true } : n)
    );
    // Don't decrease unreadCount manually unless we're sure
    try {
      await API.patch(`/notifications/${id}/read`);
      await fetchUnreadCount();
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    // Optimistic
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await API.patch('/notifications/read-all');
    } catch (err) {
      console.error(err);
    }
  };

  const loadMore = () => {
    if (notifications.length > 0 && hasMore) {
      const lastCreated = notifications[notifications.length - 1].createdAt;
      fetchNotifications(lastCreated);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    // Poll for unread count every 30s
    pollInterval.current = setInterval(fetchUnreadCount, 30000);
    
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!socket) return;
    
    const handleChatMention = (data) => {
        setUnreadCount(prev => prev + 1);
        setNotifications(prev => [{
            _id: Date.now().toString(),
            type: 'mention',
            text: data.isEveryone 
                ? `${data.sender.name} mentioned @everyone in #${data.channelName}`
                : data.isHere
                ? `${data.sender.name} mentioned @here in #${data.channelName}`
                : `${data.sender.name} mentioned you in #${data.channelName}`,
            link: `/chat?channel=${data.channelId}`,
            read: false,
            actorId: { name: data.sender.name, avatar: data.sender.avatar },
            createdAt: new Date()
        }, ...prev]);

        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('TaskFlow', {
                body: `${data.sender.name} mentioned you in #${data.channelName}`,
                icon: '/favicon.ico'
            });
        }
    };

    socket.on('chat_mention', handleChatMention);
    return () => socket.off('chat_mention', handleChatMention);
  }, [socket]);

  return {
    notifications,
    unreadCount,
    loading,
    hasMore,
    fetchNotifications,
    markRead,
    markAllRead,
    loadMore
  };
};
