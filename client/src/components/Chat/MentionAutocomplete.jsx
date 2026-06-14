const MentionAutocomplete = ({ 
    query, 
    members, 
    onSelect, 
    position,
    channelType
  }) => {
    const filtered = members.filter(m =>
      m.name.toLowerCase().includes(query.toLowerCase())
    );
  
    // Add special mentions at top ONLY if it's a channel, not a DM
    let specialMentions = [];
    if (channelType !== 'direct') {
        specialMentions = [
            { _id: 'everyone', name: 'everyone', subtitle: 'Notify all members' },
            { _id: 'here', name: 'here', subtitle: 'Notify online members' }
        ];
    }
  
    const allOptions = [...specialMentions, ...filtered];
  
    if (allOptions.length === 0) return null;
  
    return (
      <div 
        className="mention-autocomplete"
        style={{ bottom: position.bottom, left: position.left }}
      >
        <div className="mention-autocomplete-header">
          Members
        </div>
        {allOptions.map(member => (
          <div
            key={member._id}
            className="mention-option"
            onClick={() => onSelect(member)}
          >
            {member._id === 'everyone' || member._id === 'here' ? (
              <>
                <span className="mention-special-icon">@</span>
                <div className="mention-info">
                  <span className="mention-name">@{member.name}</span>
                  <span className="mention-subtitle">{member.subtitle}</span>
                </div>
              </>
            ) : (
              <>
                <img 
                  src={member.avatar || '/default-avatar.png'} 
                  className="mention-avatar"
                  alt={member.name}
                />
                <div className="mention-info">
                  <span className="mention-name">{member.name}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  export default MentionAutocomplete;
