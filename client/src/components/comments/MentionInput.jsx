import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * MentionInput — a controlled textarea with @mention autocomplete.
 *
 * Props:
 *   value       - current text
 *   onChange     - (newText) => void
 *   members     - [{ _id, name, avatar }] workspace members for autocomplete
 *   placeholder - textarea placeholder
 *   onSubmit    - () => void  (called on Ctrl+Enter or Send button)
 *   disabled    - boolean
 *   autoFocus   - boolean
 *   maxRows     - max auto-grow rows (default 6)
 */
const MentionInput = ({
    value,
    onChange,
    members = [],
    placeholder = 'Write a comment...',
    onSubmit,
    disabled = false,
    autoFocus = false,
    maxRows = 6,
}) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [filter, setFilter] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const textareaRef = useRef(null);
    const wrapperRef = useRef(null);

    // Auto-grow textarea height
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        const lineHeight = 22;
        const maxHeight = lineHeight * maxRows;
        el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px';
    }, [value, maxRows]);

    // Check if cursor is inside a @word
    const checkForMention = useCallback(() => {
        if (!members.length) { setShowDropdown(false); return; }

        const el = textareaRef.current;
        if (!el) return;

        const cursorPos = el.selectionStart;
        const textBeforeCursor = value.slice(0, cursorPos);
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

        if (mentionMatch) {
            setFilter(mentionMatch[1].toLowerCase());
            setShowDropdown(true);
            setSelectedIndex(0);
        } else {
            setShowDropdown(false);
        }
    }, [value, members.length]);

    const filteredMembers = members.filter(m =>
        m.name.toLowerCase().startsWith(filter) ||
        m.name.toLowerCase().split(' ')[0].startsWith(filter)
    );

    // Insert a mention handle into text
    const insertMention = (member) => {
        const el = textareaRef.current;
        if (!el) return;

        const cursorPos = el.selectionStart;
        const textBeforeCursor = value.slice(0, cursorPos);
        const mentionStart = textBeforeCursor.lastIndexOf('@');

        const handle = member.name.split(' ')[0].toLowerCase();
        const before = value.slice(0, mentionStart);
        const after = value.slice(cursorPos);
        const newText = `${before}@${handle} ${after}`;

        onChange(newText);
        setShowDropdown(false);

        // Restore focus and cursor position
        requestAnimationFrame(() => {
            el.focus();
            const newPos = mentionStart + handle.length + 2; // @handle + space
            el.setSelectionRange(newPos, newPos);
        });
    };

    // Keyboard navigation
    const handleKeyDown = (e) => {
        if (showDropdown && filteredMembers.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => (i + 1) % filteredMembers.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => (i - 1 + filteredMembers.length) % filteredMembers.length);
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                insertMention(filteredMembers[selectedIndex]);
                return;
            } else if (e.key === 'Escape') {
                setShowDropdown(false);
            }
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (onSubmit) onSubmit();
        }
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative' }}>
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => { onChange(e.target.value); }}
                onKeyUp={checkForMention}
                onKeyDown={handleKeyDown}
                onClick={checkForMention}
                placeholder={placeholder}
                disabled={disabled}
                autoFocus={autoFocus}
                rows={1}
                style={{
                    width: '100%',
                    resize: 'none',
                    padding: '10px 12px',
                    fontSize: '14px',
                    lineHeight: '22px',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '10px',
                    background: 'var(--bg-input, #f8fafc)',
                    color: 'var(--text-primary, #1e293b)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary, #6366f1)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border-color, #e2e8f0)'; }}
            />

            {/* Mention autocomplete dropdown */}
            {showDropdown && filteredMembers.length > 0 && (
                <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    width: '240px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    background: 'var(--bg-card, white)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 50,
                    marginBottom: '4px',
                }}>
                    {filteredMembers.map((member, i) => (
                        <div
                            key={member._id}
                            onMouseDown={(e) => { e.preventDefault(); insertMention(member); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 12px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                background: i === selectedIndex ? 'var(--bg-input, #f1f5f9)' : 'transparent',
                                transition: 'background 100ms',
                            }}
                            onMouseEnter={() => setSelectedIndex(i)}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: '50%',
                                background: 'var(--accent-primary, #6366f1)',
                                color: 'white', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontWeight: 700, fontSize: '11px',
                                flexShrink: 0,
                            }}>
                                {member.avatar
                                    ? <img src={member.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                    : member.name.charAt(0).toUpperCase()
                                }
                            </div>
                            <span style={{ fontWeight: 600 }}>{member.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * Render comment text with @mention chips highlighted.
 * Resolved handles get a light-blue chip; unresolved render as plain text.
 */
export const renderCommentText = (text, members = []) => {
    if (!text) return null;

    const memberNames = new Set(
        members.map(m => m.name.split(' ')[0].toLowerCase())
    );

    // Split on @word patterns
    const parts = text.split(/(@\w+)/g);

    return parts.map((part, i) => {
        if (part.startsWith('@')) {
            const handle = part.slice(1).toLowerCase();
            const isResolved = memberNames.has(handle);
            const member = members.find(m => m.name.split(' ')[0].toLowerCase() === handle);

            if (isResolved) {
                return (
                    <span
                        key={i}
                        className="mention-chip"
                        title={member ? member.name : handle}
                        style={{
                            background: 'rgba(99, 102, 241, 0.12)',
                            color: 'var(--accent-primary, #6366f1)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '13px',
                        }}
                    >
                        {part}
                    </span>
                );
            } else {
                // Unresolved or former member — render plain with tooltip
                return (
                    <span key={i} title="Former member" style={{ opacity: 0.7 }}>
                        {part}
                    </span>
                );
            }
        }
        return <span key={i}>{part}</span>;
    });
};

export default MentionInput;
