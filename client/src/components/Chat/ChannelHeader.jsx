const ChannelHeader = ({ channel, onToggleMembers }) => {
    return (
      <div style={{ 
          padding: '16px', 
          borderBottom: '1px solid var(--border-color)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="channel-hash">#</span>
            {channel.name}
          </h3>
          {channel.description && (
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              {channel.description}
            </p>
          )}
        </div>
        <button 
            onClick={onToggleMembers}
            style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                padding: '6px 12px',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500
            }}
        >
            Members
        </button>
      </div>
    );
  };
  
  export default ChannelHeader;
