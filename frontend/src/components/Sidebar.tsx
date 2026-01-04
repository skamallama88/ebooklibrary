import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Library as LibraryIcon,
    Bookmark as BookmarkIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Plus as PlusIcon,
    Pencil as PencilIcon,
    Trash2 as Trash2Icon
} from 'lucide-react';
import api from '../api';
import { clsx } from 'clsx';

interface SidebarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    activeFilter: string;
    onFilterChange: (filter: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed, activeFilter, onFilterChange }) => {
    const [showNewCollectionInput, setShowNewCollectionInput] = React.useState(false);
    const [newCollectionName, setNewCollectionName] = React.useState('');
    const [editingCollectionId, setEditingCollectionId] = React.useState<number | null>(null);
    const [editingCollectionName, setEditingCollectionName] = React.useState('');

    const { data: tags } = useQuery({
        queryKey: ['tags'],
        queryFn: async () => {
            const res = await api.get('/books/tags');
            return res.data;
        }
    });

    const { data: collections, refetch: refetchCollections } = useQuery({
        queryKey: ['collections'],
        queryFn: async () => {
            const res = await api.get('/collections/');
            return res.data;
        }
    });

    const handleCreateCollection = async () => {
        if (!newCollectionName.trim()) return;
        try {
            await api.post('/collections/', { name: newCollectionName });
            setNewCollectionName('');
            setShowNewCollectionInput(false);
            refetchCollections();
        } catch (err) {
            console.error("Failed to create collection", err);
        }
    };

    const handleRenameCollection = async (id: number) => {
        if (!editingCollectionName.trim()) return;
        try {
            await api.patch(`/collections/${id}`, { name: editingCollectionName });
            setEditingCollectionId(null);
            setEditingCollectionName('');
            refetchCollections();
        } catch (err) {
            console.error("Failed to rename collection", err);
        }
    };

    const handleDeleteCollection = async (id: number) => {
        if (!confirm("Are you sure you want to delete this collection?")) return;
        try {
            await api.delete(`/collections/${id}`);
            refetchCollections();
        } catch (err) {
            console.error("Failed to delete collection", err);
        }
    };

    const menuItems = [
        { id: 'all', label: 'All Books', icon: LibraryIcon },
        { id: 'recent', label: 'Recently Added', icon: BookmarkIcon },
    ];

    return (
        <aside
            className={clsx(
                "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col shrink-0",
                collapsed ? "w-20" : "w-64"
            )}
        >
            {/* Header / Brand */}
            <div className="p-6 flex items-center justify-between">
                {!collapsed && (
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-100 dark:shadow-none">
                            <BookmarkIcon className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-100 tracking-tight">EbookLib</span>
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500"
                >
                    {collapsed ? <ChevronRightIcon className="w-5 h-5" /> : <ChevronLeftIcon className="w-5 h-5" />}
                </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto px-4 space-y-8 scrollbar-hide py-4">
                {/* Main Menu */}
                <div className="space-y-1">
                    {!collapsed && <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 mb-2">Main</p>}
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onFilterChange(item.id)}
                            className={clsx(
                                "w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all",
                                activeFilter === item.id
                                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold"
                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                            )}
                        >
                            <item.icon className="w-5 h-5 shrink-0" />
                            {!collapsed && <span>{item.label}</span>}
                        </button>
                    ))}
                </div>

                {/* Collections */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between px-3 mb-2">
                        {!collapsed && <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Collections</p>}
                        {!collapsed && (
                            <button
                                onClick={() => setShowNewCollectionInput(!showNewCollectionInput)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 dark:text-slate-500"
                            >
                                <PlusIcon className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {showNewCollectionInput && !collapsed && (
                        <div className="px-3 mb-2 animate-in slide-in-from-top-1 duration-200">
                            <input
                                autoFocus
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 dark:text-slate-200"
                                placeholder="New collection..."
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateCollection();
                                    if (e.key === 'Escape') setShowNewCollectionInput(false);
                                }}
                            />
                        </div>
                    )}
                    {collections?.map((col: any) => (
                        <div
                            key={col.id}
                            className={clsx(
                                "group w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all",
                                activeFilter === `collection:${col.id}`
                                    ? "bg-slate-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-medium"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                            )}
                        >
                            <div className="flex items-center space-x-3 flex-1 min-w-0" onClick={() => onFilterChange(`collection:${col.id}`)}>
                                {!collapsed && <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />}
                                {!collapsed ? (
                                    editingCollectionId === col.id ? (
                                        <input
                                            autoFocus
                                            className="w-full bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded px-1 outline-none font-normal dark:text-slate-200"
                                            value={editingCollectionName}
                                            onChange={(e) => setEditingCollectionName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleRenameCollection(col.id);
                                                if (e.key === 'Escape') setEditingCollectionId(null);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span className="truncate cursor-pointer">{col.name}</span>
                                    )
                                ) : (
                                    <BookmarkIcon className="w-5 h-5 mx-auto cursor-pointer" />
                                )}
                            </div>

                            {!collapsed && editingCollectionId !== col.id && (
                                <div className="hidden group-hover:flex items-center space-x-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingCollectionId(col.id);
                                            setEditingCollectionName(col.name);
                                        }}
                                        className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-400 dark:text-slate-500 hover:text-blue-500 transition-colors"
                                    >
                                        <PencilIcon className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteCollection(col.id);
                                        }}
                                        className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-400 dark:text-slate-500 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2Icon className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Popular Tags */}
                {!collapsed && (
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 mb-2">Tags</p>
                        <div className="flex flex-wrap gap-2 px-3">
                            {tags?.slice(0, 10).map((tag: any) => (
                                <button
                                    key={tag.id}
                                    onClick={() => onFilterChange(`tag:${tag.name}`)}
                                    className={clsx(
                                        "px-2 py-1 rounded-md text-xs font-medium transition-all",
                                        activeFilter === `tag:${tag.name}`
                                            ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    )}
                                >
                                    {tag.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Logout / User Info */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                {!collapsed ? (
                    <div className="flex items-center space-x-3 p-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">Admin</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Librarian</p>
                        </div>
                    </div>
                ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 mx-auto" />
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
