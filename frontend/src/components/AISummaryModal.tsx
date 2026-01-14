import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import api from '../api';

import type { AIPromptTemplate } from '../types';

interface AISummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookId: number | null;
    bookTitle: string;
    currentSummary: string;
    onSuccess: () => void;
}

const AISummaryModal: React.FC<AISummaryModalProps> = ({
    isOpen,
    onClose,
    bookId,
    bookTitle,
    currentSummary,
    onSuccess
}) => {
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedSummary, setGeneratedSummary] = useState('');
    const [originalSummary, setOriginalSummary] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [overwriteExisting, setOverwriteExisting] = useState(false);
    const [extractionStrategy, setExtractionStrategy] = useState('smart_sampling');
    const [templates, setTemplates] = useState<AIPromptTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | 'default'>('default');

    useEffect(() => {
        if (isOpen) {
            api.get('/ai/templates/').then(res => {
                const summaryTemplates = res.data.filter((t: AIPromptTemplate) => t.type === 'summary');
                setTemplates(summaryTemplates);
            }).catch(err => console.error("Failed to load templates", err));
        }
    }, [isOpen]);

    const handleGenerate = async () => {
        if (!bookId) return;

        setGenerating(true);
        setError(null);

        try {
            const res = await api.post('/ai/summary', {
                book_id: bookId,
                overwrite_existing: overwriteExisting,
                auto_approve: false,
                extraction_strategy: extractionStrategy,
                template_id: selectedTemplateId === 'default' ? null : selectedTemplateId
            });

            setGeneratedSummary(res.data.summary);
            setOriginalSummary(res.data.original_summary);
            setShowPreview(true);
        } catch (err: unknown) {
            console.error('Failed to generate summary:', err);
            const errorMessage = ((err as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to generate summary. Make sure an AI provider is configured and active.';
            setError(errorMessage);
        } finally {
            setGenerating(false);
        }
    };

    const handleApprove = async () => {
        if (!bookId) return;

        try {
            await api.post('/ai/summary/approve', null, {
                params: {
                    book_id: bookId,
                    summary: generatedSummary
                }
            });

            onSuccess();
            onClose();
            setShowPreview(false);
            setGeneratedSummary('');
        } catch (err) {
            console.error('Failed to apply summary:', err);
            setError('Failed to save summary');
        }
    };

    const handleReject = () => {
        setShowPreview(false);
        setGeneratedSummary('');
        setError(null);
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
                            <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-8 text-left shadow-2xl transition-all border dark:border-slate-800">
                                <div className="flex justify-between items-center mb-6">
                                    <Dialog.Title className="text-lg font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                        <SparklesIcon className="h-5 w-5 text-blue-600" />
                                        AI Summary Generation
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300">
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="mb-4">
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Book: <span className="font-medium text-slate-900 dark:text-white">{bookTitle}</span>
                                    </p>
                                </div>

                                {error && (
                                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                                        {error}
                                    </div>
                                )}

                                {!showPreview ? (
                                    <div className="space-y-4">
                                        {currentSummary && (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                    Current Summary
                                                </label>
                                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 max-h-32 overflow-y-auto">
                                                    {currentSummary}
                                                </div>
                                            </div>
                                        )}

                                        {templates.length > 0 && (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                    Prompt Template
                                                </label>
                                                <select
                                                    value={selectedTemplateId}
                                                    onChange={(e) => setSelectedTemplateId(e.target.value === 'default' ? 'default' : Number(e.target.value))}
                                                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 mb-4"
                                                >
                                                    <option value="default">Default System Prompt</option>
                                                    {templates.map(t => (
                                                        <option key={t.id} value={t.id}>
                                                            {t.name} {t.is_default && '(Default)'}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                Extraction Strategy
                                            </label>
                                            <select
                                                value={extractionStrategy}
                                                onChange={(e) => setExtractionStrategy(e.target.value)}
                                                className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2"
                                            >
                                                <option value="metadata_only">Quick (Metadata + Sample)</option>
                                                <option value="smart_sampling">Balanced (Smart Sampling)</option>
                                                <option value="rolling_summary">Comprehensive (Rolling Summary)</option>
                                                <option value="full">Full Book (for short books)</option>
                                            </select>
                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                Smart Sampling is recommended for most books
                                            </p>
                                        </div>

                                        {currentSummary && (
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id="overwrite"
                                                    checked={overwriteExisting}
                                                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                                                    className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                                                />
                                                <label htmlFor="overwrite" className="ml-2 text-sm text-slate-700 dark:text-slate-300">
                                                   Overwrite existing summary
                                                </label>
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-3 pt-4">
                                            <button
                                                onClick={onClose}
                                                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                                disabled={generating}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleGenerate}
                                                disabled={generating}
                                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {generating ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                        Generating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <SparklesIcon className="h-4 w-4" />
                                                        Generate Summary
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                Generated Summary
                                            </label>
                                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 max-h-64 overflow-y-auto">
                                                {generatedSummary}
                                            </div>
                                        </div>

                                        {originalSummary && (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                    Original Summary (for comparison)
                                                </label>
                                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 max-h-32 overflow-y-auto">
                                                    {originalSummary}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-3 pt-4">
                                            <button
                                                onClick={handleReject}
                                                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                onClick={handleApprove}
                                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm"
                                            >
                                                Approve & Apply
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default AISummaryModal;
