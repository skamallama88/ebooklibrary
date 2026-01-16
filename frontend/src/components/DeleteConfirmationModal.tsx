import React from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Book } from '../types';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    books: Book[];
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    books
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

                {/* Modal context */}
                <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl transition-all border dark:border-slate-800">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                Delete Books
                            </h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="mt-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Are you sure you want to delete {books.length} book{books.length > 1 ? 's' : ''}? This action cannot be undone.
                        </p>
                        
                        <div className="mt-4 max-h-48 overflow-y-auto rounded-lg bg-slate-50 dark:bg-slate-950 p-3 border dark:border-slate-800">
                            <ul className="space-y-2">
                                {books.map(book => (
                                    <li key={book.id} className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                        <span className="truncate">{book.title}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 gap-y-3 sm:gap-y-0">
                        <button
                            onClick={onClose}
                            className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;
