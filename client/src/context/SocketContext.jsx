import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';
import { initSocket, disconnectSocket } from '../socket/socket';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [socket, setSocket] = useState(null);
  
  const [onlineUsers, setOnlineUsers] = useState([]); // array of userIds for backward compat
  const [userStatuses, setUserStatuses] = useState({}); // full status map
  const prevWorkspaceIdRef = useRef(null);

  // Connect/disconnect socket based on auth state
  useEffect(() => {
    if (user && token) {
      const s = initSocket(token);
      setSocket(s);
      return () => {
        disconnectSocket();
        setSocket(null);
      };
    } else {
      // User logged out
      disconnectSocket();
      setSocket(null);
      setOnlineUsers([]);
      setUserStatuses({});
    }
  }, [user, token]);

  // Join workspace room when workspace changes or socket connects
  useEffect(() => {
    if (!socket || !activeWorkspace?._id) return;

    const handleConnect = () => {
      if (activeWorkspace?._id) {
        socket.emit('join_workspace', { 
          workspaceId: activeWorkspace._id 
        });
      }
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);

    // Leave old workspace room on the client side
    if (prevWorkspaceIdRef.current && prevWorkspaceIdRef.current !== activeWorkspace._id) {
      // Reset online user state for the new workspace
      setOnlineUsers([]);
      setUserStatuses({});
    }
    
    prevWorkspaceIdRef.current = activeWorkspace._id;

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [socket, activeWorkspace]);

  // Listen for online/offline events
  useEffect(() => {
    if (!socket) return;
    
    const handleJoinSuccess = ({ onlineUsers: onlineList }) => {
      const statusMap = {};
      const idList = [];
      onlineList.forEach(u => {
        statusMap[u.userId] = u.status;
        idList.push(u.userId);
      });
      setUserStatuses(statusMap);
      setOnlineUsers([...new Set(idList)]);
    };

    const handleUserOnline = ({ userId }) => {
      setOnlineUsers(prev => [...new Set([...prev, userId])]);
      setUserStatuses(prev => ({ ...prev, [userId]: 'online' }));
    };
    
    const handleUserOffline = ({ userId }) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
      setUserStatuses(prev => ({ ...prev, [userId]: 'offline' }));
    };

    const handleStatusChanged = ({ userId, status }) => {
      setUserStatuses(prev => ({ ...prev, [userId]: status }));
      if (status === 'offline') {
        setOnlineUsers(prev => prev.filter(id => id !== userId));
      } else {
        setOnlineUsers(prev => [...new Set([...prev, userId])]);
      }
    };

    socket.on('join_workspace_success', handleJoinSuccess);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);
    socket.on('user_status_changed', handleStatusChanged);

    return () => {
      socket.off('join_workspace_success', handleJoinSuccess);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
      socket.off('user_status_changed', handleStatusChanged);
    };
  }, [socket]);

  const getUserStatus = (userId) => userStatuses[userId] || 'offline';
  const isUserOnline = (userId) => ['online', 'away'].includes(userStatuses[userId]);

  return (
    <SocketContext.Provider value={{ 
        socket, 
        onlineUsers, 
        userStatuses, 
        getUserStatus, 
        isUserOnline 
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
