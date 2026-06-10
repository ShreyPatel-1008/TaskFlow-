import React, { useState, useEffect, useRef } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import NotificationItem from './NotificationItem';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
    const { 
        notifications, unreadCount, loading, hasMore, 
        fetchNotifications, markRead, markAllRead, loadMore 
    } = useNotifications();
    
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => {
        if (!isOpen) {
            fetchNotifications();
            setTimeout(() => {
                if (unreadCount > 0) markAllRead();
            }, 2000);
        }
        setIsOpen(!isOpen);
    };

    const handleNotifClick = async (notif) => {
        if (!notif.read) markRead(notif._id);
        setIsOpen(false);
        navigate(notif.link);
    };

    return (
        <div className="notif-bell-wrap" ref={dropdownRef}>
            <button 
                onClick={handleToggle}
                className="notif-bell-btn"
                aria-label="Notifications"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="notif-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notif-dropdown">
                    <div className="notif-dropdown-header">
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} className="notif-mark-all">
                                <CheckCheck size={13} /> Mark all read
                            </button>
                        )}
                    </div>

                    <div className="notif-dropdown-body">
                        {notifications.length === 0 && !loading ? (
                            <div className="notif-empty">
                                <div className="notif-empty-icon">
                                    <Bell size={28} />
                                </div>
                                <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>All caught up!</p>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No new notifications.</p>
                            </div>
                        ) : (
                            <>
                                {notifications.map((n) => (
                                    <NotificationItem 
                                        key={n._id} 
                                        notification={n} 
                                        onClick={handleNotifClick} 
                                    />
                                ))}

                                {loading && (
                                    <div className="notif-loading">
                                        <Loader2 size={20} className="notif-spin" />
                                    </div>
                                )}

                                {hasMore && !loading && (
                                    <button onClick={loadMore} className="notif-load-more">
                                        Load More
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
