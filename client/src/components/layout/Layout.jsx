import { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut, User, ChevronDown } from 'lucide-react';
import Sidebar from './Sidebar';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import NotificationBell from '../NotificationBell';
import ThemeToggle from '../ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const PAGE_META = {
    '/': { title: 'Dashboard', subtitle: 'Your productivity at a glance' },
    '/tasks': { title: 'Tasks', subtitle: 'Manage and track your tasks' },
    '/analytics': { title: 'Analytics', subtitle: 'Insights into your progress' },
    '/calendar': { title: 'Calendar', subtitle: 'Plan your schedule' },
    '/notes': { title: 'Notes', subtitle: 'Quick thoughts & ideas' },
};

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const meta = PAGE_META[location.pathname] || { title: 'TaskFlow', subtitle: '' };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close sidebar on mobile when navigating
    useEffect(() => {
        if (window.innerWidth <= 768) {
            setIsSidebarOpen(false);
        }
    }, [location.pathname]);

    const handleLogout = () => {
        setIsProfileOpen(false);
        logout();
        navigate('/login');
    };

    return (
        <div className={`app-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
            {/* Added an overlay for mobile */}
            {isSidebarOpen && (
                <div 
                    className="sidebar-overlay" 
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
            <Sidebar isOpen={isSidebarOpen} />
            <main className="main-content">
                <header className="topbar">
                    <div className="topbar-left">
                        <button
                            type="button"
                            className="btn btn-ghost btn-icon topbar-menu"
                            onClick={() => setIsSidebarOpen((open) => !open)}
                            aria-label="Toggle navigation"
                        >
                            <Menu size={18} />
                        </button>
                        <WorkspaceSwitcher />
                        <div className="topbar-divider" style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0', margin: '0 12px' }} />
                        <div className="topbar-title-group">
                            <div className="topbar-title">{meta.title}</div>
                            {meta.subtitle && <div className="topbar-subtitle">{meta.subtitle}</div>}
                        </div>
                    </div>
                    <div className="topbar-right">
                        <NotificationBell />
                        <ThemeToggle />
                        {user && (
                            <div className="topbar-profile" ref={profileRef}>
                                <button
                                    className="topbar-profile-trigger"
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    aria-label="User menu"
                                >
                                    <div className="topbar-user-avatar">
                                        {user.avatar ? (
                                            <img src={user.avatar} alt={user.name} className="topbar-user-avatar-img" />
                                        ) : (
                                            user.name?.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <ChevronDown size={14} className={`topbar-chevron ${isProfileOpen ? 'open' : ''}`} />
                                </button>
                                {isProfileOpen && (
                                    <div className="topbar-dropdown">
                                        <div className="topbar-dropdown-header">
                                            <div className="topbar-dropdown-avatar">
                                                {user.avatar ? (
                                                    <img src={user.avatar} alt={user.name} className="topbar-dropdown-avatar-img" />
                                                ) : (
                                                    user.name?.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className="topbar-dropdown-info">
                                                <span className="topbar-dropdown-name">{user.name}</span>
                                                <span className="topbar-dropdown-email">{user.email}</span>
                                            </div>
                                        </div>
                                        <div className="topbar-dropdown-divider" />
                                        <button className="topbar-dropdown-item" onClick={handleLogout}>
                                            <LogOut size={16} />
                                            <span>Sign out</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </header>
                <div className="main-scroll">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
