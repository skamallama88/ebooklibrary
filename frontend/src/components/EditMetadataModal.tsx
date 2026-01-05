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
            });
            setError(null);
        }
    }, [isOpen, bookId]);

    const fetchBookDetails = async () => {
        if (!bookId) return;

        setLoading(true);
        setError(null);

        try {
            const response = await api.get(`/books/${bookId}`);
            const book = response.data;

            setFormData({
                title: book.title || '',
                authors: book.authors?.map((a: any) => a.name).join(', ') || '',
                description: book.description || '',
                publisher: book.publisher || '',
                language: book.language || '',
                tags: book.tags?.map((t: any) => t.name).join(', ') || '',
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
                .map(s => s.trim())
                .filter(s => s.length > 0);

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
            };

            await api.patch(`/books/${bookId}`, updateData);
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
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 text-left align-middle shadow-xl transition-all border dark:border-slate-800">
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

                                        <div>
                                            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Description
                                            </label>
                                            <textarea
                                                id="description"
                                                name="description"
                                                value={formData.description}
                                                onChange={handleChange}
                                                rows={4}
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
