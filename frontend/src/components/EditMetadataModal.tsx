import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import api from '../api';

interface EditMetadataModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookId: number | null;
    onSuccess: () => void;
}

interface FormData {
    title: string;
    authors: string;
    description: string;
    publisher: string;
    language: string;
    tags: string;
    series: string;
    series_index: string;
    rating: number;
    is_read: boolean;
}

const EditMetadataModal: React.FC<EditMetadataModalProps> = ({
    isOpen,
    onClose,
    bookId,
    onSuccess,
}) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>({
        title: '',
        authors: '',
        description: '',
        publisher: '',
        language: '',
        tags: '',
        series: '',
        series_index: '',
        rating: 0,
        is_read: false,
    });

    useEffect(() => {
        if (isOpen && bookId) {
            fetchBookDetails();
        } else {
            // Reset form when closed or no book selected
            setFormData({
                title: '',
                authors: '',
                description: '',
                publisher: '',
                language: '',
                tags: '',
                series: '',
                series_index: '',
                rating: 0,
                is_read: false,
            });
            setError(null);
        }
    }, [isOpen, bookId]);

    const fetchBookDetails = async () => {
        if (!bookId) return;

        setLoading(true);
        setError(null);

        try {
            const [bookRes, progressRes] = await Promise.all([
                api.get(`/books/${bookId}`),
                api.get(`/progress/${bookId}`)
            ]);
            
            const book = bookRes.data;
            const progress = progressRes.data;

            setFormData({
                title: book.title || '',
                authors: book.authors?.map((a: any) => a.name).join(', ') || '',
                description: book.description || '',
                publisher: book.publisher || '',
                language: book.language || '',
                tags: book.tags?.map((t: any) => t.name).join(', ') || '',
                series: book.series || '',
                series_index: book.series_index?.toString() || '',
                rating: book.rating || 0,
                is_read: !!progress?.is_finished,
            });
        } catch (err) {
            console.error('Failed to fetch book details:', err);
            setError('Failed to load book metadata');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookId) return;

        setSaving(true);
        setError(null);

        try {
            // Parse comma-separated lists
            const authorsList = formData.authors
                .split(',')
                .map((s: string) => s.trim())
                .filter((s: string) => s.length > 0);

            const tagsList = formData.tags
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            const updateData = {
                title: formData.title,
                authors: authorsList,
                description: formData.description,
                publisher: formData.publisher,
                language: formData.language,
                tags: tagsList,
                series: formData.series || null,
                series_index: formData.series_index ? parseInt(formData.series_index) : null,
                rating: formData.rating,
            };

            await api.patch(`/books/${bookId}`, updateData);

            // Update read status if changed (or just always send current)
            await api.post(`/progress/${bookId}`, {
                is_finished: formData.is_read ? 1 : 0,
                percentage: formData.is_read ? 100 : 0
            });

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to update book:', err);
            setError('Failed to update metadata');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-8 text-left align-middle shadow-2xl transition-all border dark:border-slate-800">
                                <div className="flex justify-between items-center mb-6">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-medium leading-6 text-slate-900 dark:text-white"
                                    >
                                        Edit Metadata
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                {loading ? (
                                    <div className="flex justify-center items-center py-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {error && (
                                            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                                                {error}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div>
                                                    <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                        Title
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id="title"
                                                        name="title"
                                                        value={formData.title}
                                                        onChange={handleChange}
                                                        className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label htmlFor="authors" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                        Authors (comma separated)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id="authors"
                                                        name="authors"
                                                        value={formData.authors}
                                                        onChange={handleChange}
                                                        className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label htmlFor="publisher" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                            Publisher
                                                        </label>
                                                        <input
                                                            type="text"
                                                            id="publisher"
                                                            name="publisher"
                                                            value={formData.publisher}
                                                            onChange={handleChange}
                                                            className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor="language" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                            Language
                                                        </label>
                                                        <input
                                                            type="text"
                                                            id="language"
                                                            name="language"
                                                            value={formData.language}
                                                            onChange={handleChange}
                                                            className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label htmlFor="series" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                            Series
                                                        </label>
                                                        <input
                                                            type="text"
                                                            id="series"
                                                            name="series"
                                                            value={formData.series}
                                                            onChange={handleChange}
                                                            className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor="series_index" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                            Series Index
                                                        </label>
                                                        <input
                                                            type="number"
                                                            id="series_index"
                                                            name="series_index"
                                                            value={formData.series_index}
                                                            onChange={handleChange}
                                                            className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label htmlFor="rating" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                            Rating (0-5)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.5"
                                                            min="0"
                                                            max="5"
                                                            id="rating"
                                                            name="rating"
                                                            value={formData.rating}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, rating: parseFloat(e.target.value) }))}
                                                            className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                    </div>

                                                    <div className="flex items-end pb-2">
                                                        <label className="flex items-center cursor-pointer select-none">
                                                            <div className="relative">
                                                                <input
                                                                    type="checkbox"
                                                                    className="sr-only"
                                                                    checked={formData.is_read}
                                                                    onChange={(e) => setFormData(prev => ({ ...prev, is_read: e.target.checked }))}
                                                                />
                                                                <div className={`block w-10 h-6 rounded-full transition-colors ${formData.is_read ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                                                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform transform ${formData.is_read ? 'translate-x-4' : ''}`}></div>
                                                            </div>
                                                            <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">Mark as Read</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label htmlFor="tags" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                        Tags (comma separated)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id="tags"
                                                        name="tags"
                                                        value={formData.tags}
                                                        onChange={handleChange}
                                                        className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="fiction, history, novel"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Description
                                            </label>
                                            <textarea
                                                id="description"
                                                name="description"
                                                value={formData.description}
                                                onChange={handleChange}
                                                rows={5}
                                                className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>

                                        <div className="mt-6 flex justify-end space-x-3">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                disabled={saving}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                disabled={saving}
                                            >
                                                {saving ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default EditMetadataModal;
