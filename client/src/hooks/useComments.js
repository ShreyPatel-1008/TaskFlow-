import { useState, useEffect, useRef, useCallback } from 'react';
import API from '../utils/api';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';

/**
 * useComments hook — manages comment state, polling, and optimistic updates.
 *
 * Option A: Polling (implemented). Polls every 5s when taskId is set.
 * // TODO: upgrade to Socket.io (Option B) for real-time push.
 *
 * @param {string|null} taskId - The task whose comments to load, or null to disable
 */
export const useComments = (taskId) => {
    const [comments, setComments] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [workspaceMembers, setWorkspaceMembers] = useState([]);
    const { activeWorkspace } = useWorkspace();
    const { user } = useAuth();
    const pollingRef = useRef(null);
    const mountedRef = useRef(true);

    // Fetch workspace members once (for mention autocomplete)
    useEffect(() => {
        if (!activeWorkspace?._id) return;
        const fetchMembers = async () => {
            try {
                const res = await API.get(`/workspaces/${activeWorkspace._id}/members`);
                if (mountedRef.current) {
                    setWorkspaceMembers(
                        res.data
                            .filter(m => m.userId) // guard against nulls
                            .map(m => ({
                                _id: m.userId._id,
                                name: m.userId.name,
                                avatar: m.userId.avatar,
                                role: m.role
                            }))
                    );
                }
            } catch (e) {
                console.error('Failed to fetch members for mentions:', e);
            }
        };
        fetchMembers();
    }, [activeWorkspace?._id]);

    // Fetch comments (initial + polling)
    const fetchComments = useCallback(async (page = 1, limit = 50) => {
        if (!taskId) return;
        try {
            if (page === 1) setLoading(true);
            const res = await API.get(`/tasks/${taskId}/comments`, {
                params: { page, limit }
            });

            if (!mountedRef.current) return;

            if (page === 1) {
                setComments(res.data.comments);
            } else {
                // Prepend older comments (for "Load earlier")
                setComments(prev => [...res.data.comments, ...prev]);
            }
            setTotalCount(res.data.totalCount);
            setHasMore(res.data.hasMore);
            setError(null);
        } catch (e) {
            if (mountedRef.current) setError('Failed to load comments');
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [taskId]);

    // Polling merge — fetch latest and merge by _id
    const pollComments = useCallback(async () => {
        if (!taskId) return;
        try {
            const res = await API.get(`/tasks/${taskId}/comments`, {
                params: { page: 1, limit: 50 }
            });
            if (!mountedRef.current) return;

            setComments(prev => {
                const existingIds = new Set(prev.map(c => c._id));
                const newOnes = res.data.comments.filter(c => !existingIds.has(c._id));
                // Also update edited/deleted states
                const updated = prev.map(existing => {
                    const fresh = res.data.comments.find(c => c._id === existing._id);
                    return fresh || existing;
                });
                return [...updated, ...newOnes];
            });
            setTotalCount(res.data.totalCount);
        } catch (e) {
            // Silent polling failures
        }
    }, [taskId]);

    // Start/stop polling
    useEffect(() => {
        mountedRef.current = true;

        if (taskId) {
            fetchComments(1, 50);
            pollingRef.current = setInterval(pollComments, 5000);
        }

        return () => {
            mountedRef.current = false;
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [taskId, fetchComments, pollComments]);

    // Optimistic: add comment
    const addComment = async (text) => {
        const tempId = `temp_${Date.now()}`;
        const optimistic = {
            _id: tempId,
            taskId,
            authorId: { _id: user._id, name: user.name, avatar: user.avatar },
            text,
            mentions: [],
            edited: false,
            deleted: false,
            createdAt: new Date().toISOString(),
            pending: true
        };

        setComments(prev => [...prev, optimistic]);

        try {
            const res = await API.post(`/tasks/${taskId}/comments`, { text });
            if (mountedRef.current) {
                setComments(prev => prev.map(c => c._id === tempId ? res.data : c));
                setTotalCount(prev => prev + 1);
            }
            return res.data;
        } catch (e) {
            if (mountedRef.current) {
                setComments(prev => prev.filter(c => c._id !== tempId));
            }
            throw e;
        }
    };

    // Optimistic: edit comment
    const editComment = async (commentId, newText) => {
        setComments(prev => prev.map(c =>
            c._id === commentId ? { ...c, text: newText, edited: true, editedAt: new Date().toISOString() } : c
        ));

        try {
            const res = await API.patch(`/tasks/${taskId}/comments/${commentId}`, { text: newText });
            if (mountedRef.current) {
                setComments(prev => prev.map(c => c._id === commentId ? res.data : c));
            }
        } catch (e) {
            // Revert — re-fetch
            await fetchComments();
            throw e;
        }
    };

    // Optimistic: soft delete
    const deleteComment = async (commentId) => {
        setComments(prev => prev.map(c =>
            c._id === commentId ? { ...c, deleted: true, text: null } : c
        ));

        try {
            await API.delete(`/tasks/${taskId}/comments/${commentId}`);
        } catch (e) {
            await fetchComments();
            throw e;
        }
    };

    // Load earlier page
    const loadEarlier = async () => {
        const currentPages = Math.ceil(comments.length / 50);
        await fetchComments(currentPages + 1, 50);
    };

    return {
        comments,
        totalCount,
        hasMore,
        loading,
        error,
        addComment,
        editComment,
        deleteComment,
        loadEarlier,
        workspaceMembers
    };
};
