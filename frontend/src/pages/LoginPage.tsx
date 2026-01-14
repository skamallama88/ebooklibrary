import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import api from '../api';
import { LockClosedIcon, UserIcon } from '@heroicons/react/24/outline';

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            params.append('username', username);
            params.append('password', password);

            const response = await api.post('/auth/token', params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            await login(response.data.access_token);
        } catch (err: unknown) {
            setError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-200">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800 transition-colors duration-200">
                <div className="p-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200 dark:shadow-none">
                        <LockClosedIcon className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-slate-100 mb-2">Welcome Back</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-center mb-8">Sign in to your ebook library</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm rounded-lg text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Username</label>
                            <div className="relative">
                                <UserIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none text-slate-800 dark:text-slate-100"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative">
                                <LockClosedIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none text-slate-800 dark:text-slate-100"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none disabled:opacity-70 flex items-center justify-center space-x-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <span>Sign In</span>
                            )}
                        </button>
                    </form>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-800 text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                        Inspired by Calibre • Modern Ebook Management
                    </p>
                </div>
            </div>
        </div>
    );

};

export default LoginPage;
