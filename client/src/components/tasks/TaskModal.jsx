import { useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { CATEGORIES, PRIORITIES, STATUSES } from '../../utils/helpers';
import { useComments } from '../../hooks/useComments';
import CommentThread from '../comments/CommentThread';

const TaskModal = ({ task, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        title: task?.title || '',
        description: task?.description || '',
        status: task?.status || 'NOT_STARTED',
        priority: task?.priority || 'MEDIUM',
        category: task?.category || 'General',
        dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        isDaily: task ? (task.isDaily ?? true) : true
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Comments — only load when editing an existing task
    const {
        comments,
        totalCount,
        hasMore,
        loading: commentsLoading,
        workspaceMembers,
        addComment,
        editComment,
        deleteComment,
        loadEarlier,
    } = useComments(task?._id || null);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            setError('Task title is required');
            return;
        }
        setLoading(true);
        try {
            await onSave({
                ...formData,
                dueDate: formData.dueDate || null
            });
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save task');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal"
                onClick={e => e.stopPropagation()}
                style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            >
                <div className="modal-header">
                    <h2 className="modal-title">{task ? 'Edit Task' : 'Create New Task'}</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <div style={{ overflowY: 'auto', flex: 1, padding: '0 var(--space-6, 24px)' }}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Title *</label>
                            <input
                                type="text"
                                name="title"
                                className="form-input"
                                placeholder="What needs to be done?"
                                value={formData.title}
                                onChange={handleChange}
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                                name="description"
                                className="form-textarea"
                                placeholder="Add more details..."
                                value={formData.description}
                                onChange={handleChange}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select name="status" className="form-select" value={formData.status} onChange={handleChange}>
                                    <option value="NOT_STARTED">Not Started</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Priority</label>
                                <select name="priority" className="form-select" value={formData.priority} onChange={handleChange}>
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select name="category" className="form-select" value={formData.category} onChange={handleChange}>
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Due Date</label>
                                <input
                                    type="date"
                                    name="dueDate"
                                    className="form-input"
                                    value={formData.dueDate}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Daily Task Toggle */}
                        <div className="form-group">
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: 'var(--space-4)', background: formData.isDaily ? 'rgba(108, 92, 231, 0.1)' : 'var(--bg-input)',
                                borderRadius: 'var(--radius-md)', border: `1px solid ${formData.isDaily ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                transition: 'all 200ms ease', cursor: 'pointer'
                            }} onClick={() => setFormData(prev => ({ ...prev, isDaily: !prev.isDaily }))}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                    <RefreshCw size={18} style={{ color: formData.isDaily ? 'var(--accent-primary-light)' : 'var(--text-muted)' }} />
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Repeat Daily</div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{formData.isDaily ? 'Resets to "Not Started" every day at 4:00 AM' : 'One-time task — will not repeat'}</div>
                                    </div>
                                </div>
                                <div style={{
                                    width: 44, height: 24, borderRadius: 12, padding: 2,
                                    background: formData.isDaily ? 'var(--accent-primary)' : 'var(--border-color)',
                                    transition: 'background 200ms ease', flexShrink: 0
                                }}>
                                    <div style={{
                                        width: 20, height: 20, borderRadius: '50%', background: 'white',
                                        transform: formData.isDaily ? 'translateX(20px)' : 'translateX(0)',
                                        transition: 'transform 200ms ease',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                    }} />
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}
                            </button>
                        </div>
                    </form>

                    {/* Comment Thread — only shown when editing an existing task */}
                    {task?._id && (
                        <CommentThread
                            comments={comments}
                            totalCount={totalCount}
                            hasMore={hasMore}
                            loading={commentsLoading}
                            workspaceMembers={workspaceMembers}
                            onAddComment={addComment}
                            onEditComment={editComment}
                            onDeleteComment={deleteComment}
                            onLoadEarlier={loadEarlier}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskModal;
