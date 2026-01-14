import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Sidebar from './components/Sidebar';
import LibraryGrid from './components/LibraryGrid';
import BookDetailPanel from './components/BookDetailPanel';
import Reader from './components/Reader';
import ImportModal from './components/ImportModal';
import EditMetadataModal from './components/EditMetadataModal';
import UserSettingsModal from './components/UserSettingsModal';
import UserManagementModal from './components/UserManagementModal';
import TagManagementModal from './components/TagManagementModal';
import DuplicatesModal from './components/DuplicatesModal';
import Topbar from './components/Topbar';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import TagSearch from './components/TagSearch';
import AIProviderModal from './components/AIProviderModal';
import AISummaryModal from './components/AISummaryModal';
import AITagModal from './components/AITagModal';
import api from './api';
import { useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';
import type { Book, SortingState, Tag } from './types';
import './index.css';

function App() {
  const { user, isLoading: authLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false); // Mobile drawer state
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [selectedBookIds, setSelectedBookIds] = useState<number[]>([]);
  const [readerBookId, setReaderBookId] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editBookId, setEditBookId] = useState<number | null>(null);
  const [sorting, setSorting] = useState<SortingState[]>([]);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showTagManagement, setShowTagManagement] = useState(false);
  
  // AI Modal States
  const [showAIProviderModal, setShowAIProviderModal] = useState(false);
  const [showAISummaryModal, setShowAISummaryModal] = useState(false);
  const [showAITagModal, setShowAITagModal] = useState(false);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Initialize theme on mount
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const limit = 100;

  const { data: books, isLoading, error, refetch } = useQuery({
    queryKey: ['books', searchTerm, activeFilter, page, sorting],
    enabled: !!user,
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = {
        skip: page * limit,
        limit,
      };

      // Add search term if present (works with all filters)
      if (searchTerm) {
        params.search = searchTerm;
      }

      // Apply filter-specific parameters
      if (activeFilter.startsWith('tag:') && !activeFilter.includes('"')) {
        params.tag = activeFilter.split(':')[1];
      } else if (activeFilter.startsWith('author:') && !activeFilter.includes('"')) {
        params.author = activeFilter.split(':')[1];
      } else if (activeFilter.startsWith('publisher:') && !activeFilter.includes('"')) {
        params.publisher = activeFilter.split(':')[1];
      } else if (activeFilter.startsWith('collection:')) {
        params.collection_id = Number(activeFilter.split(':')[1]);
      } else if (activeFilter === 'recent') {
        params.sort_by = 'recent';
      } else if (activeFilter === 'recently_read') {
        params.sort_by = 'last_read';
        params.sort_order = 'desc';
      }

      if (sorting.length > 0) {
        params.sort_by = sorting[0].id;
        params.sort_order = sorting[0].desc ? 'desc' : 'asc';
      }

      const response = await api.get('/books/', { params });
      return response.data;
    },
  });

  const { data: duplicatesCount, refetch: refetchDuplicatesCount } = useQuery({
    queryKey: ['duplicates-count'],
    enabled: !!user,
    queryFn: async () => {
      const res = await api.get('/duplicates/');
      return res.data.length;
    }
  });

  const handleDeleteBooks = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} book(s)?`)) return;
    try {
      await api.delete('/books/bulk', { data: ids });
      setSelectedBookIds([]);
      refetch();
    } catch (err) {
      console.error("Failed to delete books", err);
    }
  };

  const handleAddToCollection = async (ids: number[]) => {
    const colId = prompt("Enter Collection ID (for now):");
    if (!colId) return;
    try {
      // Get current collection and add new books
      const colRes = await api.get(`/collections/${colId}`);
      const currentBookIds = colRes.data.books.map((b: Book) => b.id);
      const newBookIds = Array.from(new Set([...currentBookIds, ...ids]));
      await api.patch(`/collections/${colId}`, { book_ids: newBookIds });
      alert("Books added to collection");
      refetch();
    } catch (err) {
      console.error("Failed to add to collection", err);
    }
  };

  const handleWordCount = async (ids: number[]) => {
    try {
      const res = await api.post('/utilities/word-count', ids);
      alert(res.data.message);
      if (res.data.updated_count > 0) {
        refetch();
      }
    } catch (err) {
      console.error("Failed to count words", err);
      alert("Failed to update word counts");
    }
  };

  // Render appropriate content based on auth state
  // CRITICAL: No early returns - all hooks must be called on every render
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Main authenticated app JSX
  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden dark:bg-slate-900">
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        activeFilter={activeFilter}
        onFilterChange={(filter: string) => {
          // Handle special filters
          if (filter === 'all') {
            setActiveFilter('all');
            setSearchTerm('');
          } else if (filter === 'recent') {
            setActiveFilter('recent');
            setSearchTerm('');
          } else if (filter === 'recently_read') {
            setActiveFilter('recently_read');
            setSearchTerm('');
          } else if (filter.startsWith('collection:')) {
            setActiveFilter(filter);
            setSearchTerm('');
          } else {
            // For tag, author, publisher filters from sidebar, convert to search query
            // Sidebar sends: tags:"=Value", authors:"=Value", publishers:"=Value"
            let searchQuery = '';
            
            if (filter.startsWith('tags:"=')) {
              // Extract tag name from tags:"=TagName"
              const tagName = filter.match(/tags:"=(.+?)"/)?.[1];
              searchQuery = tagName || filter;
            } else if (filter.startsWith('authors:"=')) {
              // Extract author name from authors:"=Author Name"  
              const authorName = filter.match(/authors:"=(.+?)"/)?.[1];
              searchQuery = authorName || filter;
            } else if (filter.startsWith('publishers:"=')) {
              // Extract publisher name from publishers:"=Publisher Name"
              const publisherName = filter.match(/publishers:"=(.+?)"/)?.[1];
              searchQuery = publisherName || filter;
            } else {
              // Fallback for any other format
              searchQuery = filter;
            }
            
            setSearchTerm(searchQuery);
            setActiveFilter('search');
          }
          setPage(0);
        }}
        mobileOpen={mobileDrawerOpen}
        onMobileClose={() => setMobileDrawerOpen(false)}
      />

      <main className="relative flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-colors duration-200">
        <Topbar
          selectedBookIds={selectedBookIds}
          onAddBooks={() => setShowImportModal(true)}
          onEditBook={(id) => setEditBookId(id)}
          onDownloadBooks={(ids) => {
            ids.forEach(id => {
              window.open(`${api.defaults.baseURL}/books/${id}/file`, '_blank');
            });
          }}
          onDeleteBooks={handleDeleteBooks}
          onAddToCollection={handleAddToCollection}
          onRead={(id) => setReaderBookId(id)}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          onOpenSettings={() => setShowUserSettings(true)}
          onOpenUserManagement={() => setShowUserManagement(true)}
          onOpenTagManagement={() => setShowTagManagement(true)}
          onWordCount={handleWordCount}
          onToggleSidebar={() => setMobileDrawerOpen(!mobileDrawerOpen)}
          
          // AI Handlers
          onOpenAIProvider={() => setShowAIProviderModal(true)}
          onOpenAISummary={() => setShowAISummaryModal(true)}
          onOpenAITags={() => setShowAITagModal(true)}
          duplicatesCount={duplicatesCount || 0}
          onOpenDuplicates={() => setShowDuplicatesModal(true)}
        />
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex items-center justify-between px-6 shrink-0 shadow-sm z-10 transition-colors duration-200">
          <div className="flex-1 max-w-2xl">
            <TagSearch
              value={searchTerm}
              onChange={setSearchTerm}
              onSearch={(query) => {
                setSearchTerm(query);
                setActiveFilter('search');
                setPage(0);
              }}
            />
          </div>

          <div className="flex items-center space-x-3 ml-4">
            <button
              onClick={() => refetch()}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Refresh library"
            >
              <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-950/50 transition-colors duration-200">
          {error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-slate-600 font-medium">Failed to load books</p>
                <button
                  onClick={() => refetch()}
                  className="mt-2 text-blue-600 hover:underline text-sm font-medium"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : (
            <>
              <LibraryGrid
                data={books?.items || []}
                isLoading={isLoading}
                selectedBookId={selectedBookIds.length === 1 ? selectedBookIds[0] : null}
                onRowClick={(book) => setSelectedBookIds([book.id])}
                onSelectionChange={setSelectedBookIds}
                sorting={sorting}
                onSortingChange={setSorting}
              />

              {/* Pagination */}
              <div className="p-4 bg-white dark:bg-slate-900 border-t dark:border-slate-800 flex items-center justify-between shadow-sm transition-colors duration-200">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Showing <span className="font-medium text-slate-900 dark:text-slate-100">{books?.items?.length || 0}</span> of <span className="font-medium text-slate-900 dark:text-slate-100">{books?.total || 0}</span> books
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0 || isLoading}
                    className="px-3 py-1.5 border dark:border-slate-700 rounded text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors dark:text-slate-200"
                  >
                    Previous
                  </button>
                  <span className="text-sm px-2 text-slate-600 dark:text-slate-400">Page {page + 1} of {Math.ceil((books?.total || 0) / limit) || 1}</span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page + 1) * limit >= (books?.total || 0) || isLoading}
                    className="px-3 py-1.5 border dark:border-slate-700 rounded text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors dark:text-slate-200"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <BookDetailPanel
          bookId={selectedBookIds.length === 1 ? selectedBookIds[0] : null}
          onClose={() => setSelectedBookIds([])}
          onUpdate={() => refetch()}
          onRead={(id) => setReaderBookId(id)}
        />
      </main>

      {readerBookId && (
        <Reader
          bookId={readerBookId}
          onClose={() => {
            setReaderBookId(null);
            refetch();
          }}
        />
      )}

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => refetch()}
      />

      <EditMetadataModal
        isOpen={!!editBookId}
        bookId={editBookId}
        onClose={() => setEditBookId(null)}
        onSuccess={() => refetch()}
      />

      <UserSettingsModal
        isOpen={showUserSettings}
        onClose={() => setShowUserSettings(false)}
      />

      {user?.is_admin && (
        <UserManagementModal
          isOpen={showUserManagement}
          onClose={() => setShowUserManagement(false)}
        />
      )}

      {user?.is_admin && (
        <TagManagementModal
          isOpen={showTagManagement}
          onClose={() => setShowTagManagement(false)}
          onUpdate={() => refetch()}
        />
      )}

      {/* AI Modals */}
      <AIProviderModal
        isOpen={showAIProviderModal}
        onClose={() => setShowAIProviderModal(false)}
      />

      <AISummaryModal
        isOpen={showAISummaryModal}
        onClose={() => setShowAISummaryModal(false)}
        bookId={selectedBookIds.length === 1 ? selectedBookIds[0] : null}
        bookTitle={books?.items?.find((b: Book) => b.id === selectedBookIds[0])?.title || ''}
        currentSummary={books?.items?.find((b: Book) => b.id === selectedBookIds[0])?.description || ''}
        onSuccess={() => refetch()}
      />

      <AITagModal
        isOpen={showAITagModal}
        onClose={() => setShowAITagModal(false)}
        bookId={selectedBookIds.length === 1 ? selectedBookIds[0] : null}
        bookTitle={books?.items?.find((b: Book) => b.id === selectedBookIds[0])?.title || ''}
        currentTags={books?.items?.find((b: Book) => b.id === selectedBookIds[0])?.tags?.map((t: Tag) => t.name) || []}
        onSuccess={() => refetch()}
      />

      <DuplicatesModal
        isOpen={showDuplicatesModal}
        onClose={() => setShowDuplicatesModal(false)}
        onSuccess={() => {
          refetch();
          refetchDuplicatesCount();
        }}
      />
    </div>
  );
}

export default App;
