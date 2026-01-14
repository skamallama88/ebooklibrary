import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, DocumentDuplicateIcon, CheckCircleIcon, TrashIcon, ArrowsUpDownIcon, Square2StackIcon } from '@heroicons/react/24/outline';
import api from '../api';
import type { Book } from '../types';
import { clsx } from 'clsx';

interface DuplicatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface DuplicateGroup {
    originalId: number;
    original: Book;
    duplicates: Book[];
}

const DuplicatesModal: React.FC<DuplicatesModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const [loading, setLoading] = useState(false);
    const [resolving, setResolving] = useState<number | null>(null);
    const [groups, setGroups] = useState<DuplicateGroup[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fetchDuplicates = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/duplicates/');
            const duplicates: Book[] = res.data;
            
            // Group by originalId
            const groupMap = new Map<number, Book[]>();
            duplicates.forEach(d => {
                if (d.duplicate_of_id) {
                    const group = groupMap.get(d.duplicate_of_id) || [];
                    group.push(d);
                    groupMap.set(d.duplicate_of_id, group);
                }
            });

            // Fetch original books for each group
            const newGroups: DuplicateGroup[] = [];
            for (const [originalId, dups] of groupMap.entries()) {
                try {
                    const originalRes = await api.get(`/books/${originalId}`);
                    newGroups.push({
                        originalId,
                        original: originalRes.data,
                        duplicates: dups
                    });
                } catch (e) {
                    console.error(`Failed to fetch original book ${originalId}`, e);
                    // Still add group but maybe with placeholder original?
                }
            }
            setGroups(newGroups);
        } catch (err) {
            console.error('Failed to fetch duplicates:', err);
            setError('Failed to load duplicates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchDuplicates();
        }
    }, [isOpen]);

    const handleResolve = async (bookId: number, action: string) => {
        setResolving(bookId);
        try {
            await api.post(`/duplicates/${bookId}/resolve`, { action });
            await fetchDuplicates();
            onSuccess();
        } catch (err) {
            console.error(`Failed to resolve duplicate ${bookId}:`, err);
            setError('Failed to resolve duplicate');
        } finally {
            setResolving(null);
        }
    };

    const formatSize = (bytes?: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Unknown';
        try {
            return new Date(dateStr).toLocaleDateString();
        } catch (e) {
            return dateStr;
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
                            <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-8 text-left shadow-2xl transition-all border dark:border-slate-800">
                                <div className="flex justify-between items-center mb-6">
                                    <Dialog.Title className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Square2StackIcon className="h-6 w-6 text-blue-600" />
                                        Duplicate Books Detected
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

                                {loading && groups.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                        <p className="text-slate-500 dark:text-slate-400">Scanning for duplicates...</p>
                                    </div>
                                ) : groups.length === 0 ? (
                                    <div className="text-center py-12">
                                        <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                                        <p className="text-slate-600 dark:text-slate-300 font-medium text-lg">No duplicates found!</p>
                                        <p className="text-slate-500 dark:text-slate-400 mt-2">Your library is clean.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2 scrollbar-hide">
                                        {groups.map(group => (
                                            <div key={group.originalId} className="border dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/20 p-4">
                                                <h3 className="font-bold text-slate-900 dark:text-white mb-4 px-2">
                                                    Group: {group.original.title}
                                                </h3>
                                                
                                                <div className="space-y-4">
                                                    {group.duplicates.map(dup => (
                                                        <div key={dup.id} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {/* Original Book Card */}
                                                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 relative opacity-80">
                                                                <div className="absolute top-2 right-2 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-bold text-slate-500 dark:text-slate-400">ORIGINAL</div>
                                                                <BookCompactDetails book={group.original} />
                                                            </div>

                                                            {/* Duplicate Book Card */}
                                                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border-2 border-blue-500/30 dark:border-blue-500/30 relative">
                                                                <div className="absolute top-2 right-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded text-[10px] font-bold text-blue-600 dark:text-blue-400">DUPLICATE</div>
                                                                <BookCompactDetails 
                                                                    book={dup} 
                                                                    comparison={group.original} 
                                                                />
                                                                
                                                                <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t dark:border-slate-700">
                                                                    <button
                                                                        onClick={() => handleResolve(dup.id, 'keep_original')}
                                                                        disabled={!!resolving}
                                                                        className="flex-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                                                                    >
                                                                        {resolving === dup.id ? <div className="animate-spin h-3 w-3 border-b-2 border-slate-500 rounded-full" /> : <TrashIcon className="w-3.5 h-3.5" />}
                                                                        Keep Original
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleResolve(dup.id, 'keep_new')}
                                                                        disabled={!!resolving}
                                                                        className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                                                                    >
                                                                        {resolving === dup.id ? <div className="animate-spin h-3 w-3 border-b-2 border-white rounded-full" /> : <CheckCircleIcon className="w-3.5 h-3.5" />}
                                                                        Keep Duplicate
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleResolve(dup.id, 'keep_both')}
                                                                        disabled={!!resolving}
                                                                        className="px-3 py-1.5 bg-white dark:bg-slate-800 border dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-xs font-semibold transition-colors"
                                                                    >
                                                                        Keep Both
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex justify-end mt-8">
                                    <button
                                        onClick={onClose}
                                        className="px-6 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border dark:border-slate-700"
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

const BookCompactDetails: React.FC<{ book: Book, comparison?: Book }> = ({ book, comparison }) => {
    const isNewer = comparison && book.published_date && comparison.published_date && new Date(book.published_date) > new Date(comparison.published_date);
    const isMoreWords = comparison && (book.word_count || 0) > (comparison.word_count || 0);

    const formatSize = (bytes?: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="flex gap-4">
            <div className="w-16 h-24 bg-slate-100 dark:bg-slate-900 rounded flex-shrink-0 overflow-hidden shadow-inner flex items-center justify-center">
                {book.cover_path ? (
                    <img src={`${api.defaults.baseURL}/books/cover/${book.cover_path}`} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="text-[10px] text-slate-400 uppercase text-center p-1">No Cover</div>
                )}
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                    <div className="truncate font-semibold text-slate-900 dark:text-white text-sm" title={book.title}>{book.title}</div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-400 shrink-0 uppercase">{book.format}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-[11px]">
                    <div>
                        <span className="text-slate-400 block mb-0.5">Author</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate block">{book.authors?.map(a => a.name).join(', ') || 'Unknown'}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block mb-0.5">Size</span>
                        <span className="text-slate-700 dark:text-slate-300">{formatSize(book.file_size)}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block mb-0.5">Published</span>
                        <span className={clsx(
                            "font-medium",
                            isNewer ? "text-green-600 dark:text-green-400" : "text-slate-700 dark:text-slate-300"
                        )}>
                            {book.published_date ? new Date(book.published_date).toLocaleDateString() : 'Unknown'}
                            {isNewer && <span className="ml-1 text-[9px] font-bold">NEWER</span>}
                        </span>
                    </div>
                    <div>
                        <span className="text-slate-400 block mb-0.5">Words</span>
                        <span className={clsx(
                            "font-medium",
                            isMoreWords ? "text-green-600 dark:text-green-400" : "text-slate-700 dark:text-slate-300"
                        )}>
                            {book.word_count ? book.word_count.toLocaleString() : 'N/A'}
                            {isMoreWords && <span className="ml-1 text-[9px] font-bold">MORE</span>}
                        </span>
                    </div>
                </div>
                
                <div className="pt-1.5 mt-1.5 border-t dark:border-slate-700">
                    <span className="text-slate-400 text-[10px] block mb-0.5">File Path</span>
                    <span className="text-slate-500 dark:text-slate-500 text-[9px] break-all line-clamp-2 leading-tight" title={book.file_path}>{book.file_path}</span>
                </div>
            </div>
        </div>
    );
};

export default DuplicatesModal;
