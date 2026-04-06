import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Trash2, MessageSquare, ChevronUp, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import MentionInput, { renderCommentText } from './MentionInput';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

/**
 * CommentThread — full comment UI for a task detail panel.
 *
 * Props:
 *   comments        - array of comment objects
 *   totalCount       - total comments (for badge)
 *   hasMore          - whether earlier comments exist
 *   loading          - initial load state
 *   workspaceMembers - [{ _id, name, avatar }] for mention rendering
 *   onAddComment     - async (text) => void
 *   onEditComment    - async (commentId, newText) => void
 *   onDeleteComment  - async (commentId) => void
 *   onLoadEarlier    - async () => void
 */
const CommentThread = ({
    comments,
    totalCount,
    hasMore,
    loading,
    workspaceMembers,
    onAddComment,
    onEditComment,
    onDeleteComment,
    onLoadEarlier,
}) => {
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [loadingEarlier, setLoadingEarlier] = useState(false);
    const threadRef = useRef(null);
    const userScrolledRef = useRef(false);
    const { user } = useAuth();
    const { can } = usePermission();

    // Detect user scroll
    const handleScroll = () => {
        const el = threadRef.current;
        if (!el) return;
        const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
        userScrolledRef.current = !isAtBottom;
    };

    // Auto-scroll to bottom on new comment by current user
    useEffect(() => {
        if (!userScrolledRef.current && threadRef.current) {
            threadRef.current.scrollTop = threadRef.current.scrollHeight;
        }
    }, [comments.length]);

    const handleSend = async () => {
        if (!text.trim() || sending) return;
        setSending(true);
        try {
            await onAddComment(text.trim());
            setText('');
            userScrolledRef.current = false; // auto-scroll after own comment
        } catch (e) {
            toast.error('Failed to send comment');
        } finally {
            setSending(false);
        }
    };

    const handleEdit = async (commentId) => {
        if (!editText.trim()) return;
        try {
            await onEditComment(commentId, editText.trim());
            setEditingId(null);
            setEditText('');
        } catch (e) {
            toast.error('Failed to edit comment');
        }
    };

    const handleDelete = async (commentId) => {
        try {
            await onDeleteComment(commentId);
        } catch (e) {
            toast.error('Failed to delete comment');
        }
    };

    const handleLoadEarlier = async () => {
        setLoadingEarlier(true);
        try {
            await onLoadEarlier();
        } finally {
            setLoadingEarlier(false);
        }
    };

    const isAuthor = (comment) => comment.authorId?._id === user?._id;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 0', borderTop: '1px solid var(--border-light, #e2e8f0)',
                marginTop: '16px',
            }}>
                <MessageSquare size={16} style={{ color: 'var(--accent-primary, #6366f1)' }} />
                <span style={{ fontWeight: 700, fontSize: '14px' }}>Comments</span>
                {totalCount > 0 && (
                    <span style={{
                        background: 'var(--bg-input, #f1f5f9)',
                        padding: '1px 7px', borderRadius: '10px',
                        fontSize: '11px', fontWeight: 600,
                        color: 'var(--text-muted, #64748b)',
                    }}>
                        {totalCount}
                    </span>
                )}
            </div>

            {/* Thread */}
            <div
                ref={threadRef}
                onScroll={handleScroll}
                style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    paddingRight: '4px',
                }}
            >
                {/* Load earlier */}
                {hasMore && (
                    <button
                        onClick={handleLoadEarlier}
                        disabled={loadingEarlier}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--accent-primary, #6366f1)', fontWeight: 600,
                            fontSize: '12px', padding: '6px 0', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', gap: '4px',
                        }}
                    >
                        <ChevronUp size={14} />
                        {loadingEarlier ? 'Loading...' : 'Load earlier comments'}
                    </button>
                )}

                {loading && comments.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        <Loader2 size={20} className="spinner" style={{ margin: '0 auto' }} />
                    </div>
                )}

                {!loading && comments.length === 0 && (
                    <div style={{
                        textAlign: 'center', padding: '24px',
                        color: 'var(--text-muted, #94a3b8)', fontSize: '13px',
                    }}>
                        No comments yet. Be the first to comment!
                    </div>
                )}

                {comments.map(comment => (
                    <div key={comment._id} style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: comment.pending ? 'rgba(99,102,241,0.04)' : 'transparent',
                        opacity: comment.pending ? 0.6 : 1,
                        transition: 'opacity 200ms',
                    }}>
                        {comment.deleted ? (
                            /* ---- Soft-deleted comment ---- */
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic',
                                fontSize: '13px',
                            }}>
                                <div style={{
                                    width: 24, height: 24, borderRadius: '50%',
                                    background: 'var(--bg-input, #f1f5f9)',
                                    flexShrink: 0,
                                }} />
                                <span>This comment was deleted</span>
                            </div>
                        ) : editingId === comment._id ? (
                            /* ---- Inline edit mode ---- */
                            <div>
                                <MentionInput
                                    value={editText}
                                    onChange={setEditText}
                                    members={workspaceMembers}
                                    autoFocus
                                    maxRows={4}
                                />
                                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => { setEditingId(null); setEditText(''); }}
                                        style={{
                                            background: 'var(--bg-input)', border: 'none',
                                            padding: '4px 12px', borderRadius: '6px',
                                            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                        }}
                                    >Cancel</button>
                                    <button
                                        onClick={() => handleEdit(comment._id)}
                                        style={{
                                            background: 'var(--accent-primary, #6366f1)', color: 'white',
                                            border: 'none', padding: '4px 12px', borderRadius: '6px',
                                            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                        }}
                                    >Save</button>
                                </div>
                            </div>
                        ) : (
                            /* ---- Normal comment ---- */
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: 26, height: 26, borderRadius: '50%',
                                            background: 'var(--accent-primary, #6366f1)',
                                            color: 'white', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', fontWeight: 700, fontSize: '11px',
                                            flexShrink: 0,
                                        }}>
                                            {comment.authorId?.avatar
                                                ? <img src={comment.authorId.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                                : comment.authorId?.name?.charAt(0).toUpperCase() || '?'
                                            }
                                        </div>
                                        <span style={{ fontWeight: 600, fontSize: '13px' }}>
                                            {comment.authorId?.name || 'Unknown'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
                                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                        </span>
                                        {comment.edited && (
                                            <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>
                                                (edited)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div style={{
                                    fontSize: '13.5px', lineHeight: 1.6,
                                    color: 'var(--text-primary, #334155)',
                                    wordBreak: 'break-word',
                                    paddingLeft: '34px', // align with name
                                }}>
                                    {renderCommentText(comment.text, workspaceMembers)}
                                </div>

                                {/* Action icons on hover */}
                                {!comment.pending && (
                                    <div style={{ paddingLeft: '34px', marginTop: '4px', display: 'flex', gap: '4px' }}>
                                        {isAuthor(comment) && (
                                            <button
                                                onClick={() => { setEditingId(comment._id); setEditText(comment.text); }}
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    padding: '2px 6px', borderRadius: '4px',
                                                    color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600,
                                                }}
                                                title="Edit"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                        )}
                                        {(isAuthor(comment) || can('removeMembers')) && (
                                            <button
                                                onClick={() => handleDelete(comment._id)}
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    padding: '2px 6px', borderRadius: '4px',
                                                    color: 'var(--text-muted)', fontSize: '11px',
                                                }}
                                                title="Delete"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Input area — pinned to bottom */}
            {can('comment') && (
                <div style={{
                    display: 'flex', gap: '8px', alignItems: 'flex-end',
                    paddingTop: '10px', borderTop: '1px solid var(--border-light, #e2e8f0)',
                    marginTop: '8px',
                }}>
                    <div style={{ flex: 1 }}>
                        <MentionInput
                            value={text}
                            onChange={setText}
                            members={workspaceMembers}
                            placeholder="Add a comment... (Ctrl+Enter to send)"
                            onSubmit={handleSend}
                            disabled={sending}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!text.trim() || sending}
                        style={{
                            padding: '10px 16px',
                            background: text.trim() ? 'var(--accent-primary, #6366f1)' : 'var(--bg-input, #e2e8f0)',
                            color: text.trim() ? 'white' : 'var(--text-muted, #94a3b8)',
                            border: 'none', borderRadius: '10px',
                            fontWeight: 700, fontSize: '13px', cursor: text.trim() ? 'pointer' : 'default',
                            transition: 'all 200ms',
                            flexShrink: 0,
                        }}
                    >
                        {sending ? '...' : 'Send'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default CommentThread;
