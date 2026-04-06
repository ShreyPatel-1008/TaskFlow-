import { useState, useEffect, useRef } from 'react';
import { Edit2, Trash2, Play, Square, Clock, Calendar as CalIcon, Tag, RefreshCw } from 'lucide-react';
import { useTask } from '../../context/TaskContext';
import { formatDate, getStatusLabel, getStatusClass, getPriorityClass, formatTime, isOverdue } from '../../utils/helpers';
import PermissionGate from '../PermissionGate';

const TaskCard = ({ task, index, onEdit, onDelete }) => {
    const { updateTaskStatus } = useTask();
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const statusRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (statusRef.current && !statusRef.current.contains(event.target)) {
                setIsStatusOpen(false);
            }
        };
        if (isStatusOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isStatusOpen]);

    const handleStatusSelect = async (newStatus) => {
        setIsStatusOpen(false);
        if (task.status === newStatus) return;
        try {
            await updateTaskStatus(task._id, newStatus);
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    };

    const overdue = isOverdue(task.dueDate, task.status);

    return (
        <div className={`notion-task-row`} style={{ animationDelay: `${Math.random() * 0.1}s` }}>
            <div className="notion-col-task">
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {index && <span style={{ color: 'var(--text-muted)', fontSize: '13px', minWidth: '16px' }}>{index}.</span>}
                        <span className={`notion-task-title ${task.status === 'COMPLETED' ? 'completed' : ''}`}>
                            {task.title}
                        </span>
                        {task.category && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--text-muted)', fontSize: '11px', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px' }}>
                                <Tag size={10} /> {task.category}
                            </span>
                        )}
                        {task.isDaily && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--accent-primary)', fontSize: '11px', background: 'rgba(108, 92, 231, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                <RefreshCw size={10} /> Daily
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="notion-col-status">
                <div className="notion-status-container" ref={statusRef}>
                    <button
                        className={`notion-status-badge ${getStatusClass(task.status)}`}
                        onClick={() => setIsStatusOpen(!isStatusOpen)}
                    >
                        <span className="status-dot"></span>
                        {getStatusLabel(task.status)}
                    </button>
                    {isStatusOpen && (
                        <div className="notion-status-dropdown">
                            <div className="notion-dropdown-section">
                                <div className="notion-dropdown-header">To-do</div>
                                <div className="notion-dropdown-item" onClick={() => handleStatusSelect('NOT_STARTED')}>
                                    <span className="notion-dropdown-badge not-started">
                                        <span className="status-dot"></span> Not Started
                                    </span>
                                </div>
                            </div>
                            <div className="notion-dropdown-section">
                                <div className="notion-dropdown-header">In progress</div>
                                <div className="notion-dropdown-item" onClick={() => handleStatusSelect('IN_PROGRESS')}>
                                    <span className="notion-dropdown-badge in-progress">
                                        <span className="status-dot"></span> In Progress
                                    </span>
                                </div>
                            </div>
                            <div className="notion-dropdown-section">
                                <div className="notion-dropdown-header">Complete</div>
                                <div className="notion-dropdown-item" onClick={() => handleStatusSelect('COMPLETED')}>
                                    <span className="notion-dropdown-badge completed">
                                        <span className="status-dot"></span> Completed
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="notion-col-priority">
                <span className={`notion-priority-badge ${getPriorityClass(task.priority)}`}>
                    {task.priority || 'None'}
                </span>
            </div>

            <div className="notion-col-due">
                {task.dueDate ? (
                    <span className={`notion-due-date ${overdue ? 'overdue' : ''}`}>
                        {formatDate(task.dueDate)}
                    </span>
                ) : (
                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                )}
            </div>

            <div className="notion-col-actions">
                <PermissionGate action="editTask">
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(task)}>
                        <Edit2 size={14} />
                    </button>
                </PermissionGate>
                <PermissionGate action="deleteTask">
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDelete(task._id)}
                        style={{ color: 'var(--color-danger)' }}>
                        <Trash2 size={14} />
                    </button>
                </PermissionGate>
            </div>
        </div>
    );
};

export default TaskCard;
