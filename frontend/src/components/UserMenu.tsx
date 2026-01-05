import React, { useState, useRef, useEffect } from 'react';
import {
    UserCircleIcon,
    Cog6ToothIcon,
    ArrowRightOnRectangleIcon,
    UsersIcon,
    ChevronDownIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../AuthContext';

interface UserMenuProps {
    onOpenSettings: () => void;
    onOpenUserManagement?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onOpenSettings, onOpenUserManagement }) => {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleLogout = () => {
        logout();
        setIsOpen(false);
    };

    const handleOpenSettings = () => {
        onOpenSettings();
        setIsOpen(false);
    };

    const handleOpenUserManagement = () => {
        if (onOpenUserManagement) {
            onOpenUserManagement();
            setIsOpen(false);
        }
    };

    // All hooks must be called unconditionally at the top level
    
    if (!user) return null;

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
                <UserCircleIcon className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:inline">{user.username}</span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border dark:border-slate-700 py-2 z-50">
                    {/* User info */}
                    <div className="px-4 py-3 border-b dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {user.username}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {user.email}
                        </p>
                        {user.is_admin && (
                            <span className="inline-flex items-center px-2 py-0.5 mt-2 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                Admin
                            </span>
                        )}
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                        <button
                            onClick={handleOpenSettings}
                            className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <Cog6ToothIcon className="w-5 h-5" />
                            <span>Settings</span>
                        </button>

                        {user.is_admin && onOpenUserManagement && (
                            <button
                                onClick={handleOpenUserManagement}
                                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <UsersIcon className="w-5 h-5" />
                                <span>Manage Users</span>
                            </button>
                        )}
                    </div>

                    {/* Logout */}
                    <div className="border-t dark:border-slate-700 pt-1">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <ArrowRightOnRectangleIcon className="w-5 h-5" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserMenu;
