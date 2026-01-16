import React, { useMemo, useRef } from 'react';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    type SortingState,
    type OnChangeFn,
    type ColumnDef,
    type VisibilityState,
    type ColumnSizingState,
    type HeaderContext,
    type CellContext,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { clsx } from 'clsx';
import { useMediaQuery } from '../hooks/useMediaQuery';
import MobileBookCard from './MobileBookCard';
import type { Book, Tag } from '../types';

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

const columnHelper = createColumnHelper<Book>();

const IndeterminateCheckbox = ({
    indeterminate,
    className = "",
    ...rest
}: { indeterminate?: boolean } & React.HTMLProps<HTMLInputElement>) => {
    const ref = React.useRef<HTMLInputElement>(null!)

    React.useEffect(() => {
        if (typeof indeterminate === 'boolean') {
            ref.current.indeterminate = !rest.checked && indeterminate
        }
    }, [ref, indeterminate, rest.checked])

    return (
        <input
            type="checkbox"
            ref={ref}
            className={className + " cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:border-slate-700"}
            {...rest}
        />
    )
}

interface LibraryGridProps {
    data: Book[];
    isLoading?: boolean;
    selectedBookId?: number | null; // Keep for backward compatibility if needed, but we'll use focusedBookId
    focusedBookId?: number | null;
    onRowClick?: (book: Book) => void;
    onSelectionChange?: (selectedIds: number[]) => void;
    sorting?: SortingState;
    onSortingChange?: OnChangeFn<SortingState>;
}

const LibraryGrid: React.FC<LibraryGridProps> = ({
    data,
    isLoading,
    selectedBookId,
    focusedBookId,
    onRowClick,
    onSelectionChange,
    sorting = [],
    onSortingChange
}) => {
    const { isMobile } = useMediaQuery();
    const [rowSelection, setRowSelection] = React.useState({});

    // Load column visibility and sizing from localStorage
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() => {
        const saved = localStorage.getItem('libraryColumnVisibility');
        return saved ? JSON.parse(saved) : {};
    });

    const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>(() => {
        const saved = localStorage.getItem('libraryColumnSizing');
        return saved ? JSON.parse(saved) : {};
    });

    // Persist column visibility changes
    React.useEffect(() => {
        localStorage.setItem('libraryColumnVisibility', JSON.stringify(columnVisibility));
    }, [columnVisibility]);

    // Persist column sizing changes
    React.useEffect(() => {
        localStorage.setItem('libraryColumnSizing', JSON.stringify(columnSizing));
    }, [columnSizing]);

    // Calculate tag frequencies across the entire dataset for sorting
    const tagFrequencies = useMemo(() => {
        const freqs: Record<string, number> = {};
        data.forEach(book => {
            book.tags?.forEach(tag => {
                freqs[tag.name] = (freqs[tag.name] || 0) + 1;
            });
        });
        return freqs;
    }, [data]);

    const sortTags = React.useCallback((tags: Tag[]) => {
        return [...tags].sort((a, b) => {
            const freqA = tagFrequencies[a.name] || 0;
            const freqB = tagFrequencies[b.name] || 0;
            if (freqB !== freqA) return freqB - freqA;
            return a.name.localeCompare(b.name);
        });
    }, [tagFrequencies]);

    const columns = useMemo<ColumnDef<Book>[]>(() => [
        {
            id: 'select',
            size: 48,
            enableResizing: false,
            header: ({ table }: HeaderContext<Book, unknown>) => (
                <div className="flex justify-center w-full">
                    <IndeterminateCheckbox
                        {...{
                            checked: table.getIsAllRowsSelected(),
                            indeterminate: table.getIsSomeRowsSelected(),
                            onChange: table.getToggleAllRowsSelectedHandler(),
                        }}
                    />
                </div>
            ),
            cell: ({ row }: CellContext<Book, unknown>) => (
                <div className="flex justify-center w-full" onClick={(e) => e.stopPropagation()}>
                    <IndeterminateCheckbox
                        {...{
                            checked: row.getIsSelected(),
                            disabled: !row.getCanSelect(),
                            indeterminate: row.getIsSomeSelected(),
                            onChange: row.getToggleSelectedHandler(),
                        }}
                    />
                </div>
            ),
        },
        columnHelper.accessor('title', {
            header: 'Title',
            size: 200,
            minSize: 100,
            cell: (info) => <span className="font-semibold text-slate-800 dark:text-slate-100">{info.getValue()}</span>,
        }) as ColumnDef<Book>,
        columnHelper.accessor('authors', {
            header: 'Author',
            size: 180,
            minSize: 100,
            cell: (info) => {
                const authors = info.getValue() || [];
                return <span className="text-slate-600 dark:text-slate-400">{authors.map(a => a.name).join(', ') || 'Unknown'}</span>;
            },
        }) as ColumnDef<Book>,
        columnHelper.accessor('is_read', {
            header: 'Read',
            size: 80,
            minSize: 60,
            enableSorting: false,
            cell: (info) => (
                <div className="flex justify-center">
                    {info.getValue() ? (
                        <span className="text-green-600 dark:text-green-500 font-bold">✓</span>
                    ) : (
                        <span className="text-slate-400 dark:text-slate-600 text-xs">—</span>
                    )}
                </div>
            ),
        }) as ColumnDef<Book>,
        columnHelper.accessor('progress_percentage', {
            header: 'Progress',
            size: 120,
            minSize: 80,
            enableSorting: false,
            cell: (info) => {
                const progress = info.getValue() || 0;
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-400 w-10 text-right">{Math.round(progress)}%</span>
                    </div>
                );
            },
        }) as ColumnDef<Book>,
        columnHelper.accessor('rating', {
            header: 'Rating',
            size: 100,
            minSize: 80,
            cell: (info) => {
                const rating = info.getValue() || 0;
                return (
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                            <span key={star} className={star <= rating ? 'text-yellow-500' : 'text-slate-300 dark:text-slate-700'}>
                                ★
                            </span>
                        ))}
                    </div>
                );
            },
        }) as ColumnDef<Book>,
        columnHelper.accessor('published_date', {
            header: 'Published',
            size: 120,
            minSize: 100,
            cell: (info) => {
                const date = info.getValue();
                return date ? <span className="text-slate-600 dark:text-slate-400 text-sm whitespace-nowrap">{new Date(date).toLocaleDateString()}</span> : <span className="text-slate-400 dark:text-slate-600">—</span>;
            },
        }) as ColumnDef<Book>,
        columnHelper.accessor('series', {
            header: 'Series',
            size: 180,
            minSize: 120,
            cell: (info) => {
                const series = info.getValue();
                const index = info.row.original.series_index;
                if (!series) return <span className="text-slate-400 dark:text-slate-600">—</span>;
                return <span className="text-slate-600 dark:text-slate-400">{series}{index ? ` #${index}` : ''}</span>;
            },
        }) as ColumnDef<Book>,
        columnHelper.accessor('publisher', {
            header: 'Publisher',
            size: 150,
            minSize: 100,
            cell: (info) => {
                const publisher = info.getValue();
                let publisherName = '';
                if (typeof publisher === 'string') {
                    publisherName = publisher;
                } else if (publisher && typeof publisher === 'object' && 'name' in publisher) {
                    publisherName = publisher.name;
                }
                return publisherName ? <span className="text-slate-600 dark:text-slate-400">{publisherName}</span> : <span className="text-slate-400 dark:text-slate-600">—</span>;
            },
        }) as ColumnDef<Book>,
        columnHelper.accessor('created_at', {
            header: 'Date Added',
            size: 120,
            minSize: 100,
            cell: (info) => {
                const date = info.getValue();
                return date ? <span className="text-slate-500 dark:text-slate-500 text-sm whitespace-nowrap">{new Date(date).toLocaleDateString()}</span> : <span className="text-slate-400 dark:text-slate-600">—</span>;
            },
        }) as ColumnDef<Book>,
        columnHelper.accessor('word_count', {
            header: 'Words',
            size: 100,
            minSize: 80,
            cell: (info) => {
                const count = info.getValue();
                return count ? <span className="text-slate-600 dark:text-slate-400 text-sm">{count.toLocaleString()}</span> : <span className="text-slate-400 dark:text-slate-600">—</span>;
            },
        }) as ColumnDef<Book>,
        columnHelper.accessor('last_read', {
            header: 'Last Read',
            size: 130,
            minSize: 100,
            cell: (info) => {
                const date = info.getValue();
                if (!date) return <span className="text-slate-400 dark:text-slate-600">—</span>;
                const lastRead = new Date(date);
                const now = new Date();
                const diffMs = now.getTime() - lastRead.getTime();
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                
                let displayText = '';
                if (diffDays === 0) {
                    displayText = 'Today';
                } else if (diffDays === 1) {
                    displayText = 'Yesterday';
                } else if (diffDays < 7) {
                    displayText = `${diffDays} days ago`;
                } else {
                    displayText = lastRead.toLocaleDateString();
                }
                
                return <span className="text-slate-600 dark:text-slate-400 text-sm whitespace-nowrap" title={lastRead.toLocaleString()}>{displayText}</span>;
            },
        }) as ColumnDef<Book>,
        columnHelper.accessor('format', {
            header: 'Format',
            size: 100,
            minSize: 80,
            cell: (info) => (
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                    {info.getValue() || '???'}
                </span>
            ),
        }) as ColumnDef<Book>,
        columnHelper.accessor('tags', {
            header: 'Tags',
            size: 200,
            minSize: 150,
            enableSorting: false,
            cell: (info) => {
                const rawTags = info.getValue() || [];
                if (rawTags.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
                
                const sortedTags = sortTags(rawTags);
                const columnWidth = info.column.getSize();
                
                let currentWidth = 0;
                const displayTags = [];
                let hiddenCount = 0;
                const GAP = 4;
                const COUNTER_WIDTH = 25; // Space for +X indicator
                const PADDING_X = 24; // Cell padding
                const availableWidth = columnWidth - PADDING_X;

                for (let i = 0; i < sortedTags.length; i++) {
                    const tag = sortedTags[i];
                    // More realistic tag width estimate: 5.5px per char + padding + gap
                    const tagWidth = (tag.name.length * 5.5) + 12 + GAP;
                    
                    const isLast = i === sortedTags.length - 1;
                    const reservation = isLast ? 0 : COUNTER_WIDTH;
                    
                    if (currentWidth + tagWidth <= availableWidth - reservation) {
                        displayTags.push(tag);
                        currentWidth += tagWidth;
                    } else {
                        // Special case: if it's the first tag and it's too long, 
                        // but we have some space, show it anyway truncated.
                        if (i === 0 && availableWidth > 40) {
                            displayTags.push(tag);
                            hiddenCount = sortedTags.length - 1;
                        } else {
                            hiddenCount = sortedTags.length - i;
                        }
                        break;
                    }
                }

                return (
                    <div className="flex items-center gap-1 overflow-hidden whitespace-nowrap">
                        {displayTags.map(tag => (
                            <span 
                                key={tag.id} 
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink min-w-0 truncate ${tagTypeColors[tag.type || 'general'] || tagTypeColors.general}`}
                                title={tag.name}
                            >
                                {tag.name}
                            </span>
                        ))}
                        {hiddenCount > 0 && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex-shrink-0">
                                +{hiddenCount}
                            </span>
                        )}
                        {displayTags.length === 0 && sortedTags.length > 0 && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">+{sortedTags.length}</span>
                        )}
                    </div>
                );
            },
        }) as ColumnDef<Book>,
    ], [sortTags]);


    const table = useReactTable({
        data,
        columns,
        state: {
            rowSelection,
            sorting,
            columnVisibility,
            columnSizing,
        },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: onSortingChange,
        onColumnVisibilityChange: setColumnVisibility,
        onColumnSizingChange: setColumnSizing,
        getCoreRowModel: getCoreRowModel(),
        getRowId: row => row.id.toString(),
        manualSorting: true,
        columnResizeMode: 'onChange',
        enableColumnResizing: true,
    });

    // Notify parent of selection changes
    React.useEffect(() => {
        if (onSelectionChange) {
            // Since we use getRowId: row => row.id.toString(), 
            // the keys in rowSelection are the book IDs as strings.
            const selectedIds = Object.keys(rowSelection)
                .map(idStr => parseInt(idStr))
                .filter(id => !isNaN(id));
            onSelectionChange(selectedIds);
        }
    }, [rowSelection, onSelectionChange]);

    const parentRef = useRef<HTMLDivElement>(null);
    const { rows } = table.getRowModel();

    const rowVirtualizer = useVirtualizer({
        count: isLoading ? 20 : rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 48,
        overscan: 5,
    });

    const [showColumnSelector, setShowColumnSelector] = React.useState(false);

    if (!isLoading && data.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-2 p-6">
                <p className="text-lg font-medium">No books found</p>
                <p className="text-sm">Try adjusting your search or import some books.</p>
            </div>
        );
    }

    // Mobile Card View
    if (isMobile) {
        return (
            <div className="flex-1 overflow-auto p-3 space-y-2 bg-slate-50 dark:bg-slate-950">
                {isLoading ? (
                    // Loading skeleton
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="animate-pulse bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                            <div className="flex gap-3">
                                <div className="w-12 h-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    data.map((book) => (
                        <MobileBookCard
                            key={book.id}
                            book={book}
                            isSelected={selectedBookId === book.id}
                            onClick={() => onRowClick && onRowClick(book)}
                            showThumbnails={true}
                        />
                    ))
                )}
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-slate-900 rounded-lg shadow-sm border dark:border-slate-800 m-4 font-sans transition-colors duration-200">
            {/* Column Selector Toolbar */}
            <div className="px-4 py-2 border-b dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-800/50">
                <div className="relative">
                    <button
                        onClick={() => setShowColumnSelector(!showColumnSelector)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                            Columns
                        </span>
                    </button>
                    {showColumnSelector && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowColumnSelector(false)}
                            />
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg z-20 p-2">
                                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-2 py-1 mb-1">
                                    Toggle Columns
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {table.getAllLeafColumns().map(column => {
                                        // Skip the select column
                                        if (column.id === 'select') return null;

                                        return (
                                            <label
                                                key={column.id}
                                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={column.getIsVisible()}
                                                    onChange={column.getToggleVisibilityHandler()}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:border-slate-600"
                                                />
                                                <span className="text-sm text-slate-700 dark:text-slate-300">
                                                    {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                                <div className="border-t dark:border-slate-700 mt-2 pt-2">
                                    <button
                                        onClick={() => {
                                            table.resetColumnVisibility();
                                            localStorage.removeItem('libraryColumnVisibility');
                                        }}
                                        className="w-full px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        Reset to Defaults
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div
                ref={parentRef}
                className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700"
            >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700 flex w-fit min-w-full">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <div key={headerGroup.id} className="flex" style={{ width: headerGroup.headers.reduce((sum, h) => sum + h.getSize(), 0) }}>
                            {headerGroup.headers.map((header) => (
                                <div
                                    key={header.id}
                                    onClick={header.column.getToggleSortingHandler()}
                                    className={clsx(
                                        "p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none relative",
                                        header.column.getCanSort() ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" : ""
                                    )}
                                    style={{ width: header.getSize() }}
                                >
                                    <div className="flex items-center space-x-1">
                                        <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                                        {header.column.getIsSorted() && (
                                            <span className="text-blue-500">
                                                {header.column.getIsSorted() === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                    {/* Resize handle */}
                                    {header.column.getCanResize() && (
                                        <div
                                            onMouseDown={header.getResizeHandler()}
                                            onTouchStart={header.getResizeHandler()}
                                            className={clsx(
                                                "absolute top-0 right-0 w-1 h-full cursor-col-resize select-none touch-none",
                                                "hover:bg-blue-500 dark:hover:bg-blue-400",
                                                header.column.getIsResizing() ? "bg-blue-500 dark:bg-blue-400" : ""
                                            )}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Body */}
                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        if (isLoading) {
                            return (
                                <div
                                    key={`loading-${virtualRow.index}`}
                                    className="animate-pulse border-b border-slate-50 dark:border-slate-800 flex items-center p-3"
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                >
                                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
                                </div>
                            );
                        }

                        const row = rows[virtualRow.index];
                        const rowWidth = table.getHeaderGroups()[0].headers.reduce((sum, h) => sum + h.getSize(), 0);

                        return (
                            <div
                                key={row.id}
                                onClick={() => onRowClick && onRowClick(row.original)}
                                className={clsx(
                                    "flex items-center transition-colors cursor-pointer border-b border-slate-50 dark:border-slate-800 group-last:border-none",
                                    row.getIsSelected() ? "bg-blue-50/80 dark:bg-blue-900/40" :
                                        (focusedBookId === row.original.id || selectedBookId === row.original.id) ? "bg-blue-50/80 dark:bg-blue-900/20" :
                                            "hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
                                )}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: Math.max(rowWidth, parentRef.current?.clientWidth || 0),
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <div
                                        key={cell.id}
                                        className="p-3 truncate"
                                        style={{ width: cell.column.getSize() }}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default LibraryGrid;
