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
            // Optional: Mark all as read after 2s delay
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
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={handleToggle}
                className="relative p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95 group"
                aria-label="Notifications"
            >
                <Bell className={`w-5 h-5 ${isOpen ? 'text-blue-600 fill-blue-50/50' : 'text-gray-500'} group-hover:text-blue-600`} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 animate-badge-pulse shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                        <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={markAllRead}
                                className="text-blue-600 hover:text-blue-700 text-xs font-semibold flex items-center gap-1 hover:underline underline-offset-4"
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                        {notifications.length === 0 && !loading ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center">
                                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                                    <Bell className="w-8 h-8 text-blue-500 opacity-50" />
                                </div>
                                <p className="text-gray-900 dark:text-white font-semibold">All caught up!</p>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">No new notifications to show.</p>
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
                                    <div className="flex items-center justify-center p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                    </div>
                                )}

                                {hasMore && !loading && (
                                    <button 
                                        onClick={loadMore}
                                        className="w-full py-3 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest border-t border-gray-100 dark:border-gray-700"
                                    >
                                        Load More
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes badge-pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.15); box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2); }
                    100% { transform: scale(1); }
                }
                .animate-badge-pulse {
                    animation: badge-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}} />
        </div>
    );
};

export default NotificationBell;
