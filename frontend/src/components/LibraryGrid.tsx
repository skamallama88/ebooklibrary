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
            cell: (info) => <span className="font-semibold text-slate-800">{info.getValue()}</span>,
        }),
        columnHelper.accessor('authors', {
            header: 'Author',
            cell: (info) => {
                const authors = info.getValue() || [];
                return <span className="text-slate-600">{authors.map(a => a.name).join(', ') || 'Unknown'}</span>;
            },
        }),
        columnHelper.accessor('created_at', {
            header: 'Date Added',
            cell: (info) => <span className="text-slate-500 text-sm whitespace-nowrap">{new Date(info.getValue()).toLocaleDateString()}</span>,
        }),
        columnHelper.accessor('format', {
            header: 'Format',
            cell: (info) => (
                <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600 uppercase">
                    {info.getValue() || '???'}
                </span>
            ),
        }),
        columnHelper.accessor('tags', {
            header: 'Tags',
            cell: (info) => (
                <div className="flex flex-wrap gap-1 max-w-xs">
                    {(info.getValue() || []).slice(0, 3).map(tag => (
                        <span key={tag.id} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px font-medium">
                            {tag.name}
                        </span>
                    ))}
                    {info.getValue().length > 3 && <span className="text-[10px] text-slate-400">+{info.getValue().length - 3}</span>}
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
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-2">
                <p className="text-lg font-medium">No books found</p>
                <p className="text-sm">Try adjusting your search or import some books.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-lg shadow-sm border m-4 font-sans">
            <div
                ref={parentRef}
                className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-slate-200"
            >
                <table className="w-full text-left border-separate border-spacing-0">
                    <thead className="sticky top-0 z-10 bg-slate-50 border-b">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b"
                                    >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            if (isLoading) {
                                return (
                                    <tr
                                        key={`loading-${virtualRow.index}`}
                                        className="animate-pulse"
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualRow.size}px`,
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                    >
                                        <td colSpan={5} className="p-3 border-b border-slate-50">
                                            <div className="h-4 bg-slate-100 rounded w-full"></div>
                                        </td>
                                    </tr>
                                );
                            }

                            const row = rows[virtualRow.index];
                            return (
                                <tr
                                    key={row.id}
                                    onClick={() => onRowClick && onRowClick(row.original)}
                                    className={clsx(
                                        "transition-colors cursor-pointer border-b border-slate-50 group-last:border-none",
                                        selectedBookId === row.original.id ? "bg-blue-50/80" : "hover:bg-blue-50/30"
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
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            className="p-3 border-b border-slate-50 group-last:border-none"
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LibraryGrid;
