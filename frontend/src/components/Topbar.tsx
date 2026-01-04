import React from 'react';
import {
    PlusIcon,
    PencilIcon,
    ArrowDownTrayIcon,
    SunIcon,
    MoonIcon
} from '@heroicons/react/24/outline';

interface TopbarProps {
    selectedBookId: number | null;
    onAddBooks: () => void;
    onEditBook: (id: number) => void;
    onDownloadBook: (id: number) => void;
    darkMode: boolean;
    toggleDarkMode: () => void;
}

const Topbar: React.FC<TopbarProps> = ({
    selectedBookId,
    onAddBooks,
    onEditBook,
    onDownloadBook,
    darkMode,
    toggleDarkMode,
}) => {
    return (
        <div className="h-12 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-20 transition-colors duration-200">
            <div className="flex items-center space-x-2">
                <button
                    onClick={onAddBooks}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
                >
                    <PlusIcon className="w-4 h-4" />
                    <span>Add Books</span>
                </button>

                <button
                    onClick={() => selectedBookId && onEditBook(selectedBookId)}
                    disabled={!selectedBookId}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
                >
                    <PencilIcon className="w-4 h-4" />
                    <span>Edit Metadata</span>
                </button>

                <button
                    onClick={() => selectedBookId && onDownloadBook(selectedBookId)}
                    disabled={!selectedBookId}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
                >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    <span>Download Book</span>
                </button>
            </div>

            <div className="flex items-center">
                <button
                    onClick={toggleDarkMode}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {darkMode ? (
                        <SunIcon className="w-5 h-5" />
                    ) : (
                        <MoonIcon className="w-5 h-5" />
                    )}
                </button>
            </div>
        </div>
    );
};

export default Topbar;
