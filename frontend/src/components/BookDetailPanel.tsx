import React, { useState, useEffect } from 'react';
import { XMarkIcon, PencilSquareIcon, CheckIcon, PlusIcon } from '@heroicons/react/24/outline';
import api from '../api';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { clsx } from 'clsx';

interface Author {
    id: number;
    name: string;
}

interface Tag {
    id: number;
    name: string;
    type?: string;
}

const tagTypeColors: Record<string, string> = {
    genre: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    theme: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    setting: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    tone: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    structure: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    character_trait: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    meta: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    general: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-400',
};

interface Collection {
    id: number;
    name: string;
}

interface Book {
    id: number;
    title: string;
    authors: Author[];
    tags: Tag[];
    collections: Collection[];
    format: string;
    file_size: number;
    created_at: string;
    description?: string;
    publisher?: string;
    language?: string;
    published_date?: string;
    rating: number;
    cover_path?: string;
    word_count?: number;
}

interface BookDetailPanelProps {
    bookId: number | null;
    onClose: () => void;
    onUpdate?: () => void;
    onRead?: (id: number) => void;
}

const BookDetailPanel: React.FC<BookDetailPanelProps> = ({ bookId, onClose, onUpdate, onRead }) => {
    const { isMobile } = useMediaQuery();
    const [book, setBook] = useState<Book | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editData, setEditData] = useState<any>({});
    const [showAddCollection, setShowAddCollection] = useState(false);
    const [allCollections, setAllCollections] = useState<any[]>([]);

    useEffect(() => {
        if (bookId) {
            fetchBook(bookId);
            fetchCollections();
            setIsEditing(false);
            setShowAddCollection(false);
        } else {
            setBook(null);
        }
    }, [bookId]);

    const fetchCollections = async () => {
        try {
            const res = await api.get('/collections/');
            setAllCollections(res.data);
        } catch (err) {
            console.error("Failed to fetch collections", err);
        }
    };

    const handleAddCollection = async (collectionId: number) => {
        if (!book) return;
        try {
            await api.post(`/collections/${collectionId}/books/${book.id}`);
            fetchBook(book.id);
            setShowAddCollection(false);
        } catch (err) {
            console.error("Failed to add to collection", err);
        }
    };

    const handleRemoveCollection = async (collectionId: number) => {
        if (!book) return;
        try {
            await api.delete(`/collections/${collectionId}/books/${book.id}`);
            fetchBook(book.id);
        } catch (err) {
            console.error("Failed to remove from collection", err);
        }
    };

    useEffect(() => {
        if (bookId) {
            fetchBook(bookId);
            setIsEditing(false);
        } else {
            setBook(null);
        }
    }, [bookId]);

    const fetchBook = async (id: number) => {
        setIsLoading(true);
        try {
            const response = await api.get(`/books/${id}`);
            setBook(response.data);
            setEditData({
                title: response.data.title,
                description: response.data.description || '',
                authors: response.data.authors.map((a: any) => a.name).join(', '),
                tags: response.data.tags.map((t: any) => t.name).join(', '),
                publisher: response.data.publisher || '',
                published_date: response.data.published_date ? new Date(response.data.published_date).toISOString().split('T')[0] : '',
                rating: response.data.rating || 0,
            });
        } catch (error) {
            console.error("Failed to fetch book", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!book) return;
        try {
            const payload = {
                ...editData,
                authors: editData.authors.split(',').map((s: string) => s.trim()).filter(Boolean),
                tags: editData.tags.split(',').map((s: string) => s.trim()).filter(Boolean),
                published_date: editData.published_date || null,
                rating: Number(editData.rating),
            };
            await api.patch(`/books/${book.id}`, payload);
            setIsEditing(false);
            fetchBook(book.id);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to update book", error);
        }
    };

    if (!bookId) return null;

    return (
        <>
            {/* Mobile overlay */}
            {isMobile && bookId && (
                <div 
                    className="fixed inset-0 bg-black/50 z-[70]"
                    onClick={onClose}
                />
            )}
            
            {/* Panel/Modal */}
            <div className={clsx(
                "bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 ease-in-out border-slate-200 dark:border-slate-800",
                // Desktop: side panel
                !isMobile && [
                    "absolute top-12 bottom-0 right-0 w-96 z-50 border-l",
                    bookId ? 'translate-x-0' : 'translate-x-full'
                ],
                // Mobile: full-screen modal
                isMobile && [
                    "fixed inset-0 z-[80]",
                    bookId ? 'translate-y-0' : 'translate-y-full'
                ]
            )}>
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 shrink-0">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Book Details</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 touch-target">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {isLoading ? (
                        <div className="animate-pulse space-y-4">
                            <div className="aspect-[2/3] bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4"></div>
                            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2"></div>
                        </div>
                    ) : book ? (
                        <div className="space-y-6">
                            {/* Cover */}
                            <div className="aspect-[2/3] bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden shadow-md flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                {book.cover_path ? (
                                    <img
                                        src={`${api.defaults.baseURL}/books/${book.id}/cover`}
                                        alt={book.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-slate-400 dark:text-slate-500 font-medium">No Cover</span>
                                )}
                            </div>

                            {/* Metadata */}
                            <div className="space-y-4">
                                <div>
                                    {isEditing ? (
                                        <input
                                            value={editData.title}
                                            onChange={e => setEditData({ ...editData, title: e.target.value })}
                                            className="w-full font-bold text-xl border-b border-blue-500 focus:outline-none bg-transparent dark:text-slate-100"
                                        />
                                    ) : (
                                        <h2 className="font-bold text-xl text-slate-900 dark:text-slate-100">{book.title}</h2>
                                    )}
                                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                                        {isEditing ? (
                                            <input
                                                value={editData.authors}
                                                onChange={e => setEditData({ ...editData, authors: e.target.value })}
                                                placeholder="Authors (comma separated)"
                                                className="w-full text-slate-600 dark:text-slate-400 border-b border-blue-500 focus:outline-none bg-transparent"
                                            />
                                        ) : (
                                            book.authors.map(a => a.name).join(', ') || 'Unknown Author'
                                        )}
                                    </p>
                                </div>

                                <div className="pt-4 border-t dark:border-slate-800 space-y-3 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 dark:text-slate-500">Format</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-200 uppercase">{book.format}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 dark:text-slate-500">File Size</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-200">{(book.file_size / (1024 * 1024)).toFixed(2)} MB</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 dark:text-slate-500">Word Count</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-200">{book.word_count ? book.word_count.toLocaleString() : 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 dark:text-slate-500">Language</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-200">{book.language || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 dark:text-slate-500">Publisher</span>
                                        {isEditing ? (
                                            <input
                                                value={editData.publisher}
                                                onChange={e => setEditData({ ...editData, publisher: e.target.value })}
                                                className="text-right font-medium text-slate-700 dark:text-slate-200 border-b border-blue-500 focus:outline-none w-1/2 bg-transparent"
                                            />
                                        ) : (
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{book.publisher || 'N/A'}</span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 dark:text-slate-500">Published</span>
                                        {isEditing ? (
                                            <input
                                                type="date"
                                                value={editData.published_date}
                                                onChange={e => setEditData({ ...editData, published_date: e.target.value })}
                                                className="text-right font-medium text-slate-700 dark:text-slate-200 border-b border-blue-500 focus:outline-none bg-transparent"
                                            />
                                        ) : (
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{book.published_date ? new Date(book.published_date).toLocaleDateString() : 'N/A'}</span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 dark:text-slate-500">Rating</span>
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                min="0"
                                                max="5"
                                                step="0.1"
                                                value={editData.rating}
                                                onChange={e => setEditData({ ...editData, rating: e.target.value })}
                                                className="text-right font-medium text-slate-700 dark:text-slate-200 border-b border-blue-500 focus:outline-none w-16 bg-transparent"
                                            />
                                        ) : (
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{book.rating?.toFixed(1) || '0.0'} / 5</span>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 border-t dark:border-slate-800">
                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Description</h4>
                                    {isEditing ? (
                                        <textarea
                                            value={editData.description}
                                            onChange={e => setEditData({ ...editData, description: e.target.value })}
                                            rows={4}
                                            className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded border border-blue-200 dark:border-blue-900/50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm dark:text-slate-200"
                                        />
                                    ) : (
                                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                            {book.description || 'No description available.'}
                                        </p>
                                    )}
                                </div>

                                <div className="pt-4 border-t dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Collections</h4>
                                        <button
                                            onClick={() => setShowAddCollection(!showAddCollection)}
                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-blue-600 dark:text-blue-400"
                                        >
                                            <PlusIcon className="w-3 h-3" />
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {book.collections.map(col => (
                                            <span key={col.id} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-xs font-medium flex items-center">
                                                {col.name}
                                                <button
                                                    onClick={() => handleRemoveCollection(col.id)}
                                                    className="ml-1 hover:text-red-500"
                                                >
                                                    <XMarkIcon className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                        {book.collections.length === 0 && <span className="text-slate-400 dark:text-slate-500 text-xs italic font-normal">Not in any collections</span>}
                                    </div>

                                    {showAddCollection && (
                                        <div className="mt-2 space-y-2 animate-in slide-in-from-top-1 duration-200">
                                            <select
                                                className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 dark:text-slate-200"
                                                onChange={(e) => handleAddCollection(Number(e.target.value))}
                                                defaultValue=""
                                            >
                                                <option value="" disabled>Add to collection...</option>
                                                {allCollections?.filter((c: Collection) => !book.collections.find((bc: Collection) => bc.id === c.id)).map((col: Collection) => (
                                                    <option key={col.id} value={col.id}>{col.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t dark:border-slate-800">
                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Tags</h4>
                                    {isEditing ? (
                                        <input
                                            value={editData.tags}
                                            onChange={e => setEditData({ ...editData, tags: e.target.value })}
                                            placeholder="Tags (comma separated)"
                                            className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded border border-blue-200 dark:border-blue-900/50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm dark:text-slate-200"
                                        />
                                    ) : (
                                        <div className="flex flex-wrap gap-1">
                                            {book.tags.map(tag => (
                                                <span key={tag.id} className={`px-2 py-0.5 rounded-full text-xs font-medium ${tagTypeColors[tag.type || 'general'] || tagTypeColors.general}`}>
                                                    {tag.name}
                                                </span>
                                            ))}
                                            {book.tags.length === 0 && <span className="text-slate-400 dark:text-slate-500 text-xs italic">No tags</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-slate-500 dark:text-slate-400">Book not found</p>
                    )}
                </div>

                {/* Actions */}
                <div className="p-4 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex gap-2 transition-colors duration-200 shrink-0">
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleSave}
                                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700"
                            >
                                <CheckIcon className="w-4 h-4" />
                                <span>Save Changes</span>
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 rounded-lg font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => {
                                    if (book && onRead) {
                                        onRead(book.id);
                                        // Close panel so reader is visible (especially important on mobile)
                                        onClose();
                                    }
                                }}
                                className="flex-2 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 shadow-sm"
                            >
                                <span>Read Book</span>
                            </button>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 rounded-lg font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                <PencilSquareIcon className="w-4 h-4" />
                                <span>Edit</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
        </>
    );
};

export default BookDetailPanel;
