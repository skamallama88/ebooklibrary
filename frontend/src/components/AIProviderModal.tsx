import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import api from '../api';

interface AIProviderModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface OllamaModel {
    name: string;
    size?: number;
    modified_at?: string;
}

interface Provider {
    id: number;
    provider_type: string;
    base_url: string;
    model_name: string;
    is_active: boolean;
    max_tokens: number;
    temperature: number;
    extraction_strategy: string;
}

const AIProviderModal: React.FC<AIProviderModalProps> = ({ isOpen, onClose }) => {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
    const [loading, setLoading] = useState(false);
    const [discovering, setDiscovering] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<Record<number, { status: string; message: string }>>({});
    
    const [formData, setFormData] = useState({
        base_url: 'http://host.docker.internal:11434',
        model_name: '',
        max_tokens: 2048,
        temperature: 0.7,
        extraction_strategy: 'smart_sampling'
    });

    useEffect(() => {
        if (isOpen) {
            fetchProviders();
        }
    }, [isOpen]);

    const fetchProviders = async () => {
        setLoading(true);
        try {
            const res = await api.get('/ai/providers');
            setProviders(res.data);
        } catch (err) {
            console.error('Failed to fetch providers:', err);
            setError('Failed to load providers');
        } finally {
            setLoading(false);
        }
    };

    const discoverModels = async () => {
        setDiscovering(true);
        setError(null);
        try {
            const res = await api.get('/ai/providers/ollama/models', {
                params: { base_url: formData.base_url }
            });
            setAvailableModels(res.data.models || []);
            if (res.data.models.length > 0 && !formData.model_name) {
                setFormData(prev => ({ ...prev, model_name: res.data.models[0].name }));
            }
        } catch (err: any) {
            console.error('Failed to discover models:', err);
            setError(err.response?.data?.detail || 'Failed to discover models. Is Ollama running?');
        } finally {
            setDiscovering(false);
        }
    };

    const handleAddProvider = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        
        try {
            await api.post('/ai/providers', {
                provider_type: 'ollama',
                base_url: formData.base_url,
                model_name: formData.model_name,
                max_tokens: formData.max_tokens,
                temperature: formData.temperature,
                extraction_strategy: formData.extraction_strategy
            });
            
            await fetchProviders();
            
            // Reset form but keep the Docker-friendly URL
            setFormData({
                base_url: 'http://host.docker.internal:11434',
                model_name: '',
                max_tokens: 2048,
                temperature: 0.7,
                extraction_strategy: 'smart_sampling'
            });
            setAvailableModels([]);
        } catch (err: any) {
            console.error('Failed to add provider:', err);
            setError(err.response?.data?.detail || 'Failed to add provider');
        } finally {
            setSaving(false);
        }
    };

    const handleActivate = async (id: number) => {
        try {
            await api.post(`/ai/providers/${id}/activate`);
            await fetchProviders();
        } catch (err) {
            console.error('Failed to activate provider:', err);
        }
    };

    const handleTest = async (id: number) => {
        try {
            const res = await api.get(`/ai/providers/${id}/test`);
            setTestResults(prev => ({ ...prev, [id]: res.data }));
        } catch (err: any) {
            console.error('Failed to test provider:', err);
            setTestResults(prev => ({ 
                ...prev, 
                [id]: { status: 'error', message: err.response?.data?.detail || 'Test failed' }
            }));
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this provider?')) return;
        
        try {
            await api.delete(`/ai/providers/${id}`);
            await fetchProviders();
        } catch (err) {
            console.error('Failed to delete provider:', err);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-8 text-left shadow-2xl transition-all border dark:border-slate-800">
                                <div className="flex justify-between items-center mb-6">
                                    <Dialog.Title className="text-lg font-medium text-slate-900 dark:text-white">
                                        AI Provider Configuration
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300">
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                {error && (
                                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                                        {error}
                                    </div>
                                )}

                                {/* Add New Provider Form */}
                                <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-4">Add Ollama Provider</h4>
                                    <form onSubmit={handleAddProvider} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="flex justify-between mb-1">
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                        Base URL
                                                    </label>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400" title="Use host.docker.internal to connect to host machine">
                                                        Docker: host.docker.internal
                                                    </span>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={formData.base_url}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, base_url: e.target.value }))}
                                                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2"
                                                    placeholder="http://host.docker.internal:11434"
                                                    required
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                    Model
                                                </label>
                                                <div className="flex gap-2">
                                                    {availableModels.length > 0 ? (
                                                        <select
                                                            value={formData.model_name}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, model_name: e.target.value }))}
                                                            className="flex-1 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2"
                                                            required
                                                        >
                                                            <option value="">Select model</option>
                                                            {availableModels.map(model => (
                                                                <option key={model.name} value={model.name}>{model.name}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={formData.model_name}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, model_name: e.target.value }))}
                                                            className="flex-1 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2"
                                                            placeholder="llama3"
                                                            required
                                                        />
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={discoverModels}
                                                        disabled={discovering}
                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50"
                                                    >
                                                        {discovering ? 'Discovering...' : 'Discover'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50"
                                            >
                                                {saving ? 'Adding...' : 'Add Provider'}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Existing Providers */}
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-4">Configured Providers</h4>
                                    {loading ? (
                                        <div className="flex justify-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        </div>
                                    ) : providers.length === 0 ? (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                                            No providers configured. Add one above to get started.
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {providers.map(provider => (
                                                <div
                                                    key={provider.id}
                                                    className={`p-4 rounded-lg border ${
                                                        provider.is_active
                                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium text-slate-900 dark:text-white">
                                                                    {provider.model_name}
                                                                </span>
                                                                {provider.is_active && (
                                                                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs rounded-full">
                                                                        Active
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                                {provider.base_url} | {provider.extraction_strategy}
                                                            </p>
                                                            {testResults[provider.id] && (
                                                                <div className={`mt-2 text-xs flex items-center gap-1 ${
                                                                    testResults[provider.id].status === 'success'
                                                                        ? 'text-green-600 dark:text-green-400'
                                                                        : 'text-red-600 dark:text-red-400'
                                                                }`}>
                                                                    {testResults[provider.id].status === 'success' ? (
                                                                        <CheckCircleIcon className="h-4 w-4" />
                                                                    ) : (
                                                                        <XCircleIcon className="h-4 w-4" />
                                                                    )}
                                                                    {testResults[provider.id].message}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {!provider.is_active && (
                                                                <button
                                                                    onClick={() => handleActivate(provider.id)}
                                                                    className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                                                >
                                                                    Activate
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleTest(provider.id)}
                                                                className="px-3 py-1 text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded"
                                                            >
                                                                Test
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(provider.id)}
                                                                className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                    >
                                        Close
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default AIProviderModal;
