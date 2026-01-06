import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Bookmark as BookmarkIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    ChevronDown as ChevronDownIcon,
    ChevronUp as ChevronUpIcon,
    Plus as PlusIcon,
    Pencil as PencilIcon,
    Trash2 as Trash2Icon,
    Clock as ClockIcon,
    BookOpen as BookOpenIcon
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
    const [collectionsCollapsed, setCollectionsCollapsed] = React.useState(() => localStorage.getItem('sidebar_collections_collapsed') === 'true');
    const [authorsCollapsed, setAuthorsCollapsed] = React.useState(() => localStorage.getItem('sidebar_authors_collapsed') === 'true');
    const [publishersCollapsed, setPublishersCollapsed] = React.useState(() => localStorage.getItem('sidebar_publishers_collapsed') === 'true');
    const [tagsCollapsed, setTagsCollapsed] = React.useState(() => localStorage.getItem('sidebar_tags_collapsed') === 'true');
    const [isScanning, setIsScanning] = React.useState(false);

    React.useEffect(() => {
        localStorage.setItem('sidebar_collections_collapsed', String(collectionsCollapsed));
        localStorage.setItem('sidebar_authors_collapsed', String(authorsCollapsed));
        localStorage.setItem('sidebar_publishers_collapsed', String(publishersCollapsed));
        localStorage.setItem('sidebar_tags_collapsed', String(tagsCollapsed));
    }, [collectionsCollapsed, authorsCollapsed, publishersCollapsed, tagsCollapsed]);

    const { data: tags } = useQuery({
        queryKey: ['tags'],
        queryFn: async () => {
            const res = await api.get('/books/tags');
            return res.data;
        }
    });

    const { data: authors } = useQuery({
        queryKey: ['authors'],
        queryFn: async () => {
            const res = await api.get('/books/authors');
            return res.data;
        }
    });

    const { data: publishers } = useQuery({
        queryKey: ['publishers'],
        queryFn: async () => {
            const res = await api.get('/books/publishers');
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
        { id: 'all', label: 'All Books', icon: BookOpenIcon },
        { id: 'recent', label: 'Recently Added', icon: BookmarkIcon },
        { id: 'recently_read', label: 'Recently Read', icon: ClockIcon },
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
                    <div
                        className="flex items-center justify-between px-3 mb-2 cursor-pointer group"
                        onClick={() => !collapsed && setCollectionsCollapsed(!collectionsCollapsed)}
                    >
                        {!collapsed && (
                            <div className="flex items-center space-x-2">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Collections</p>
                                {collectionsCollapsed ? <ChevronDownIcon className="w-3 h-3 text-slate-400" /> : <ChevronUpIcon className="w-3 h-3 text-slate-400" />}
                            </div>
                        )}
                        {!collapsed && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowNewCollectionInput(!showNewCollectionInput);
                                }}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <PlusIcon className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {!collectionsCollapsed && (
                        <>
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
                        </>
                    )}
                </div>

                {/* Authors */}
                {!collapsed && (
                    <div className="space-y-1">
                        <div
                            className="flex items-center space-x-2 px-3 mb-2 cursor-pointer"
                            onClick={() => setAuthorsCollapsed(!authorsCollapsed)}
                        >
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Authors</p>
                            {authorsCollapsed ? <ChevronDownIcon className="w-3 h-3 text-slate-400" /> : <ChevronUpIcon className="w-3 h-3 text-slate-400" />}
                        </div>
                        {!authorsCollapsed && (
                            <div className="flex flex-col space-y-1 px-3">
                                {authors?.slice(0, 8).map((author: any) => (
                                    <button
                                        key={author.id}
                                        onClick={() => onFilterChange(`authors:"=${author.name}"`)}
                                        className={clsx(
                                            "w-full text-left px-2 py-1 rounded text-xs transition-all truncate",
                                            activeFilter === `authors:"=${author.name}"`
                                                ? "bg-slate-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-medium"
                                                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                        )}
                                    >
                                        {author.name}
                                    </button>
                                ))}
                                {authors?.length > 8 && <p className="text-[10px] text-slate-400 px-2">+{authors.length - 8} more</p>}
                            </div>
                        )}
                    </div>
                )}

                {/* Publishers */}
                {!collapsed && (
                    <div className="space-y-1">
                        <div
                            className="flex items-center space-x-2 px-3 mb-2 cursor-pointer"
                            onClick={() => setPublishersCollapsed(!publishersCollapsed)}
                        >
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Publishers</p>
                            {publishersCollapsed ? <ChevronDownIcon className="w-3 h-3 text-slate-400" /> : <ChevronUpIcon className="w-3 h-3 text-slate-400" />}
                        </div>
                        {!publishersCollapsed && (
                            <div className="flex flex-col space-y-1 px-3">
                                {publishers?.slice(0, 8).map((pub: string) => (
                                    <button
                                        key={pub}
                                        onClick={() => onFilterChange(`publishers:"=${pub}"`)}
                                        className={clsx(
                                            "w-full text-left px-2 py-1 rounded text-xs transition-all truncate",
                                            activeFilter === `publishers:"=${pub}"`
                                                ? "bg-slate-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-medium"
                                                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                        )}
                                    >
                                        {pub}
                                    </button>
                                ))}
                                {publishers?.length > 8 && <p className="text-[10px] text-slate-400 px-2">+{publishers.length - 8} more</p>}
                            </div>
                        )}
                    </div>
                )}

                {/* Popular Tags */}
                {!collapsed && (
                    <div className="space-y-1">
                        <div
                            className="flex items-center space-x-2 px-3 mb-2 cursor-pointer"
                            onClick={() => setTagsCollapsed(!tagsCollapsed)}
                        >
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tags</p>
                            {tagsCollapsed ? <ChevronDownIcon className="w-3 h-3 text-slate-400" /> : <ChevronUpIcon className="w-3 h-3 text-slate-400" />}
                        </div>
                        {!tagsCollapsed && (
                            <div className="flex flex-wrap gap-2 px-3">
                                {tags?.slice(0, 10).map((tag: any) => (
                                    <button
                                        key={tag.id}
                                        onClick={() => onFilterChange(`tags:"=${tag.name}"`)}
                                        className={clsx(
                                            "px-2 py-1 rounded-md text-xs font-medium transition-all",
                                            activeFilter === `tags:"=${tag.name}"`
                                                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                        )}
                                    >
                                        {tag.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Admin Tools & User Info */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-4">
                {!collapsed && (
                    <button
                        onClick={async () => {
                            setIsScanning(true);
                            try {
                                await api.post('/books/scan');
                                alert("Library scan started");
                            } catch (e) {
                                console.error(e);
                            } finally {
                                setIsScanning(false);
                            }
                        }}
                        disabled={isScanning}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        <PlusIcon className={clsx("w-4 h-4", isScanning && "animate-spin")} />
                        <span>{isScanning ? "Scanning..." : "Scan Library"}</span>
                    </button>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
