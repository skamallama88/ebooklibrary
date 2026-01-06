import React from 'react';
import {
    PlusIcon,
    PencilIcon,
    ArrowDownTrayIcon,
    BookOpenIcon,
    SunIcon,
    MoonIcon,
    TrashIcon,
    Square3Stack3DIcon,
    WrenchIcon
} from '@heroicons/react/24/outline';
import UserMenu from './UserMenu';

interface TopbarProps {
    selectedBookIds: number[];
    onAddBooks: () => void;
    onEditBook: (id: number) => void;
    onDownloadBooks: (ids: number[]) => void;
    onDeleteBooks: (ids: number[]) => void;
    onAddToCollection: (ids: number[]) => void;
    onRead: (id: number) => void;
    darkMode: boolean;
    toggleDarkMode: () => void;
    onOpenSettings: () => void;
    onOpenUserManagement: () => void;
    onWordCount?: (ids: number[]) => void;
}

const Topbar: React.FC<TopbarProps> = ({
    selectedBookIds,
    onAddBooks,
    onEditBook,
    onDownloadBooks,
    onDeleteBooks,
    onAddToCollection,
    onRead,
    darkMode,
    toggleDarkMode,
    onOpenSettings,
    onOpenUserManagement,
    onWordCount,
}) => {
    const isSingleSelection = selectedBookIds.length === 1;
    const isMultipleSelection = selectedBookIds.length > 1;
    const hasSelection = selectedBookIds.length > 0;

    const [showUtilities, setShowUtilities] = React.useState(false);
    const utilitiesRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (utilitiesRef.current && !utilitiesRef.current.contains(event.target as Node)) {
                setShowUtilities(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="h-12 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-[60] transition-colors duration-200">
            <div className="flex items-center space-x-2">
                <button
                    onClick={onAddBooks}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
                >
                    <PlusIcon className="w-4 h-4" />
                    <span>Add Books</span>
                </button>

                {hasSelection && (
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
                )}

                <button
                    onClick={() => isSingleSelection && onRead(selectedBookIds[0])}
                    disabled={!isSingleSelection}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors shadow-sm"
                    title={isMultipleSelection ? "Select only one book to read" : ""}
                >
                    <BookOpenIcon className="w-4 h-4" />
                    <span>Read</span>
                </button>

                <button
                    onClick={() => isSingleSelection && onEditBook(selectedBookIds[0])}
                    disabled={!isSingleSelection}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
                >
                    <PencilIcon className="w-4 h-4" />
                    <span>Edit Metadata</span>
                </button>

                <button
                    onClick={() => onDownloadBooks(selectedBookIds)}
                    disabled={!hasSelection}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
                >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    <span>{isMultipleSelection ? `Download (${selectedBookIds.length})` : 'Download'}</span>
                </button>

                <button
                    onClick={() => onAddToCollection(selectedBookIds)}
                    disabled={!hasSelection}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
                >
                    <Square3Stack3DIcon className="w-4 h-4" />
                    <span>Collect</span>
                </button>

                <button
                    onClick={() => onDeleteBooks(selectedBookIds)}
                    disabled={!hasSelection}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
                >
                    <TrashIcon className="w-4 h-4" />
                    <span>Delete</span>
                </button>
            </div>

            <div className="flex items-center space-x-3">
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
                <div className="relative" ref={utilitiesRef}>
                    <button
                        onClick={() => setShowUtilities(!showUtilities)}
                        className={`p-1.5 rounded-lg transition-colors ${showUtilities ? 'bg-slate-200 dark:bg-slate-700' : 'bg-slate-100 dark:bg-slate-800'} text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700`}
                        title="Utilities"
                    >
                        <WrenchIcon className="w-5 h-5" />
                    </button>
                    {showUtilities && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border dark:border-slate-700 overflow-hidden z-50">
                            <div className="py-1">
                                <button
                                    onClick={() => {
                                        if (onWordCount) onWordCount(selectedBookIds);
                                        setShowUtilities(false);
                                    }}
                                    disabled={!hasSelection}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <span>Word Count</span>
                                </button>
                                <button
                                    disabled={true}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-400 dark:text-slate-500 cursor-not-allowed flex items-center gap-2"
                                    title="Coming Soon"
                                >
                                    <span>Summarizer</span>
                                    <span className="text-[10px] uppercase bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">Soon</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <UserMenu 
                    onOpenSettings={onOpenSettings}
                    onOpenUserManagement={onOpenUserManagement}
                />
            </div>
        </div>
    );
};

export default Topbar;
