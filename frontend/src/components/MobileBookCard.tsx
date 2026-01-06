import React from 'react';
import { clsx } from 'clsx';

interface Author {
    id: number;
    name: string;
}

interface Tag {
    id: number;
    name: string;
}

interface Book {
    id: number;
    title: string;
    authors: Author[];
    tags: Tag[];
    format: string;
    progress_percentage?: number;
    is_read?: boolean;
    cover_url?: string;
}

interface MobileBookCardProps {
    book: Book;
    isSelected: boolean;
    onClick: () => void;
    showThumbnails?: boolean;
}

const MobileBookCard: React.FC<MobileBookCardProps> = ({
    book,
    isSelected,
    onClick,
    showThumbnails = true,
}) => {
    const authorNames = book.authors.map(a => a.name).join(', ');
    const visibleTags = book.tags.slice(0, 3);
    const remainingTagsCount = book.tags.length - visibleTags.length;

    // Format badge color based on file type
    const getFormatColor = (format: string) => {
        const formatLower = format.toLowerCase();
        if (formatLower === 'epub') return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';
        if (formatLower === 'pdf') return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';
        if (formatLower === 'mobi') return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300';
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
    };

    return (
        <div
            onClick={onClick}
            className={clsx(
                'flex gap-3 p-3 rounded-lg border transition-all cursor-pointer touch-target',
                isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            )}
        >
            {/* Cover Thumbnail (Optional) */}
            {showThumbnails && (
                <div className="shrink-0 w-12 h-16 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden">
                    {book.cover_url ? (
                        <img
                            src={book.cover_url}
                            alt={book.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                    )}
                </div>
            )}

            {/* Book Metadata */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
                {/* Title & Format Badge */}
                <div className="flex items-start gap-2">
                    <h3 className="flex-1 font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight">
                        {book.title}
                    </h3>
                    <span className={clsx(
                        'shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase',
                        getFormatColor(book.format)
                    )}>
                        {book.format}
                    </span>
                </div>

                {/* Authors */}
                {authorNames && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        {authorNames}
                    </p>
                )}

                {/* Tags */}
                {book.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                        {visibleTags.map(tag => (
                            <span
                                key={tag.id}
                                className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-[10px] font-medium"
                            >
                                {tag.name}
                            </span>
                        ))}
                        {remainingTagsCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-500 rounded text-[10px] font-medium">
                                +{remainingTagsCount}
                            </span>
                        )}
                    </div>
                )}

                {/* Progress Bar */}
                {(book.progress_percentage !== undefined && book.progress_percentage > 0) || book.is_read ? (
                    <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={clsx(
                                    'h-full rounded-full transition-all',
                                    book.is_read
                                        ? 'bg-green-500'
                                        : 'bg-blue-500'
                                )}
                                style={{ width: `${book.is_read ? 100 : (book.progress_percentage || 0)}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium shrink-0">
                            {book.is_read ? 'Read' : `${Math.round(book.progress_percentage || 0)}%`}
                        </span>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default MobileBookCard;
