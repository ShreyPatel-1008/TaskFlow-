import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTask } from '../context/TaskContext';
import TaskCard from '../components/tasks/TaskCard';
import TaskModal from '../components/tasks/TaskModal';
import { Plus, Search, Filter, ListFilter, User as UserIcon } from 'lucide-react';
import { getStatusLabel, STATUSES, PRIORITIES, CATEGORIES } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import PermissionGate from '../components/PermissionGate';
import { usePermission } from '../hooks/usePermission';

const getUserId = (user) => {
    const id = user?.id || user?._id;
    return id ? String(id) : '';
};

const Tasks = () => {
    const { user: currentUser, loading: authLoading } = useAuth();
    const { activeWorkspace } = useWorkspace();
    const { role } = usePermission();
    const [searchParams, setSearchParams] = useSearchParams();
    const userId = getUserId(currentUser);
    const isMember = role === 'member';
    const { tasks, loading, fetchTasks, createTask, updateTask, deleteTask, fetchCategories } = useTask();
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ status: '', priority: '', category: '', assigneeId: '' });
    const [showFilters, setShowFilters] = useState(false);

    // Members default to "My Tasks"; admins use URL params
    useEffect(() => {
        if (authLoading || !userId) return;

        const assigneeParam = searchParams.get('assignee');
        if (isMember && assigneeParam !== 'me') {
            const next = new URLSearchParams(searchParams);
            next.set('assignee', 'me');
            setSearchParams(next, { replace: true });
            return;
        }

        let assigneeId = '';
        if (assigneeParam === 'me') assigneeId = userId;
        else if (assigneeParam === 'unassigned') assigneeId = 'unassigned';

        setFilters((prev) => {
            if (prev.assigneeId === assigneeId) return prev;
            return { ...prev, assigneeId };
        });
    }, [searchParams, userId, isMember, authLoading, setSearchParams]);

    const loadTasks = useCallback(() => {
        if (!activeWorkspace || authLoading) return;
        if (searchParams.get('assignee') === 'me' && !userId) return;

        const params = { search: search || undefined };
        if (filters.status) params.status = filters.status;
        if (filters.priority) params.priority = filters.priority;
        if (filters.category) params.category = filters.category;

        if (isMember || filters.assigneeId === userId) {
            params.assigneeId = 'me';
        } else if (filters.assigneeId) {
            params.assigneeId = filters.assigneeId;
        }

        fetchTasks(params);
    }, [fetchTasks, search, filters, activeWorkspace, isMember, userId, authLoading, searchParams]);

    useEffect(() => {
        if (activeWorkspace && !authLoading) {
            loadTasks();
            fetchCategories();
        }
    }, [loadTasks, fetchCategories, activeWorkspace, authLoading]);

    const handleCreateTask = async (data) => {
        await createTask(data);
    };

    const handleUpdateTask = async (data) => {
        await updateTask(editingTask._id, data);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            await deleteTask(id);
        }
    };

    const handleEdit = (task) => {
        setEditingTask(task);
        setShowModal(true);
    };

    const clearFilters = () => {
        setFilters({
            status: '',
            priority: '',
            category: '',
            assigneeId: isMember ? userId : '',
        });
        setSearch('');
        const next = new URLSearchParams(searchParams);
        if (isMember) next.set('assignee', 'me');
        else next.delete('assignee');
        next.delete('due');
        setSearchParams(next, { replace: true });
    };

    const toggleMyTasks = () => {
        if (isMember) return;

        const isActive = filters.assigneeId === userId;
        const next = new URLSearchParams(searchParams);

        if (isActive) {
            setFilters((prev) => ({ ...prev, assigneeId: '' }));
            next.delete('assignee');
        } else {
            setFilters((prev) => ({ ...prev, assigneeId: userId }));
            next.set('assignee', 'me');
        }

        setSearchParams(next, { replace: true });
    };

    const hasActiveFilters = filters.status || filters.priority || filters.category || filters.assigneeId || search;

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Tasks</h1>
                    <p className="page-header-subtitle">
                        {isMember ? 'Tasks assigned to you in this workspace' : 'Manage and track all your tasks'}
                    </p>
                </div>
                <PermissionGate action="createTask">
                    <button id="create-task-btn" className="btn btn-primary" onClick={() => {
                        setEditingTask(null);
                        setShowModal(true);
                    }}>
                        <Plus size={18} />
                        New Task
                    </button>
                </PermissionGate>
            </div>

            {/* Toolbar: search, filters, summary */}
            <div className="card" style={{ marginBottom: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="search-bar" style={{ flex: '1', minWidth: '260px' }}>
                        <Search size={18} />
                        <input
                            id="task-search"
                            type="text"
                            placeholder="Search tasks by title or description..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                        <button
                            className={`btn ${filters.assigneeId === userId ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={toggleMyTasks}
                            type="button"
                        >
                            <UserIcon size={16} />
                            My Tasks
                        </button>
                        <button
                            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setShowFilters(!showFilters)}
                            type="button"
                        >
                            <ListFilter size={16} />
                            Filters
                        </button>
                        {hasActiveFilters && (
                            <button type="button" className="btn btn-ghost" onClick={clearFilters}>
                                Clear all
                            </button>
                        )}
                    </div>
                </div>

                {showFilters && (
                    <div className="filters-bar" style={{ animation: 'fadeInUp 0.2s ease' }}>
                        <select
                            className="form-select"
                            value={filters.status}
                            onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            style={{ width: 'auto', minWidth: '150px' }}
                        >
                            <option value="">All statuses</option>
                            {STATUSES.map(s => (
                                <option key={s} value={s}>{getStatusLabel(s)}</option>
                            ))}
                        </select>
                        <select
                            className="form-select"
                            value={filters.priority}
                            onChange={e => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                            style={{ width: 'auto', minWidth: '150px' }}
                        >
                            <option value="">All priorities</option>
                            {PRIORITIES.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                        <select
                            className="form-select"
                            value={filters.category}
                            onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
                            style={{ width: 'auto', minWidth: '150px' }}
                        >
                            <option value="">All categories</option>
                            {CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Status Summary Chips */}
                <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                        Status overview
                    </span>
                    <span
                        className="filter-chip"
                        onClick={() => setFilters(prev => ({ ...prev, status: '' }))}
                        style={
                            !filters.status
                                ? {
                                    borderColor: 'var(--accent-primary)',
                                    color: 'var(--accent-primary-light)',
                                    background: 'rgba(108, 92, 231, 0.1)',
                                }
                                : {}
                        }
                    >
                        All ({tasks.length})
                    </span>
                    {STATUSES.map(s => {
                        const count = tasks.filter(t => t.status === s).length;
                        return (
                            <span
                                key={s}
                                className={`filter-chip ${filters.status === s ? 'active' : ''}`}
                                onClick={() =>
                                    setFilters(prev => ({
                                        ...prev,
                                        status: prev.status === s ? '' : s,
                                    }))
                                }
                            >
                                {getStatusLabel(s)} ({count})
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Task List */}
            {loading ? (
                <div className="loading-spinner"><div className="spinner" /></div>
            ) : tasks.length > 0 ? (
                <div className="notion-table-container">
                    <div className="notion-table-header">
                        <div className="notion-col-task" style={{ paddingLeft: '8px' }}>
                            <span style={{ marginRight: '6px', opacity: 0.7 }}>Aa</span> Task
                        </div>
                        <div className="notion-col-status">
                            <span style={{ marginRight: '6px', opacity: 0.7 }}>📋</span> Status
                        </div>
                        <div className="notion-col-priority">
                            <span style={{ marginRight: '6px', opacity: 0.7 }}>🔼</span> Priority
                        </div>
                        <div className="notion-col-assignee">
                            <span style={{ marginRight: '6px', opacity: 0.7 }}>👤</span> Assignee
                        </div>
                        <div className="notion-col-due">
                            <span style={{ marginRight: '6px', opacity: 0.7 }}>📅</span> Due Date
                        </div>
                        <div className="notion-col-actions" style={{ justifyContent: 'center' }}>
                            <span style={{ opacity: 0.7 }}>+ ⋯</span>
                        </div>
                    </div>
                    <div className="notion-table-body">
                        {tasks.map((task, index) => (
                            <TaskCard key={task._id} task={task} index={index + 1} onEdit={handleEdit} onDelete={handleDelete} />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <h3 className="empty-state-title">No tasks found</h3>
                    <p className="empty-state-text">
                        {hasActiveFilters
                            ? 'Try adjusting your filters or search query'
                            : 'Create your first task to get started on your productivity journey!'}
                    </p>
                    {!hasActiveFilters && (
                        <button className="btn btn-primary" onClick={() => { setEditingTask(null); setShowModal(true); }}>
                            <Plus size={18} /> Create Task
                        </button>
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <TaskModal
                    task={editingTask}
                    onClose={() => { setShowModal(false); setEditingTask(null); }}
                    onSave={editingTask ? handleUpdateTask : handleCreateTask}
                />
            )}
        </div>
    );
};

export default Tasks;
