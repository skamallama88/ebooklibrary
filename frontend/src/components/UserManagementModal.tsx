import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon, ShieldCheckIcon, UserIcon } from '@heroicons/react/24/outline';
import api from '../api';

interface UserManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface User {
    id: number;
    username: string;
    email: string;
    is_active: boolean;
    is_admin: boolean;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Create user form state
    const [newUsername, setNewUsername] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [createError, setCreateError] = useState('');
    const [createSuccess, setCreateSuccess] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/users/');
            setUsers(response.data);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError('');
        setCreateSuccess('');

        if (!newUsername || !newEmail || !newPassword) {
            setCreateError('All fields are required');
            return;
        }

        if (newPassword.length < 8) {
            setCreateError('Password must be at least 8 characters long');
            return;
        }

        setLoading(true);

        try {
            await api.post('/users/', {
                username: newUsername,
                email: newEmail,
                password: newPassword
            });
            setCreateSuccess('User created successfully!');
            setNewUsername('');
            setNewEmail('');
            setNewPassword('');
            setShowCreateForm(false);
            fetchUsers();
            setTimeout(() => setCreateSuccess(''), 3000);
        } catch (err: any) {
            setCreateError(err.response?.data?.detail || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: number, username: string) => {
        if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
            return;
        }

        setLoading(true);
        try {
            await api.delete(`/users/${userId}`);
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to delete user');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleAdmin = async (userId: number) => {
        setLoading(true);
        try {
            await api.put(`/users/${userId}/admin`);
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to update admin status');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b dark:border-slate-700">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        User Management
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {/* Create User Button/Form */}
                    {!showCreateForm ? (
                        <div className="mb-6">
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                            >
                                <PlusIcon className="w-5 h-5" />
                                <span>Create New User</span>
                            </button>
                            {createSuccess && (
                                <p className="mt-2 text-sm text-green-600 dark:text-green-400">{createSuccess}</p>
                            )}
                        </div>
                    ) : (
                        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border dark:border-slate-700">
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                                Create New User
                            </h3>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                        className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        required
                                        minLength={8}
                                    />
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        Must be at least 8 characters
                                    </p>
                                </div>
                                {createError && (
                                    <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>
                                )}
                                <div className="flex space-x-3">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                                    >
                                        {loading ? 'Creating...' : 'Create User'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCreateForm(false);
                                            setCreateError('');
                                            setNewUsername('');
                                            setNewEmail('');
                                            setNewPassword('');
                                        }}
                                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Users List */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {loading && users.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            Loading users...
                        </div>
                    ) : (
                        <div className="border dark:border-slate-700 rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-slate-50 dark:bg-slate-900">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            Role
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-slate-700">
                                    {users.map((user) => (
                                        <tr key={user.id} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center space-x-2">
                                                    <UserIcon className="w-5 h-5 text-slate-400" />
                                                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                                                        {user.username}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                {user.email}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                                    user.is_active
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                    {user.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {user.is_admin ? (
                                                    <span className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                        <ShieldCheckIcon className="w-3.5 h-3.5" />
                                                        <span>Admin</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">User</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button
                                                        onClick={() => handleToggleAdmin(user.id)}
                                                        disabled={loading}
                                                        className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded transition-colors disabled:opacity-50"
                                                        title={user.is_admin ? 'Remove admin' : 'Make admin'}
                                                    >
                                                        <ShieldCheckIcon className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id, user.username)}
                                                        disabled={loading}
                                                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded transition-colors disabled:opacity-50"
                                                        title="Delete user"
                                                    >
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {users.length === 0 && !loading && (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            No users found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserManagementModal;
