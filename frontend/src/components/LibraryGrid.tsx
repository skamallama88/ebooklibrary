import React, { useMemo, useRef } from 'react';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
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
    file_size: number;
    created_at: string;
    rating: number;
}

const columnHelper = createColumnHelper<Book>();

interface LibraryGridProps {
    data: Book[];
    isLoading?: boolean;
    selectedBookId?: number | null;
    onRowClick?: (book: Book) => void;
}

const LibraryGrid: React.FC<LibraryGridProps> = ({ data, isLoading, selectedBookId, onRowClick }) => {
    const columns = useMemo(() => [
        columnHelper.accessor('title', {
            header: 'Title',
            cell: (info) => <span className="font-semibold text-slate-800 dark:text-slate-100">{info.getValue()}</span>,
        }),
        columnHelper.accessor('authors', {
            header: 'Author',
            cell: (info) => {
                const authors = info.getValue() || [];
                return <span className="text-slate-600 dark:text-slate-400">{authors.map(a => a.name).join(', ') || 'Unknown'}</span>;
            },
        }),
        columnHelper.accessor('created_at', {
            header: 'Date Added',
            cell: (info) => <span className="text-slate-500 dark:text-slate-500 text-sm whitespace-nowrap">{new Date(info.getValue()).toLocaleDateString()}</span>,
        }),
        columnHelper.accessor('format', {
            header: 'Format',
            cell: (info) => (
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                    {info.getValue() || '???'}
                </span>
            ),
        }),
        columnHelper.accessor('tags', {
            header: 'Tags',
            cell: (info) => (
                <div className="flex flex-wrap gap-1 max-w-xs">
                    {(info.getValue() || []).slice(0, 3).map(tag => (
                        <span key={tag.id} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[10px] font-medium">
                            {tag.name}
                        </span>
                    ))}
                    {info.getValue().length > 3 && <span className="text-[10px] text-slate-400 dark:text-slate-500">+{info.getValue().length - 3}</span>}
                </div>
            ),
        }),
    ], []);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const parentRef = useRef<HTMLDivElement>(null);
    const { rows } = table.getRowModel();

    const rowVirtualizer = useVirtualizer({
        count: isLoading ? 20 : rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 48,
        overscan: 5,
    });

    if (!isLoading && data.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-2">
                <p className="text-lg font-medium">No books found</p>
                <p className="text-sm">Try adjusting your search or import some books.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-slate-900 rounded-lg shadow-sm border dark:border-slate-800 m-4 font-sans transition-colors duration-200">
            <div
                ref={parentRef}
                className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700"
            >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700 flex w-full">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <div key={headerGroup.id} className="flex w-full">
                            {headerGroup.headers.map((header, i) => (
                                <div
                                    key={header.id}
                                    className={clsx(
                                        "p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider",
                                        i === 0 ? "flex-1 min-w-[200px]" :
                                            i === 1 ? "w-[200px] shrink-0" :
                                                i === 2 ? "w-[120px] shrink-0" :
                                                    i === 3 ? "w-[100px] shrink-0 text-center" :
                                                        "w-[300px] shrink-0"
                                    )}
                                >
                                    {flexRender(header.column.columnDef.header, header.getContext())}
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
                        return (
                            <div
                                key={row.id}
                                onClick={() => onRowClick && onRowClick(row.original)}
                                className={clsx(
                                    "flex items-center transition-colors cursor-pointer border-b border-slate-50 dark:border-slate-800 group-last:border-none w-full",
                                    selectedBookId === row.original.id ? "bg-blue-50/80 dark:bg-blue-900/20" : "hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
                                )}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            >
                                {row.getVisibleCells().map((cell, i) => (
                                    <div
                                        key={cell.id}
                                        className={clsx(
                                            "p-3 truncate",
                                            i === 0 ? "flex-1 min-w-[200px]" :
                                                i === 1 ? "w-[200px] shrink-0" :
                                                    i === 2 ? "w-[120px] shrink-0" :
                                                        i === 3 ? "w-[100px] shrink-0 flex justify-center" :
                                                            "w-[300px] shrink-0"
                                        )}
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
