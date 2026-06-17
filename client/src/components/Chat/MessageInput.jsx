import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import API from '../../utils/api';
import MentionAutocomplete from './MentionAutocomplete';

const MessageInput = ({ channel }) => {
  const [text, setText] = useState('');
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionPosition, setMentionPosition] = useState({ bottom: 60, left: 16 });
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  
  const { activeWorkspace } = useWorkspace();
  const { socket } = useSocket();
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const wrapperRef = useRef(null);

  // Load workspace members for mention autocomplete
  useEffect(() => {
    if (activeWorkspace) {
      API.get(`/workspaces/${activeWorkspace._id}/members`)
        .then(res => {
          // API returns array of WorkspaceMember docs with userId populated
          const data = Array.isArray(res.data) ? res.data : (res.data.members || []);
          const mapped = data
            .filter(m => m.userId)
            .map(m => ({
              _id: m.userId._id,
              name: m.userId.name,
              email: m.userId.email,
              avatar: m.userId.avatar
            }));
          setWorkspaceMembers(mapped);
        })
        .catch(console.error);
    }
  }, [activeWorkspace]);

  // Reset state when channel changes
  useEffect(() => {
    setText('');
    setMentionQuery(null);
  }, [channel?._id]);

  // Clean up typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Emit typing_stop on unmount
      if (socket && channel?._id) {
        socket.emit('typing_stop', { channelId: channel._id });
      }
    };
  }, [socket, channel?._id]);

  // Close autocomplete on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setMentionQuery(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = () => {
    console.log('handleSend clicked!', { text, socket: !!socket, channelId: channel?._id });
    if (!text.trim()) {
      console.log('Text is empty, aborting');
      return;
    }
    if (!socket) {
      console.log('Socket is null or undefined, aborting');
      alert('Cannot send message: Not connected to real-time server (socket is null)');
      return;
    }
    if (!channel?._id) {
      console.error('No active channel');
      return;
    }
    
    console.log('Emitting send_message to socket...');
    socket.emit('send_message', {
      channelId: channel._id,
      text: text.trim()
    });
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('typing_stop', { channelId: channel._id });
    setText('');
    setMentionQuery(null);
  };

  const handleTyping = (value) => {
    if (!socket || !channel?._id) return;
    
    if (value.trim()) {
      socket.emit('typing_start', { channelId: channel._id });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', { channelId: channel._id });
      }, 2000);
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit('typing_stop', { channelId: channel._id });
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setText(value);

    // Detect @ trigger
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionPosition({ bottom: 60, left: 16 });
    } else {
      setMentionQuery(null);
    }

    handleTyping(value);
  };

  const handleMentionSelect = (member) => {
    const newText = text.replace(/@(\w*)$/, `@${member.name} `);
    setText(newText);
    setMentionQuery(null);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && mentionQuery !== null) {
      setMentionQuery(null);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && mentionQuery === null) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="message-input-wrapper" ref={wrapperRef}>
      {mentionQuery !== null && (
        <MentionAutocomplete
          query={mentionQuery}
          members={workspaceMembers}
          onSelect={handleMentionSelect}
          position={mentionPosition}
          channelType={channel.type}
        />
      )}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={`Message ${channel.type === 'direct' ? 'conversation' : '#' + channel.name} — use @ to mention`}
        className="message-input"
        rows={1}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim()}
        className="btn btn-primary send-btn"
        style={{ padding: '10px 16px', borderRadius: '8px' }}
      >
        Send
      </button>
    </div>
  );
};

export default MessageInput;
