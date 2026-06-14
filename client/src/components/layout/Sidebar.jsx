import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { useChat } from '../../context/ChatContext';
import { useNotifications } from '../../hooks/useNotifications';
import {
    LayoutDashboard,
    CheckSquare,
    BarChart3,
    Calendar,
    StickyNote,
    Users,
    Settings2,
    Repeat,
    MessageSquare,
} from 'lucide-react';

const Sidebar = ({ isOpen }) => {
    const { user } = useAuth();
    const { role } = usePermission();
    const tasksPath = role === 'member' ? '/tasks?assignee=me' : '/tasks';

    const { unreadCounts } = useChat();
    const { notifications } = useNotifications();

    const chatMentionCount = notifications.filter(
        n => n.type === 'mention' && 
             n.link?.includes('/chat') && 
             !n.read
    ).length;

    const totalChatUnread = Object.values(unreadCounts)
        .reduce((sum, count) => sum + count, 0);

    const chatBadge = chatMentionCount || totalChatUnread;

    const navItems = [
        { path: '/', icon: <LayoutDashboard />, label: 'Dashboard' },
        { path: tasksPath, icon: <CheckSquare />, label: 'Tasks' },
        { path: '/notes', icon: <StickyNote />, label: 'Notes' },
        { path: '/chat', icon: <MessageSquare />, label: 'Chat', badge: chatBadge },
        { path: '/analytics', icon: <BarChart3 />, label: 'Analytics' },
        { path: '/calendar', icon: <Calendar />, label: 'Calendar' },
        { path: '/members', icon: <Users />, label: 'Team' },
    ];

    const settingsItems = [
        { path: '/settings/custom-fields', icon: <Settings2 />, label: 'Custom Fields' },
        { path: '/settings/recurring-tasks', icon: <Repeat />, label: 'Recurring Tasks' },
    ];

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">⚡</div>
                <h1>TaskFlow</h1>
            </div>

            <nav className="sidebar-nav">
                <span className="sidebar-section-title">Main Menu</span>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? 'active' : ''}`
                        }
                        end={item.path === '/'}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                        {item.badge > 0 && (
                            <span className="nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>
                        )}
                    </NavLink>
                ))}

                <span className="sidebar-section-title" style={{ marginTop: '16px' }}>Settings</span>
                {settingsItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? 'active' : ''}`
                        }
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {user && (
                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">
                        {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="sidebar-user-avatar-img" />
                        ) : (
                            user.name?.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user.name}</div>
                        <div className="sidebar-user-email">{user.email}</div>
                    </div>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;

