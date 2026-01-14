import React, { useState, useEffect } from 'react';
import { XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import api from '../api';
import AITemplateManager from './AITemplateManager';

interface UserSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface UserSettings {
    username: string;
    email: string;
    theme_preference: string;
    reading_preferences: {
        font_size: number;
        font_family: string;
        page_layout: string;
        recently_read_limit_days: number;
    };
    notification_preferences: {
        notifications_enabled: boolean;
    };
}

const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ isOpen, onClose }) => {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'general' | 'ai'>('general');

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState('');
    const [passwordError, setPasswordError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchSettings();
        }
    }, [isOpen]);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/users/me/settings');
            setSettings(response.data);
        } catch (err: unknown) {
            setError('Failed to load settings');
            console.error(err);
        }
    };
    
    // ... handleSaveSettings and handleChangePassword remain same ...
    // Using previous implementation for handlers to avoid re-writing large blocks if possible
    // Wait, replacing the top part means I need to keep the handlers. 
    // I will use replace_file_content carefully.
    
    const handleSaveSettings = async () => {
        if (!settings) return;

        setLoading(true);
        setSaveMessage('');
        setError('');

        try {
            await api.put('/users/me/settings', {
                username: settings.username,
                email: settings.email,
                theme_preference: settings.theme_preference,
                font_size: settings.reading_preferences.font_size,
                font_family: settings.reading_preferences.font_family,
                page_layout: settings.reading_preferences.page_layout,
                recently_read_limit_days: settings.reading_preferences.recently_read_limit_days,
                notifications_enabled: settings.notification_preferences.notifications_enabled
            });
            setSaveMessage('Settings saved successfully!');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (err: unknown) {
            setError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        setPasswordMessage('');
        setPasswordError('');

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError('All password fields are required');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError('Password must be at least 8 characters long');
            return;
        }

        setLoading(true);

        try {
            await api.put('/users/me/password', {
                current_password: currentPassword,
                new_password: newPassword
            });
            setPasswordMessage('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setPasswordMessage(''), 3000);
        } catch (err: unknown) {
            setPasswordError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !settings) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b dark:border-slate-700">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        Settings
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Tabs */}
                <div className="flex border-b dark:border-slate-700 px-6">
                    <button
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        onClick={() => setActiveTab('general')}
                    >
                        General
                    </button>
                    <button
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ai' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        onClick={() => setActiveTab('ai')}
                    >
                        AI Prompts
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'ai' ? (
                        <AITemplateManager />
                    ) : (
                        <div className="space-y-6">
                            {/* Account Settings */}
                            <div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                            Account Information
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={settings.username}
                                    onChange={(e) => setSettings({ ...settings, username: e.target.value })}
                                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={settings.email}
                                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Appearance Settings */}
                    <div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                            Appearance
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Theme
                            </label>
                            <select
                                value={settings.theme_preference}
                                onChange={(e) => setSettings({ ...settings, theme_preference: e.target.value })}
                                className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                                <option value="auto">Auto (System)</option>
                            </select>
                        </div>
                    </div>

                    {/* Reading Preferences */}
                    <div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                            Reading Preferences
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Font Size: {settings.reading_preferences.font_size}px
                                </label>
                                <input
                                    type="range"
                                    min="10"
                                    max="32"
                                    value={settings.reading_preferences.font_size}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        reading_preferences: {
                                            ...settings.reading_preferences,
                                            font_size: parseInt(e.target.value)
                                        }
                                    })}
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Font Family
                                </label>
                                <select
                                    value={settings.reading_preferences.font_family}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        reading_preferences: {
                                            ...settings.reading_preferences,
                                            font_family: e.target.value
                                        }
                                    })}
                                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="serif">Serif</option>
                                    <option value="sans-serif">Sans Serif</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Page Layout
                                </label>
                                <select
                                    value={settings.reading_preferences.page_layout}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        reading_preferences: {
                                            ...settings.reading_preferences,
                                            page_layout: e.target.value
                                        }
                                    })}
                                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="paginated">Paginated</option>
                                    <option value="scrolled">Continuous Scroll</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Recently Read Limit (Days)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={settings.reading_preferences.recently_read_limit_days}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        reading_preferences: {
                                            ...settings.reading_preferences,
                                            recently_read_limit_days: parseInt(e.target.value) || 30
                                        }
                                    })}
                                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Books last read more than this many days ago will be hidden from the "Recently Read" section.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                            Notifications
                        </h3>
                        <label className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                checked={settings.notification_preferences.notifications_enabled}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    notification_preferences: {
                                        notifications_enabled: e.target.checked
                                    }
                                })}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                Enable notifications
                            </span>
                        </label>
                    </div>

                    {/* Save Settings Button */}
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleSaveSettings}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                        >
                            {loading ? 'Saving...' : 'Save Settings'}
                        </button>
                        {saveMessage && (
                            <span className="text-sm text-green-600 dark:text-green-400">{saveMessage}</span>
                        )}
                        {error && (
                            <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                        )}
                    </div>

                    {/* Password Change Section */}
                    <div className="border-t dark:border-slate-700 pt-6">
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                            Change Password
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full px-3 py-2 pr-10 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                    >
                                        {showCurrentPassword ? (
                                            <EyeSlashIcon className="w-5 h-5 text-slate-400" />
                                        ) : (
                                            <EyeIcon className="w-5 h-5 text-slate-400" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-3 py-2 pr-10 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                    >
                                        {showNewPassword ? (
                                            <EyeSlashIcon className="w-5 h-5 text-slate-400" />
                                        ) : (
                                            <EyeIcon className="w-5 h-5 text-slate-400" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={handleChangePassword}
                                    disabled={loading}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors"
                                >
                                    {loading ? 'Changing...' : 'Change Password'}
                                </button>
                                {passwordMessage && (
                                    <span className="text-sm text-green-600 dark:text-green-400">{passwordMessage}</span>
                                )}
                                {passwordError && (
                                    <span className="text-sm text-red-600 dark:text-red-400">{passwordError}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserSettingsModal;
