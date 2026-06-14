const ChatWelcome = () => {
    return (
      <div className="chat-main" style={{ 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'var(--bg-primary)'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '32px' }}>
          <div style={{ 
              width: '80px', 
              height: '80px', 
              background: 'var(--accent-light)', 
              color: 'var(--accent)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '32px'
          }}>
            💬
          </div>
          <h2 style={{ marginBottom: '12px', fontSize: '24px' }}>Welcome to Chat</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Select a channel from the sidebar to start collaborating, or start a new Direct Message with a team member.
          </p>
        </div>
      </div>
    );
  };
  
  export default ChatWelcome;
