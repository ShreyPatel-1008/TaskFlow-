import { useState, useEffect, useRef, useCallback } from 'react';
import API from '../../utils/api';
import { useSocket } from '../../context/SocketContext';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import ChannelHeader from './ChannelHeader';
import DMHeader from './DMHeader';
import MembersPanel from './MembersPanel';

const MessageWindow = ({ channel }) => {
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Map()); // Map<userId, name>
  const [showMembers, setShowMembers] = useState(false);
  const [otherMember, setOtherMember] = useState(null);
  
  const { socket } = useSocket();
  const { clearUnread, dmList } = useChat();
  const { user } = useAuth();
  
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isInitialLoad = useRef(true);

  // Identify DM other member
  useEffect(() => {
    if (channel.type === 'direct') {
      const dm = dmList.find(d => d.channel._id === channel._id);
      if (dm && dm.otherMember) {
        setOtherMember(dm.otherMember);
      }
    } else {
      setOtherMember(null);
    }
  }, [channel, dmList]);

  const fetchMessages = useCallback(async (pageNum = 1) => {
    try {
      if (pageNum > 1) setLoadingMore(true);
      const res = await API.get(`/chat/channels/${channel._id}/messages?page=${pageNum}`);
      const newMessages = res.data.messages.reverse(); // API returns newest-first, we need oldest-first

      if (pageNum === 1) {
        setMessages(newMessages);
        isInitialLoad.current = true;
      } else {
        // Prepend older messages, deduplicating by _id
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m._id));
          const unique = newMessages.filter(m => !existingIds.has(m._id));
          return [...unique, ...prev];
        });
      }
      setHasMore(res.data.currentPage < res.data.totalPages);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    } finally {
      setLoadingMore(false);
    }
  }, [channel._id]);

  // On channel change: reset everything and fetch
  useEffect(() => {
    setMessages([]);
    setPage(1);
    setHasMore(true);
    setTypingUsers(new Map());
    setShowMembers(false);
    isInitialLoad.current = true;
    fetchMessages(1);
    
    if (socket) {
      socket.emit('join_channel', { channelId: channel._id });
      socket.emit('mark_read', { channelId: channel._id });
      clearUnread(channel._id);
    }

    return () => {
      if (socket) {
        socket.emit('leave_channel', { channelId: channel._id });
      }
    };
  }, [channel._id]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      // Ensure channelId comparison works whether string or object
      const msgChannelId = typeof msg.channelId === 'object' ? msg.channelId._id : msg.channelId;
      if (msgChannelId === channel._id || msgChannelId?.toString() === channel._id?.toString()) {
        setMessages(prev => {
          // Prevent duplicates
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        socket.emit('mark_read', { channelId: channel._id });
        clearUnread(channel._id);
        
        // Auto-scroll on new messages
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    const handleMessageEdited = ({ messageId, text, editedAt }) => {
      setMessages(prev => prev.map(m => 
        m._id === messageId ? { ...m, text, isEdited: true, editedAt } : m
      ));
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages(prev => prev.map(m => 
        m._id === messageId ? { ...m, isDeleted: true, text: 'This message was deleted' } : m
      ));
    };

    const handleTyping = ({ userId, name, channelId: typingChannelId }) => {
      if (typingChannelId === channel._id && userId !== user._id) {
        setTypingUsers(prev => {
          const next = new Map(prev);
          next.set(userId, name);
          return next;
        });
      }
    };

    const handleStopTyping = ({ userId, channelId: typingChannelId }) => {
      if (typingChannelId === channel._id) {
        setTypingUsers(prev => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
    };
  }, [socket, channel._id, user._id]);

  // Auto-scroll to bottom only on initial load
  useEffect(() => {
    if (isInitialLoad.current && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      isInitialLoad.current = false;
    }
  }, [messages]);

  const handleScroll = () => {
    if (scrollContainerRef.current && !loadingMore) {
      if (scrollContainerRef.current.scrollTop < 50 && hasMore) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchMessages(nextPage);
      }
    }
  };

  const typingNames = Array.from(typingUsers.values());

  return (
    <div className="chat-main" style={{ flexDirection: 'row' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {channel.type === 'direct' ? (
          <DMHeader otherMember={otherMember} />
        ) : (
          <ChannelHeader 
            channel={channel} 
            onToggleMembers={() => setShowMembers(!showMembers)} 
          />
        )}
        
        <div 
          className="message-list" 
          ref={scrollContainerRef}
          onScroll={handleScroll}
        >
          {loadingMore && (
            <div style={{ textAlign: 'center', padding: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
              Loading older messages...
            </div>
          )}
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 'auto', marginBottom: 'auto', color: 'var(--text-muted)' }}>
              <h3>Welcome to {channel.type === 'direct' ? 'this conversation' : `#${channel.name}`}</h3>
              <p>This is the start of the message history.</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const showAvatar = !prevMsg || 
                (prevMsg.senderId?._id || prevMsg.senderId) !== (msg.senderId?._id || msg.senderId);
              return (
                <MessageItem 
                  key={msg._id || idx} 
                  message={msg} 
                  showAvatar={showAvatar} 
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {typingNames.length > 0 && <TypingIndicator users={typingNames} />}

        <MessageInput channel={channel} />
      </div>

      {channel.type === 'channel' && (
        <MembersPanel 
          channel={channel} 
          isOpen={showMembers} 
        />
      )}
    </div>
  );
};

export default MessageWindow;
