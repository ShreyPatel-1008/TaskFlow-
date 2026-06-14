const TypingIndicator = ({ users }) => {
    if (!users || users.length === 0) return null;
  
    const text = users.length === 1 
      ? `${users[0]} is typing` 
      : users.length === 2 
        ? `${users[0]} and ${users[1]} are typing`
        : 'Several people are typing';
  
    return (
      <div className="typing-indicator">
        <div className="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span style={{ fontStyle: 'italic' }}>{text}...</span>
      </div>
    );
  };
  
  export default TypingIndicator;
