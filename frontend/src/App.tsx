import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Sidebar from './components/Sidebar';
import LibraryGrid from './components/LibraryGrid';
import BookDetailPanel from './components/BookDetailPanel';
import Reader from './components/Reader';
import ImportModal from './components/ImportModal';
import { MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import api from './api';
import { useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';
import './index.css';

function App() {
  const { user, isLoading: authLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [readerBookId, setReaderBookId] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const limit = 100;

  const { data: books, isLoading, error, refetch } = useQuery({
    queryKey: ['books', searchTerm, activeFilter, page],
    enabled: !!user,
    queryFn: async () => {
      const params: any = {
        skip: page * limit,
        limit,
        search: searchTerm || undefined,
      };

      if (activeFilter.startsWith('tag:')) {
        params.tag = activeFilter.split(':')[1];
      } else if (activeFilter.startsWith('collection:')) {
        params.collection_id = Number(activeFilter.split(':')[1]);
      } else if (activeFilter === 'recent') {
        params.sort_by = 'recent';
      }

      const response = await api.get('/books/', { params });
      return response.data;
    },
  });

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        activeFilter={activeFilter}
        onFilterChange={(filter: string) => {
          setActiveFilter(filter);
          setPage(0);
        }}
      />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
          <div className="flex-1 max-w-2xl relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search library..."
              className="w-full bg-slate-100 border-none rounded-full py-2 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => refetch()}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh library"
            >
              <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm"
            >
              Import Books
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
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
                selectedBookId={selectedBookId}
                onRowClick={(book) => setSelectedBookId(book.id)}
              />

              {/* Pagination */}
              <div className="p-4 bg-white border-t flex items-center justify-between shadow-sm">
                <div className="text-sm text-slate-500">
                  Showing <span className="font-medium text-slate-900">{books?.items?.length || 0}</span> of <span className="font-medium text-slate-900">{books?.total || 0}</span> books
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0 || isLoading}
                    className="px-3 py-1.5 border rounded text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm px-2 text-slate-600">Page {page + 1} of {Math.ceil((books?.total || 0) / limit) || 1}</span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page + 1) * limit >= (books?.total || 0) || isLoading}
                    className="px-3 py-1.5 border rounded text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <BookDetailPanel
        bookId={selectedBookId}
        onClose={() => setSelectedBookId(null)}
        onUpdate={() => refetch()}
        onRead={(id) => setReaderBookId(id)}
      />

      {readerBookId && (
        <Reader
          bookId={readerBookId}
          onClose={() => setReaderBookId(null)}
        />
      )}

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

export default App;
