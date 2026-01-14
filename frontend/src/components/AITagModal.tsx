import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, SparklesIcon, TagIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import api from '../api';

import type { AIPromptTemplate } from '../types';

interface AITagModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookId: number | null;
    bookTitle: string;
    currentTags: string[];
    onSuccess: () => void;
}

interface SuggestedTag {
    name: string;
    type: string;
    confidence: number;
    reason: string;
    selected?: boolean;
}

const AITagModal: React.FC<AITagModalProps> = ({
    isOpen,
    onClose,
    bookId,
    bookTitle,
    currentTags,
    onSuccess
}) => {
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    
    // Configuration
    const [maxTags, setMaxTags] = useState(20);
    const [mergeExisting, setMergeExisting] = useState(true);
    
    // Results
    const [suggestedTags, setSuggestedTags] = useState<SuggestedTag[]>([]);
    const [appliedLimits, setAppliedLimits] = useState<Record<string, number>>({});
    const [templates, setTemplates] = useState<AIPromptTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | 'default'>('default');

    useEffect(() => {
        if (isOpen) {
            api.get('/ai/templates/').then(res => {
                const tagTemplates = res.data.filter((t: AIPromptTemplate) => t.type === 'tags');
                setTemplates(tagTemplates);
            }).catch(err => console.error("Failed to load templates", err));
        }
    }, [isOpen]);

    const handleGenerate = async () => {
        if (!bookId) return;

        setGenerating(true);
        setError(null);

        try {
            const res = await api.post('/ai/tags', {
                book_id: bookId,
                max_tags: maxTags,
                merge_existing: mergeExisting,
                auto_approve: false,
                template_id: selectedTemplateId === 'default' ? null : selectedTemplateId
            });

            // Mark all as selected by default
            const tags = res.data.suggested_tags.map((t: SuggestedTag) => ({
                ...t,
                selected: true
            }));

            setSuggestedTags(tags);
            setAppliedLimits(res.data.applied_limits || {});
            setShowPreview(true);
        } catch (err: unknown) {
            console.error('Failed to generate tags:', err);
            const errorMessage = ((err as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to generate tags. Make sure an AI provider is configured and active.';
            setError(errorMessage);
        } finally {
            setGenerating(false);
        }
    };

    const toggleTagSelection = (index: number) => {
        setSuggestedTags(prev => {
            const newTags = [...prev];
            newTags[index].selected = !newTags[index].selected;
            return newTags;
        });
    };

    const handleApprove = async () => {
        if (!bookId) return;

        try {
            const selectedTags = suggestedTags.filter(t => t.selected);
            
            await api.post('/ai/tags/approve', selectedTags, {
                params: {
                    book_id: bookId,
                    merge_existing: mergeExisting
                }
            });

            onSuccess();
            handleClose();
        } catch (err) {
            console.error('Failed to apply tags:', err);
            setError('Failed to save tags');
        }
    };

    const handleClose = () => {
        setShowPreview(false);
        setSuggestedTags([]);
        setError(null);
        onClose();
    };

    const [hoveredReason, setHoveredReason] = useState<string | null>(null);

    // Sort order for tag types
    const typeOrder = ['genre', 'theme', 'tone', 'setting', 'character_trait', 'structure'];

    // Group tags by type for display (normalized)
    const tagsByType = suggestedTags.reduce((acc, tag, index) => {
        const normalizedType = tag.type.toLowerCase();
        if (!acc[normalizedType]) acc[normalizedType] = [];
        acc[normalizedType].push({ ...tag, index });
        return acc;
    }, {} as Record<string, (SuggestedTag & { index: number })[]>);

    // Get sorted types
    const sortedTypes = Object.keys(tagsByType).sort((a, b) => {
        const indexA = typeOrder.indexOf(a);
        const indexB = typeOrder.indexOf(b);
        // If both are in the known list, sort by index
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        // If only A is known, it comes first
        if (indexA !== -1) return -1;
        // If only B is known, it comes second
        if (indexB !== -1) return 1;
        // Otherwise sort alphabetically
        return a.localeCompare(b);
    });

    // Tag type colors
    const getTypeColor = (type: string) => {
        switch (type.toLowerCase()) {
            case 'genre': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
            case 'theme': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
            case 'tone': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
            case 'setting': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
            case 'character_trait': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200 dark:border-pink-800';
            case 'structure': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
                                    <Dialog.Title className="text-lg font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                        <SparklesIcon className="h-5 w-5 text-blue-600" />
                                        AI Tag Generation
                                    </Dialog.Title>
                                    <button onClick={handleClose} className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300">
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
                                    <div className="space-y-6">
                                        {/* Current Tags Display */}
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                                <TagIcon className="h-4 w-4" />
                                                Current Tags ({currentTags.length})
                                            </h4>
                                            {currentTags.length > 0 ? (
                                                <div className="flex flex-wrap gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                    {currentTags.map(tag => (
                                                        <span key={tag} className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs text-slate-700 dark:text-slate-300">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-500 italic p-2">No tags currently assigned.</p>
                                            )}
                                        </div>

                                        {/* Configuration */}
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                            <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                                <AdjustmentsHorizontalIcon className="h-4 w-4" />
                                                Generation Settings
                                            </h4>
                                            
                                            <div className="space-y-4">
                                                {templates.length > 0 && (
                                                    <div>
                                                        <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                                                            Prompt Template
                                                        </label>
                                                        <select
                                                            value={selectedTemplateId}
                                                            onChange={(e) => setSelectedTemplateId(e.target.value === 'default' ? 'default' : Number(e.target.value))}
                                                            className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2"
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
                                                    <label className="flex justify-between text-sm text-slate-700 dark:text-slate-300 mb-1">
                                                        <span>Max AI Tags to Generate</span>
                                                        <span className="font-medium">{maxTags}</span>
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min="5"
                                                        max="50"
                                                        step="5"
                                                        value={maxTags}
                                                        onChange={(e) => setMaxTags(parseInt(e.target.value))}
                                                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                    />
                                                </div>

                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id="merge"
                                                        checked={mergeExisting}
                                                        onChange={(e) => setMergeExisting(e.target.checked)}
                                                        className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <label htmlFor="merge" className="ml-2 text-sm text-slate-700 dark:text-slate-300">
                                                        Merge with existing tags (keep current ones)
                                                    </label>
                                                </div>
                                                
                                                {!mergeExisting && (
                                                    <p className="text-xs text-amber-600 dark:text-amber-400 pl-6">
                                                        Warning: This will remove all {currentTags.length} existing tags.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 pt-2">
                                            <button
                                                onClick={handleClose}
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
                                                        Analyzing Book...
                                                    </>
                                                ) : (
                                                    <>
                                                        <SparklesIcon className="h-4 w-4" />
                                                        Generate Tags
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                                                Suggested Tags ({suggestedTags.filter(t => t.selected).length} selected)
                                            </h4>
                                            <div className="text-xs text-slate-500">
                                                Click tags to toggle selection
                                            </div>
                                        </div>

                                        {/* Sticky Info Box */}
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 min-h-[60px] flex items-center transition-all">
                                            {hoveredReason ? (
                                                <div className="animate-in fade-in duration-200">
                                                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 mr-2">Reason:</span>
                                                    <span className="text-sm text-slate-700 dark:text-slate-300">{hoveredReason}</span>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-slate-400 dark:text-slate-500 italic flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                                    Hover over a tag to see why it was suggested
                                                </div>
                                            )}
                                        </div>

                                        <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-6">
                                            {sortedTypes.length === 0 ? (
                                                <div className="text-center py-8 text-slate-500">
                                                    No tags generated. The AI provided an empty response.
                                                </div>
                                            ) : (
                                                sortedTypes.map((type) => (
                                                    <div key={type}>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                                {type.replace('_', ' ')}
                                                            </h5>
                                                            <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 rounded">
                                                                {tagsByType[type].length} / {appliedLimits[type] || '∞'}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {tagsByType[type].map(tag => (
                                                                <button
                                                                    key={`${tag.type}-${tag.name}`}
                                                                    onClick={() => toggleTagSelection(tag.index)}
                                                                    onMouseEnter={() => setHoveredReason(tag.reason)}
                                                                    onMouseLeave={() => setHoveredReason(null)}
                                                                    className={`
                                                                        group relative px-2.5 py-1.5 rounded-md text-sm transition-all border
                                                                        ${tag.selected 
                                                                            ? getTypeColor(tag.type) 
                                                                            : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-700 decoration-slate-400 line-through decoration-1 opacity-60'}
                                                                    `}
                                                                >
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span>{tag.name}</span>
                                                                        {tag.confidence < 0.7 && tag.selected && (
                                                                            <span className="text-[10px] opacity-70" title={`Low confidence: ${Math.round(tag.confidence * 100)}%`}>⚠️</span>
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                {mergeExisting 
                                                    ? `Will be merged with ${currentTags.length} existing tags` 
                                                    : `Will replace ${currentTags.length} existing tags`}
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setShowPreview(false)}
                                                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                                >
                                                    Back
                                                </button>
                                                <button
                                                    onClick={handleApprove}
                                                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm"
                                                    disabled={suggestedTags.filter(t => t.selected).length === 0}
                                                >
                                                    Approve {suggestedTags.filter(t => t.selected).length} Tags
                                                </button>
                                            </div>
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

export default AITagModal;
